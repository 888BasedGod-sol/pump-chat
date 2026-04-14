import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { communityMembers } from "@/lib/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET — list members of a community
export async function GET(request: Request) {
  const url = new URL(request.url);
  const ticker = url.searchParams.get("ticker");
  if (!ticker) {
    return NextResponse.json({ error: "ticker param required" }, { status: 400 });
  }

  const rows = await db
    .select({ user: communityMembers.user, joinedAt: communityMembers.joinedAt })
    .from(communityMembers)
    .where(eq(communityMembers.communityTicker, ticker))
    .all();

  return NextResponse.json(rows, {
    headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" },
  });
}
