import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { communities } from "@/lib/schema";
import { eq, isNull, or, like } from "drizzle-orm";
import { SOLANA_RPC_URL } from "@/lib/solana";

export const dynamic = "force-dynamic";

/**
 * POST /api/communities/backfill
 * Fetches token metadata (images) from Helius DAS for all communities
 * that have no image stored. Updates the DB in place.
 */
export async function POST() {
  // First: rewrite existing ipfs.io URLs to Cloudflare gateway for reliability
  const ipfsRows = await db
    .select({ ticker: communities.ticker, image: communities.image })
    .from(communities)
    .where(like(communities.image, "%ipfs.io/ipfs/%"))
    .all();

  let rewritten = 0;
  for (const row of ipfsRows) {
    if (!row.image) continue;
    const newUrl = row.image.replace("https://ipfs.io/ipfs/", "https://cloudflare-ipfs.com/ipfs/");
    if (newUrl !== row.image) {
      await db.update(communities).set({ image: newUrl }).where(eq(communities.ticker, row.ticker)).run();
      rewritten++;
    }
  }

  // Find communities with no image
  const missing = await db
    .select({ ticker: communities.ticker, mint: communities.mint })
    .from(communities)
    .where(or(isNull(communities.image), eq(communities.image, "")))
    .all();

  if (missing.length === 0) {
    return NextResponse.json({ updated: 0, rewritten, total: 0, message: "All communities have images" });
  }

  const mints = missing.map((c) => c.mint);
  const mintToTicker = new Map(missing.map((c) => [c.mint, c.ticker]));

  // Batch fetch from Helius DAS getAssetBatch (max 1000 per request)
  let updated = 0;
  const BATCH_SIZE = 100;

  for (let i = 0; i < mints.length; i += BATCH_SIZE) {
    const batch = mints.slice(i, i + BATCH_SIZE);

    try {
      const assetRes = await fetch(SOLANA_RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "backfill",
          method: "getAssetBatch",
          params: { ids: batch },
        }),
        signal: AbortSignal.timeout(15000),
      });
      const assetData = await assetRes.json();

      if (!Array.isArray(assetData?.result)) continue;

      for (const asset of assetData.result) {
        if (!asset?.id) continue;
        let image =
          asset.content?.links?.image ||
          asset.content?.files?.[0]?.uri ||
          "";
        if (!image) continue;

        // Use Cloudflare IPFS gateway for reliability
        if (image.includes("ipfs.io/ipfs/")) {
          image = image.replace("https://ipfs.io/ipfs/", "https://cloudflare-ipfs.com/ipfs/");
        }

        const ticker = mintToTicker.get(asset.id);
        if (!ticker) continue;

        try {
          await db
            .update(communities)
            .set({ image })
            .where(eq(communities.ticker, ticker))
            .run();
          updated++;
        } catch {
          // skip individual update errors
        }
      }
    } catch {
      // batch failed — continue with next batch
    }
  }

  // Second pass: try pump.fun API for any still-missing communities
  const stillMissing = await db
    .select({ ticker: communities.ticker, mint: communities.mint })
    .from(communities)
    .where(or(isNull(communities.image), eq(communities.image, "")))
    .all();

  for (const c of stillMissing) {
    try {
      const res = await fetch(`https://frontend-api-v3.pump.fun/coins/${c.mint}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      let image = data?.image_uri || data?.uri || "";
      if (!image) continue;
      if (image.includes("ipfs.io/ipfs/")) {
        image = image.replace("https://ipfs.io/ipfs/", "https://cloudflare-ipfs.com/ipfs/");
      }
      await db
        .update(communities)
        .set({ image })
        .where(eq(communities.ticker, c.ticker))
        .run();
      updated++;
    } catch {
      // skip
    }
  }

  return NextResponse.json({ updated, total: missing.length });
}
