import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { communities } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { SOLANA_RPC_URL } from "@/lib/solana";

export const dynamic = "force-dynamic";

/**
 * GET /api/communities/lookup?mint=<address>
 * Looks up a token by mint address. If the community already exists, returns it.
 * If not, fetches metadata from Helius DAS and creates it.
 */
export async function GET(request: NextRequest) {
  const mint = request.nextUrl.searchParams.get("mint")?.trim();
  if (!mint || mint.length < 32 || mint.length > 50) {
    return NextResponse.json({ error: "Invalid mint address" }, { status: 400 });
  }

  // Check if community already exists
  const existing = await db
    .select()
    .from(communities)
    .where(eq(communities.mint, mint))
    .get();

  if (existing) {
    return NextResponse.json(existing);
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

    // Check if ticker already exists (different mint, same ticker)
    const tickerExists = await db
      .select()
      .from(communities)
      .where(eq(communities.ticker, ticker))
      .get();

    if (tickerExists) {
      // Update mint if needed and return
      return NextResponse.json(tickerExists);
    }

    // Create the community
    await db
      .insert(communities)
      .values({
        ticker,
        name,
        mint,
        image: optimizedImage || null,
        members: 0,
      })
      .run();

    const created = await db
      .select()
      .from(communities)
      .where(eq(communities.ticker, ticker))
      .get();

    return NextResponse.json(created);
  } catch (err) {
    console.error("Community lookup failed:", err);
    return NextResponse.json({ error: "Failed to look up token" }, { status: 500 });
  }
}
