import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { communities, leaderVotes } from "@/lib/schema";
import { verifyPrivyToken, getPrivyUser } from "@/lib/auth";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Helper: get the elected leader for a community (most votes)
async function getElectedLeader(ticker: string): Promise<string | null> {
  const top = await db
    .select({
      candidate: leaderVotes.candidate,
      votes: sql<number>`count(*)`.as("votes"),
    })
    .from(leaderVotes)
    .where(eq(leaderVotes.communityTicker, ticker))
    .groupBy(leaderVotes.candidate)
    .orderBy(sql`count(*) desc`)
    .limit(1)
    .get();

  return top && top.votes > 0 ? top.candidate : null;
}

// Simple URL validation
function isValidUrl(s: string): boolean {
  try {
    const url = new URL(s);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

// POST — update community settings (leader-only)
export async function POST(request: Request) {
  const verified = await verifyPrivyToken(request);
  if (!verified) {
    return NextResponse.json({ error: "Must be signed in" }, { status: 401 });
  }

  const body = await request.json();
  const ticker = typeof body.ticker === "string" ? body.ticker.trim() : "";
  if (!ticker) {
    return NextResponse.json({ error: "ticker required" }, { status: 400 });
  }

  // Resolve username
  let username = "";
  try {
    const privyUser = await getPrivyUser(verified.userId);
    if (privyUser.twitter?.username) {
      username = `@${privyUser.twitter.username}`;
    }
  } catch {
    // fall through
  }
  if (!username) {
    return NextResponse.json({ error: "Could not resolve X account" }, { status: 400 });
  }

  // Verify this user is the elected leader
  const leader = await getElectedLeader(ticker);
  if (!leader || leader !== username) {
    return NextResponse.json({ error: "Only the elected community leader can edit settings" }, { status: 403 });
  }

  // Validate and collect updates
  const updates: Record<string, string | null> = {};

  if ("bannerUrl" in body) {
    const val = typeof body.bannerUrl === "string" ? body.bannerUrl.trim() : "";
    if (val && !isValidUrl(val)) {
      return NextResponse.json({ error: "Invalid banner URL" }, { status: 400 });
    }
    updates.bannerUrl = val || null;
  }
  if ("website" in body) {
    const val = typeof body.website === "string" ? body.website.trim() : "";
    if (val && !isValidUrl(val)) {
      return NextResponse.json({ error: "Invalid website URL" }, { status: 400 });
    }
    updates.website = val || null;
  }
  if ("twitter" in body) {
    const val = typeof body.twitter === "string" ? body.twitter.trim().replace(/^@/, "") : "";
    // Basic validation: alphanumeric + underscores, 1-15 chars
    if (val && !/^[a-zA-Z0-9_]{1,15}$/.test(val)) {
      return NextResponse.json({ error: "Invalid Twitter handle" }, { status: 400 });
    }
    updates.twitter = val || null;
  }
  if ("telegram" in body) {
    const val = typeof body.telegram === "string" ? body.telegram.trim() : "";
    if (val && !isValidUrl(val) && !/^@?[a-zA-Z0-9_]{5,}$/.test(val)) {
      return NextResponse.json({ error: "Invalid Telegram link/handle" }, { status: 400 });
    }
    updates.telegram = val || null;
  }
  if ("discord" in body) {
    const val = typeof body.discord === "string" ? body.discord.trim() : "";
    if (val && !isValidUrl(val)) {
      return NextResponse.json({ error: "Invalid Discord invite URL" }, { status: 400 });
    }
    updates.discord = val || null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  await db.update(communities).set(updates).where(eq(communities.ticker, ticker)).run();

  return NextResponse.json({ ok: true, updates });
}
