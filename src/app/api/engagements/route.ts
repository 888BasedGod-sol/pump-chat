import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { engagements } from "@/lib/schema";

export const dynamic = "force-dynamic";

// GET — list engagements for leaderboard computation
export async function GET() {
  const rows = await db.select().from(engagements).all();
  return NextResponse.json(rows, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
  });
}
