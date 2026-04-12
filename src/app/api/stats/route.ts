import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { communities, raids, engagements, messages, users } from "@/lib/schema";
import { count } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const [communityCount] = db.select({ count: count() }).from(communities).all();
  const [raidCount] = db.select({ count: count() }).from(raids).all();
  const [engagementCount] = db.select({ count: count() }).from(engagements).all();
  const [messageCount] = db.select({ count: count() }).from(messages).all();
  const [userCount] = db.select({ count: count() }).from(users).all();

  return NextResponse.json({
    communities: communityCount.count,
    raids: raidCount.count,
    engagements: engagementCount.count,
    messages: messageCount.count,
    users: userCount.count,
  });
}
