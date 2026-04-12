import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { communities } from "@/lib/schema";
import { communityBulkSchema } from "@/lib/validation";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET — list all communities
export async function GET() {
  const rows = await db.select().from(communities).all();
  return NextResponse.json(rows);
}

// POST — upsert communities (bulk sync from token feed)
export async function POST(request: Request) {
  const body = await request.json();
  const parsed = communityBulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors, inserted: 0 }, { status: 400 });
  }
  const items = parsed.data.communities;

  let inserted = 0;
  for (const item of items) {
    try {
      await db.insert(communities)
        .values({
          ticker: item.ticker,
          name: item.name || `$${item.ticker}`,
          mint: item.mint,
          members: 0,
          active: true,
          createdAt: Date.now(),
          image: item.image || null,
          marketCapSol: item.marketCapSol != null ? Math.round(item.marketCapSol) : null,
          complete: item.complete ?? null,
        })
        .onConflictDoNothing()
        .run();
      inserted++;
    } catch {
      // duplicate — skip
    }
  }

  return NextResponse.json({ inserted });
}

// PATCH — update metadata for existing communities (image, marketCapSol, complete)
export async function PATCH(request: Request) {
  const body = await request.json();
  if (!Array.isArray(body.communities)) {
    return NextResponse.json({ error: "communities array required" }, { status: 400 });
  }

  let updated = 0;
  for (const item of body.communities) {
    if (!item.mint || typeof item.mint !== "string") continue;

    const setFields: Record<string, unknown> = {};
    if (item.image && typeof item.image === "string") setFields.image = item.image;
    if (item.marketCapSol != null) setFields.marketCapSol = Math.round(item.marketCapSol);
    if (item.complete != null) setFields.complete = item.complete;

    if (Object.keys(setFields).length === 0) continue;

    try {
      const result = await db
        .update(communities)
        .set(setFields)
        .where(eq(communities.mint, item.mint))
        .run();
      if (result.rowsAffected > 0) updated++;
    } catch {
      // skip errors
    }
  }

  return NextResponse.json({ updated });
}
