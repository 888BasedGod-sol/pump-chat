import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { communities, raids, engagements, messages, users } from "@/lib/schema";
import { count } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const [communityCount] = await db.select({ count: count() }).from(communities).all();
  const [raidCount] = await db.select({ count: count() }).from(raids).all();
  const [engagementCount] = await db.select({ count: count() }).from(engagements).all();
  const [messageCount] = await db.select({ count: count() }).from(messages).all();
  const [userCount] = await db.select({ count: count() }).from(users).all();

  return NextResponse.json({
    communities: communityCount.count,
    raids: raidCount.count,
    engagements: engagementCount.count,
    messages: messageCount.count,
    users: userCount.count,
  }, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
  });
}
