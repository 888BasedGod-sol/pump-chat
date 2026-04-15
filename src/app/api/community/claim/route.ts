import { NextResponse } from "next/server";
import { verifyPrivyToken, getPrivyUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { communityOwners, communities } from "@/lib/schema";
import { claimOwnershipSchema } from "@/lib/validation";
import { rateLimit, getClientKey } from "@/lib/rateLimit";
import { eq, and } from "drizzle-orm";
import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

// GET: check who owns a community
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker");
  if (!ticker) {
    return NextResponse.json({ error: "ticker param required" }, { status: 400 });
  }

  const owners = await db
    .select()
    .from(communityOwners)
    .where(eq(communityOwners.communityTicker, ticker))
    .all();

  return NextResponse.json(owners, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
  });
}

// POST: claim ownership of a community (requires X auth + wallet with token balance)
export async function POST(request: Request) {
  // Rate limit: 3 claims per minute
  const clientKey = getClientKey(request);
  const rl = rateLimit(`claim:${clientKey}`, 3, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  // Require Privy authentication
  const verified = await verifyPrivyToken(request);
  if (!verified) {
    return NextResponse.json({ error: "Must be signed in with X" }, { status: 401 });
  }
  // Look up user's X account from Privy
  const privyUser = await getPrivyUser(verified.userId);
  const xId = privyUser?.twitter?.subject;
  if (!xId) {
    return NextResponse.json({ error: "X account not linked" }, { status: 401 });
  }

  // Validate body
  const body = await request.json().catch(() => null);
  const parsed = claimOwnershipSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { communityTicker, walletAddress } = parsed.data;

  // Check community exists
  const comm = await db
    .select()
    .from(communities)
    .where(eq(communities.ticker, communityTicker))
    .get();

  if (!comm) {
    return NextResponse.json({ error: "Community not found" }, { status: 404 });
  }

  // Check not already claimed by someone else
  const existing = await db
    .select()
    .from(communityOwners)
    .where(eq(communityOwners.communityTicker, communityTicker))
    .get();

  if (existing && existing.xId !== xId) {
    return NextResponse.json({ error: "Community already claimed by another user" }, { status: 409 });
  }

  // Verify wallet holds the community's token
  try {
    const connection = new Connection(RPC_URL, "confirmed");
    const wallet = new PublicKey(walletAddress);
    const mint = new PublicKey(comm.mint);

    const accounts = await connection.getParsedTokenAccountsByOwner(wallet, {
      programId: TOKEN_PROGRAM_ID,
    });

    const tokenAccount = accounts.value.find(
      (a) => a.account.data.parsed.info.mint === mint.toBase58()
    );

    const balance = tokenAccount
      ? Number(tokenAccount.account.data.parsed.info.tokenAmount.uiAmount)
      : 0;

    if (balance <= 0) {
      return NextResponse.json(
        { error: "Wallet must hold at least some of the community token to claim ownership" },
        { status: 403 }
      );
    }

    // Upsert ownership
    if (existing) {
      // Already owned by this user — update wallet
      await db.update(communityOwners)
        .set({ walletAddress, claimedAt: Date.now() })
        .where(and(
          eq(communityOwners.communityTicker, communityTicker),
          eq(communityOwners.xId, xId)
        ))
        .run();
    } else {
      await db.insert(communityOwners)
        .values({
          communityTicker,
          xId,
          walletAddress,
          claimedAt: Date.now(),
        })
        .run();
    }

    return NextResponse.json({
      success: true,
      owner: { communityTicker, xId, walletAddress, balance },
    });
  } catch (err) {
    console.error("Ownership claim verification failed:", err);
    return NextResponse.json({ error: "Failed to verify token balance" }, { status: 500 });
  }
}
