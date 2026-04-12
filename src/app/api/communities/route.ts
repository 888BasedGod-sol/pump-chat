import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { communities } from "@/lib/schema";
import { communityBulkSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

// GET — list all communities
export async function GET() {
  const rows = db.select().from(communities).all();
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
      db.insert(communities)
        .values({
          ticker: item.ticker,
          name: item.name || `$${item.ticker}`,
          mint: item.mint,
          members: 0,
          active: true,
          createdAt: Date.now(),
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
