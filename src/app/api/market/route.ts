import { NextRequest, NextResponse } from "next/server";
import { SOLANA_RPC_URL } from "@/lib/solana";

export const dynamic = "force-dynamic";

// Cache DexScreener results server-side
let cachedData: Map<string, Record<string, unknown>> | null = null;
let cacheTimestamp = 0;
let cachedMintSet = "";
const CACHE_TTL_MS = 30_000; // 30s cache

/* ---- Fetch holder counts via Helius getTokenAccounts ---- */
async function fetchHolderCounts(mints: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  // Batch JSON-RPC calls in groups of 20
  for (let i = 0; i < mints.length; i += 20) {
    const batch = mints.slice(i, i + 20);
    const bodies = batch.map((mint, idx) => ({
      jsonrpc: "2.0",
      id: `holders-${idx}`,
      method: "getTokenAccounts",
      params: { mint, limit: 1, page: 1 },
    }));
    try {
      const res = await fetch(SOLANA_RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodies),
        signal: AbortSignal.timeout(8000),
      });
      const data = await res.json();
      const responses = Array.isArray(data) ? data : [data];
      for (const r of responses) {
        if (!r?.result) continue;
        const total = r.result.total ?? r.result.token_accounts?.length ?? 0;
        // Match back to mint — id format is "holders-{idx}"
        const idx = parseInt(String(r.id).replace("holders-", ""), 10);
        if (!isNaN(idx) && batch[idx]) {
          result.set(batch[idx], total);
        }
      }
    } catch {
      // holder fetch failed for this batch — non-critical
    }
  }
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const mints: string[] = Array.isArray(body.mints) ? body.mints.slice(0, 100) : [];

    if (mints.length === 0) {
      return NextResponse.json({ data: {} });
    }

    // Check cache — reuse if same mint set and fresh
    const mintKey = mints.sort().join(",");
    const now = Date.now();
    if (cachedData && cachedMintSet === mintKey && now - cacheTimestamp < CACHE_TTL_MS) {
      return NextResponse.json({ data: Object.fromEntries(cachedData), cached: true }, {
        headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
      });
    }

    const result = new Map<string, Record<string, unknown>>();

    // DexScreener supports up to 30 addresses per request
    const chunks: string[][] = [];
    for (let i = 0; i < mints.length; i += 30) {
      chunks.push(mints.slice(i, i + 30));
    }

    // Fetch DexScreener + holder counts in parallel
    const [, holderCounts] = await Promise.all([
      // DexScreener data
      Promise.allSettled(
        chunks.map(async (chunk) => {
          const url = `https://api.dexscreener.com/tokens/v1/solana/${chunk.join(",")}`;
          const res = await fetch(url, {
            headers: { Accept: "application/json" },
            signal: AbortSignal.timeout(8000),
          });
          if (!res.ok) return;
          const data = await res.json();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pairs: any[] = Array.isArray(data) ? data : (data.pairs || []);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const bestByMint = new Map<string, any>();
          for (const pair of pairs) {
            const mint = pair.baseToken?.address;
            if (!mint) continue;
            const existing = bestByMint.get(mint);
            if (!existing || (pair.liquidity?.usd ?? 0) > (existing.liquidity?.usd ?? 0)) {
              bestByMint.set(mint, pair);
            }
          }
          for (const [mint, pair] of bestByMint) {
            result.set(mint, {
              priceUsd: parseFloat(pair.priceUsd) || 0,
              priceChange24h: pair.priceChange?.h24 ?? 0,
              volume24h: pair.volume?.h24 ?? 0,
              liquidity: pair.liquidity?.usd ?? 0,
              fdv: pair.fdv ?? 0,
              pairUrl: pair.url || "",
              txns24h: {
                buys: pair.txns?.h24?.buys ?? 0,
                sells: pair.txns?.h24?.sells ?? 0,
              },
              createdAt: pair.pairCreatedAt ?? 0,
              image: pair.info?.imageUrl || "",
            });
          }
        })
      ),
      // Holder counts via Helius
      fetchHolderCounts(mints),
    ]);

    // Merge holder counts into results
    for (const [mint, count] of holderCounts) {
      const existing = result.get(mint);
      if (existing) {
        existing.holders = count;
      } else {
        result.set(mint, { holders: count });
      }
    }

    cachedData = result;
    cacheTimestamp = now;
    cachedMintSet = mintKey;

    return NextResponse.json({ data: Object.fromEntries(result) }, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
