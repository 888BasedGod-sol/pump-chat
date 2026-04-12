import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { SOLANA_RPC_URL } from "@/lib/solana";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TokenResult {
  address: string;
  name: string;
  symbol: string;
  image: string;
  realSolReserves: number;
  tokenTotalSupply: string;
  complete: boolean;
  marketCapSol: number;
  progressPercent: number;
  // DexScreener-enriched fields
  priceUsd: number | null;
  priceChange24h: number | null;
  volume24h: number | null;
  liquidity: number | null;
  fdv: number | null;
  pairUrl: string | null;
  txns24h: { buys: number; sells: number } | null;
  createdAt: number | null; // pair creation timestamp (ms)
}

// Server-side cache to avoid hammering RPC
let cachedTokens: TokenResult[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 15_000; // cache for 15s

/* ------------------------------------------------------------------ */
/*  DexScreener batch fetch                                            */
/* ------------------------------------------------------------------ */

async function fetchDexScreenerData(mints: string[]): Promise<Map<string, {
  priceUsd: number;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  fdv: number;
  pairUrl: string;
  txns24h: { buys: number; sells: number };
  createdAt: number;
  marketCapUsd: number;
}>> {
  const result = new Map<string, {
    priceUsd: number;
    priceChange24h: number;
    volume24h: number;
    liquidity: number;
    fdv: number;
    pairUrl: string;
    txns24h: { buys: number; sells: number };
    createdAt: number;
    marketCapUsd: number;
  }>();

  if (mints.length === 0) return result;

  // DexScreener supports up to 30 addresses per request
  const chunks: string[][] = [];
  for (let i = 0; i < mints.length; i += 30) {
    chunks.push(mints.slice(i, i + 30));
  }

  await Promise.allSettled(
    chunks.map(async (chunk) => {
      const url = `https://api.dexscreener.com/tokens/v1/solana/${chunk.join(",")}`;
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return;
      const data = await res.json();
      // Response is an array of pairs — pick the highest-liquidity pair per token
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
          marketCapUsd: pair.marketCap ?? 0,
        });
      }
    })
  );

  return result;
}

/* ------------------------------------------------------------------ */
/*  GET /api/tokens                                                    */
/* ------------------------------------------------------------------ */

