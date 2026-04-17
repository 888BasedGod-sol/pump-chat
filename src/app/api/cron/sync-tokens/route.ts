import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { communities } from "@/lib/schema";
import { eq, or, inArray } from "drizzle-orm";
import { SOLANA_RPC_URL } from "@/lib/solana";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60s for this cron job

// Vercel cron secret for authentication
const CRON_SECRET = process.env.CRON_SECRET;

interface PumpToken {
  mint: string;
  name: string;
  symbol: string;
  image_uri?: string;
  metadata_uri?: string;
  complete?: boolean;
  market_cap?: number;
}

/**
 * GET /api/cron/sync-tokens
 * Vercel Cron job that pre-fetches trending pump.fun tokens
 * Runs every 5 minutes to keep the database populated with recent tokens
 */
export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sends this header)
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {
    fetched: 0,
    created: 0,
    updated: 0,
    errors: [] as string[],
  };

  try {
    // Fetch multiple sources of tokens
    const tokenSources = await Promise.allSettled([
      fetchPumpFunKingOfTheHill(),
      fetchPumpFunRecent(),
      fetchPumpFunGraduated(),
    ]);

    const allTokens: PumpToken[] = [];
    for (const result of tokenSources) {
      if (result.status === "fulfilled" && Array.isArray(result.value)) {
        allTokens.push(...result.value);
      } else if (result.status === "rejected") {
        results.errors.push(String(result.reason));
      }
    }

    // Dedupe by mint
    const uniqueTokens = new Map<string, PumpToken>();
    for (const token of allTokens) {
      if (token.mint && !uniqueTokens.has(token.mint)) {
        uniqueTokens.set(token.mint, token);
      }
    }

    results.fetched = uniqueTokens.size;

    if (uniqueTokens.size === 0) {
      return NextResponse.json({ ...results, message: "No tokens found" });
    }

    // Check which tokens already exist
    const mints = Array.from(uniqueTokens.keys());
    const existing = await db
      .select({ mint: communities.mint, ticker: communities.ticker })
      .from(communities)
      .where(inArray(communities.mint, mints))
      .all();

    const existingMints = new Set(existing.map((e) => e.mint));
    const existingTickers = new Set(existing.map((e) => e.ticker));

    // Process new tokens
    for (const [mint, token] of uniqueTokens) {
      if (existingMints.has(mint)) {
        continue; // Already in DB
      }

      try {
        // Generate ticker
        let ticker = (token.symbol || token.name || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
        if (!ticker) {
          ticker = mint.slice(0, 6).toUpperCase();
        }

        // Ensure ticker is unique
        let finalTicker = ticker;
        let suffix = 1;
        while (existingTickers.has(finalTicker)) {
          finalTicker = `${ticker}${suffix}`;
          suffix++;
        }

        // Optimize image URL
        let image = token.image_uri || "";
        if (image.includes("ipfs.io/ipfs/")) {
          image = image.replace("https://ipfs.io/ipfs/", "https://cloudflare-ipfs.com/ipfs/");
        }

        // Insert the community
        await db
          .insert(communities)
          .values({
            ticker: finalTicker,
            name: token.name || finalTicker,
            mint,
            image: image || null,
            members: 0,
            complete: token.complete ?? false,
            marketCapSol: token.market_cap ? Math.round(token.market_cap) : null,
            createdAt: Date.now(),
          })
          .onConflictDoNothing();

        existingTickers.add(finalTicker);
        results.created++;
      } catch (e) {
        results.errors.push(`Failed to insert ${mint}: ${e}`);
      }
    }

    // Enrich new tokens with DexScreener data (non-blocking)
    if (results.created > 0) {
      enrichWithMarketData(mints.slice(0, 50)).catch(() => {});
    }

    return NextResponse.json({
      ...results,
      message: `Synced ${results.created} new tokens`,
    });
  } catch (error) {
    console.error("Cron sync-tokens failed:", error);
    return NextResponse.json(
      { error: "Sync failed", details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Fetch "King of the Hill" tokens from pump.fun
 */
async function fetchPumpFunKingOfTheHill(): Promise<PumpToken[]> {
  const res = await fetch("https://frontend-api.pump.fun/coins/king-of-the-hill?includeNsfw=false", {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`KOTH fetch failed: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Fetch recent tokens from pump.fun
 */
async function fetchPumpFunRecent(): Promise<PumpToken[]> {
  const res = await fetch("https://frontend-api.pump.fun/coins?offset=0&limit=50&sort=created_timestamp&order=DESC&includeNsfw=false", {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Recent fetch failed: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Fetch graduated (bonding curve complete) tokens
 */
async function fetchPumpFunGraduated(): Promise<PumpToken[]> {
  const res = await fetch("https://frontend-api.pump.fun/coins?offset=0&limit=50&sort=market_cap&order=DESC&includeNsfw=false&complete=true", {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Graduated fetch failed: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Enrich tokens with DexScreener market data
 */
async function enrichWithMarketData(mints: string[]): Promise<void> {
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mints.join(",")}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return;
    
    const data = await res.json();
    if (!data?.pairs) return;

    // Group by token address, pick highest liquidity pair
    const byToken = new Map<string, { fdv: number; complete: boolean }>();
    for (const pair of data.pairs) {
      const addr = pair.baseToken?.address;
      if (!addr) continue;
      const existing = byToken.get(addr);
      if (!existing || (pair.liquidity?.usd || 0) > existing.fdv) {
        byToken.set(addr, {
          fdv: pair.fdv || 0,
          complete: (pair.liquidity?.usd || 0) > 10000, // Likely graduated if high liquidity
        });
      }
    }

    // Update communities with market data
    for (const [mint, info] of byToken) {
      if (info.fdv > 0) {
        await db
          .update(communities)
          .set({
            marketCapSol: Math.round(info.fdv / 150), // Rough SOL estimate
            complete: info.complete,
          })
          .where(eq(communities.mint, mint));
      }
    }
  } catch {
    // Non-critical, ignore errors
  }
}
