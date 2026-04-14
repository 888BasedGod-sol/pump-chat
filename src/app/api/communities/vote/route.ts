import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leaderVotes, communityMembers } from "@/lib/schema";
import { verifyPrivyToken, getPrivyUser } from "@/lib/auth";
import { eq, and, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET — get vote results for a community
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker")?.trim();
  if (!ticker) {
    return NextResponse.json({ error: "ticker required" }, { status: 400 });
  }

  // Get all votes for this community, grouped by candidate
  const votes = await db
    .select({
      candidate: leaderVotes.candidate,
      votes: sql<number>`count(*)`.as("votes"),
    })
    .from(leaderVotes)
    .where(eq(leaderVotes.communityTicker, ticker))
    .groupBy(leaderVotes.candidate)
    .orderBy(sql`count(*) desc`)
    .all();

  // Get the current user's vote (if authenticated)
  let myVote: string | null = null;
  try {
    const verified = await verifyPrivyToken(request);
    if (verified) {
      const privyUser = await getPrivyUser(verified.userId);
      const username = privyUser.twitter?.username ? `@${privyUser.twitter.username}` : null;
      if (username) {
        const existing = await db
          .select({ candidate: leaderVotes.candidate })
          .from(leaderVotes)
          .where(and(eq(leaderVotes.communityTicker, ticker), eq(leaderVotes.voter, username)))
          .get();
        if (existing) myVote = existing.candidate;
      }
    }
  } catch {
    // Not authenticated — that's fine for GET
  }

  return NextResponse.json({ votes, myVote }, {
    headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=15" },
  });
}

// POST — cast or change a vote
export async function POST(request: Request) {
  const verified = await verifyPrivyToken(request);
  if (!verified) {
    return NextResponse.json({ error: "Must be signed in" }, { status: 401 });
  }

  const body = await request.json();
  const ticker = typeof body.ticker === "string" ? body.ticker.trim() : "";
  const candidate = typeof body.candidate === "string" ? body.candidate.trim() : "";

  if (!ticker || !candidate) {
    return NextResponse.json({ error: "ticker and candidate required" }, { status: 400 });
  }

  // Resolve voter username
  let voter = "";
  try {
    const privyUser = await getPrivyUser(verified.userId);
    if (privyUser.twitter?.username) {
      voter = `@${privyUser.twitter.username}`;
    }
  } catch {
    // fall through
  }
  if (!voter) {
    return NextResponse.json({ error: "Could not resolve X account" }, { status: 400 });
  }

  // Can't vote for yourself
  if (voter === candidate) {
    return NextResponse.json({ error: "Cannot vote for yourself" }, { status: 400 });
  }

  // Voter must be a member of the community
  const isMember = await db
    .select({ id: communityMembers.id })
    .from(communityMembers)
    .where(and(eq(communityMembers.communityTicker, ticker), eq(communityMembers.user, voter)))
    .get();

  if (!isMember) {
    return NextResponse.json({ error: "Must be a community member to vote" }, { status: 403 });
  }

  // Candidate must also be a member
  const candidateIsMember = await db
    .select({ id: communityMembers.id })
    .from(communityMembers)
    .where(and(eq(communityMembers.communityTicker, ticker), eq(communityMembers.user, candidate)))
    .get();

  if (!candidateIsMember) {
    return NextResponse.json({ error: "Candidate is not a community member" }, { status: 400 });
  }

  // Upsert: replace existing vote or insert new one
  const existing = await db
    .select({ id: leaderVotes.id })
    .from(leaderVotes)
    .where(and(eq(leaderVotes.communityTicker, ticker), eq(leaderVotes.voter, voter)))
    .get();

  if (existing) {
    await db
      .update(leaderVotes)
      .set({ candidate, votedAt: Date.now() })
      .where(eq(leaderVotes.id, existing.id))
      .run();
  } else {
    await db.insert(leaderVotes).values({
      communityTicker: ticker,
      voter,
      candidate,
      votedAt: Date.now(),
    }).run();
  }

  return NextResponse.json({ ok: true, voter, candidate });
}
