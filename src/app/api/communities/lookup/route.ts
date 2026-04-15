import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { communities } from "@/lib/schema";
import { eq, or } from "drizzle-orm";
import { SOLANA_RPC_URL } from "@/lib/solana";
import { PublicKey } from "@solana/web3.js";

export const dynamic = "force-dynamic";

/**
 * GET /api/communities/lookup?mint=<address>
 * Looks up a token by mint address. If the community already exists, returns it.
 * If not, fetches metadata from Helius DAS and creates it.
 */
export async function GET(request: NextRequest) {
  const mint = request.nextUrl.searchParams.get("mint")?.trim();
  if (!mint) {
    return NextResponse.json({ error: "Invalid mint address" }, { status: 400 });
  }

  // Validate Solana address format
  try {
    new PublicKey(mint);
  } catch {
    return NextResponse.json({ error: "Invalid mint address" }, { status: 400 });
  }

  // Check if community already exists
  const existing = await db
    .select()
    .from(communities)
    .where(eq(communities.mint, mint))
    .get();

  if (existing) {
    return NextResponse.json(existing, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    });
  }

  // Look up token metadata from Helius DAS
  try {
    const res = await fetch(SOLANA_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "lookup",
        method: "getAsset",
        params: { id: mint },
      }),
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 3600 }, // Cache metadata for 1 hour
    });
    const data = await res.json();
    const asset = data?.result;

    if (!asset?.content?.metadata) {
      return NextResponse.json({ error: "Token not found on-chain" }, { status: 404 });
    }

    const metadata = asset.content.metadata;
    const name = metadata.name || "Unknown";
    const symbol = (metadata.symbol || "").toUpperCase();
    const image =
      asset.content?.links?.image ||
      asset.content?.files?.[0]?.uri ||
      "";

    // Rewrite ipfs.io → Cloudflare for reliability
    const optimizedImage = image.includes("ipfs.io/ipfs/")
      ? image.replace("https://ipfs.io/ipfs/", "https://cloudflare-ipfs.com/ipfs/")
      : image;

    const ticker = symbol || name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);

    if (!ticker) {
      return NextResponse.json({ error: "Could not determine token ticker" }, { status: 404 });
    }

    // Check if mint or ticker already exists (handles race conditions)
    const conflict = await db
      .select()
      .from(communities)
      .where(or(eq(communities.mint, mint), eq(communities.ticker, ticker)))
      .get();

    if (conflict) {
      return NextResponse.json(conflict, {
        headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
      });
    }

    // Create the community with conflict handling for race conditions
    const [created] = await db
      .insert(communities)
      .values({
        ticker,
        name,
        mint,
        image: optimizedImage || null,
        members: 0,
      })
      .onConflictDoNothing()
      .returning();

    // If insert was skipped due to conflict, fetch the existing record
    if (!created) {
      const existing = await db
        .select()
        .from(communities)
        .where(eq(communities.mint, mint))
        .get();
      return NextResponse.json(existing, {
        headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
      });
    }

    return NextResponse.json(created, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      return NextResponse.json({ error: "RPC timeout" }, { status: 504 });
    }
    console.error("Community lookup failed:", err);
    return NextResponse.json({ error: "Failed to look up token" }, { status: 500 });
  }
}