export async function GET() {
  try {
    // Return cached data if still fresh
    const now = Date.now();
    if (cachedTokens && now - cacheTimestamp < CACHE_TTL_MS) {
      return NextResponse.json({ tokens: cachedTokens, count: cachedTokens.length, cached: true });
    }

    const PUMP_PROGRAM = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";

    // Step 1: Get recent transaction signatures for the Pump program
    const sigRes = await fetch(SOLANA_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getSignaturesForAddress",
        params: [PUMP_PROGRAM, { limit: 100, commitment: "confirmed" }],
      }),
    });
    const sigData = await sigRes.json();
    const signatures = (sigData.result || [])
      .filter((s: { err: unknown }) => !s.err)
      .map((s: { signature: string }) => s.signature)
      .slice(0, 40);

    if (signatures.length === 0) {
      return NextResponse.json({ tokens: [], count: 0 });
    }

    // Step 2: Fetch transaction details to extract token mints
    const txRes = await fetch(SOLANA_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "getTransactions",
        params: [signatures, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }],
      }),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let transactions: Array<any> = [];
    const txData = await txRes.json();

    if (txData.result) {
      transactions = txData.result;
    } else {
      const batchSigs = signatures.slice(0, 20);
      const batchBodies = batchSigs.map((sig: string, i: number) => ({
        jsonrpc: "2.0",
        id: i,
        method: "getTransaction",
        params: [sig, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }],
      }));

      const batchRes = await fetch(SOLANA_RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batchBodies),
      });
      const batchData = await batchRes.json();
      transactions = (Array.isArray(batchData) ? batchData : [batchData])
        .map((r: { result: unknown }) => r.result)
        .filter(Boolean);
    }

    // Step 3: Extract unique token mints from post-token balances
    const seenMints = new Set<string>();
    const tokens: TokenResult[] = [];

    for (const tx of transactions) {
      if (!tx?.meta?.postTokenBalances) continue;
      for (const bal of tx.meta.postTokenBalances) {
        const mint = bal.mint;
        if (!mint || seenMints.has(mint)) continue;
        if (mint === "So11111111111111111111111111111111111111112") continue;
        seenMints.add(mint);

        const uiAmount = bal.uiTokenAmount?.uiAmount ?? 0;

        tokens.push({
          address: mint,
          name: "",
          symbol: "",
          image: "",
          realSolReserves: 0,
          tokenTotalSupply: uiAmount > 0 ? uiAmount.toLocaleString() : "unknown",
          complete: false,
          marketCapSol: 0,
          progressPercent: 0,
          priceUsd: null,
          priceChange24h: null,
          volume24h: null,
          liquidity: null,
          fdv: null,
          pairUrl: null,
          txns24h: null,
          createdAt: null,
        });
      }
    }

    // Step 3b: Fetch token metadata via Helius DAS getAssetBatch
    // Step 3c: Fetch DexScreener market data
    // Step 4: Fetch bonding curve data
    // Run all three in parallel
    const allMints = tokens.map((t) => t.address);
    const PUMP_PROGRAM_KEY = new PublicKey(PUMP_PROGRAM);
    const connection = new Connection(SOLANA_RPC_URL, "confirmed");
    const GRADUATION_SOL = 85;

    const [, dexData] = await Promise.all([
      // Helius metadata
      (async () => {
        if (tokens.length === 0) return;
        try {
          const assetRes = await fetch(SOLANA_RPC_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: "asset-batch",
              method: "getAssetBatch",
              params: { ids: allMints },
            }),
          });
          const assetData = await assetRes.json();
          if (Array.isArray(assetData?.result)) {
            for (const asset of assetData.result) {
              if (!asset?.id) continue;
              const token = tokens.find((t) => t.address === asset.id);
              if (!token) continue;
              token.name = asset.content?.metadata?.name || "";
              token.symbol = asset.content?.metadata?.symbol || "";
              token.image =
                asset.content?.links?.image ||
                asset.content?.files?.[0]?.uri ||
                "";
            }
          }
        } catch {
          // Metadata fetch failed — tokens still have address-based fallback
        }
      })(),

      // DexScreener data
      fetchDexScreenerData(allMints),

      // Bonding curve data — fetch for all tokens now (was limited to 10)
      Promise.allSettled(
        tokens.slice(0, 30).map(async (token) => {
          try {
            const mintKey = new PublicKey(token.address);
            const [bondingCurvePda] = PublicKey.findProgramAddressSync(
              [Buffer.from("bonding-curve"), mintKey.toBuffer()],
              PUMP_PROGRAM_KEY
            );
            const accountInfo = await connection.getAccountInfo(bondingCurvePda);
            if (accountInfo) {
              const solBalance = accountInfo.lamports / 1e9;
              token.realSolReserves = Math.round(solBalance * 100) / 100;
              token.progressPercent = Math.min(Math.round((solBalance / GRADUATION_SOL) * 100), 100);
              token.complete = token.progressPercent >= 100;
              token.marketCapSol = Math.round(solBalance * 10) / 10;
            }
          } catch {
            // Not a pump.fun token or bonding curve not found
          }
        })
      ),
    ]);

    // Merge DexScreener data into tokens
    for (const token of tokens) {
      const dex = dexData.get(token.address);
      if (!dex) continue;
      token.priceUsd = dex.priceUsd;
      token.priceChange24h = dex.priceChange24h;
      token.volume24h = dex.volume24h;
      token.liquidity = dex.liquidity;
      token.fdv = dex.fdv;
      token.pairUrl = dex.pairUrl;
      token.txns24h = dex.txns24h;
      token.createdAt = dex.createdAt;
    }

    const result = tokens.slice(0, 30);

    // Update cache
    cachedTokens = result;
    cacheTimestamp = Date.now();

    return NextResponse.json({ tokens: result, count: result.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to fetch tokens:", message);
    return NextResponse.json(
      { error: "Failed to fetch tokens", detail: message },
      { status: 500 }
    );
  }
}
