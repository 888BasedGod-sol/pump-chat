import { NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { targetTweets, targetVotes, raids } from "@/lib/schema";
import { eq, desc, and, inArray, sql, isNull } from "drizzle-orm";
import { targetVoteSchema } from "@/lib/validation";
import { rateLimit, getClientKey } from "@/lib/rateLimit";
import { verifyPrivyToken, getPrivyUser } from "@/lib/auth";
import { fetchTargetTweets } from "@/lib/twitter";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // allow up to 60s for X API fetch

/** Fetch new tweets from X API and upsert into DB. */
async function refreshFromXApi() {
  try {
    const tweets = await fetchTargetTweets();
    if (tweets.length === 0) return;

    // Build a map of author -> follower count for bulk updates
    const authorFollowers = new Map<string, number>();
    for (const t of tweets) {
      if (t.authorFollowers) {
        authorFollowers.set(`@${t.authorUsername}`.toLowerCase(), t.authorFollowers);
      }
    }

    // Update all existing tweets from these authors with follower counts
    for (const [author, followers] of authorFollowers) {
      await db
        .update(targetTweets)
        .set({ authorFollowers: followers })
        .where(eq(sql`lower(${targetTweets.author})`, author))
        .run();
    }

    // Insert new tweets
    for (const t of tweets) {
      const existing = await db
        .select({ id: targetTweets.id })
        .from(targetTweets)
        .where(eq(targetTweets.tweetId, t.tweetId))
        .get();
      
      if (existing) continue;

      await db.insert(targetTweets).values({
        tweetUrl: t.tweetUrl,
        tweetId: t.tweetId,
        author: `@${t.authorUsername}`,
        authorName: t.authorName,
        authorAvatar: t.authorAvatar,
        authorFollowers: t.authorFollowers,
        tweetText: t.text,
        submittedBy: "system",
        submittedAt: t.createdAt,
        upvotes: 0,
        raidId: null,
        communityTicker: null,
      });
    }
  } catch (err) {
    console.warn("Target tweet refresh failed:", err);
  }
}

/** Check if a refresh is needed (last tweet older than 2 min or missing follower data). */
async function needsRefresh(): Promise<boolean> {
  const latest = await db
    .select({ submittedAt: targetTweets.submittedAt })
    .from(targetTweets)
    .orderBy(desc(targetTweets.submittedAt))
    .limit(1)
    .get();
  if (!latest) return true; // empty table — must refresh
  const age = Date.now() - new Date(latest.submittedAt).getTime();
  if (age > 2 * 60 * 1000) return true;
  
  // Also refresh if any tweets are missing follower data
  const missingFollowers = await db
    .select({ id: targetTweets.id })
    .from(targetTweets)
    .where(isNull(targetTweets.authorFollowers))
    .limit(1)
    .get();
  return !!missingFollowers;
}

// GET — list tweets from monitored accounts with vote status
export async function GET(request: Request) {
  const isEmpty = (await db.select({ id: targetTweets.id }).from(targetTweets).limit(1).all()).length === 0;

  if (isEmpty) {
    // First ever call — await the refresh so we return data
    await refreshFromXApi();
  } else {
    // Schedule background refresh after response is sent (survives on serverless)
    const shouldRefresh = await needsRefresh();
    if (shouldRefresh) {
      after(() => refreshFromXApi());
    }
  }

  const { searchParams } = new URL(request.url);
  const user = searchParams.get("user");
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);

  const rows = await db
    .select()
    .from(targetTweets)
    .orderBy(desc(targetTweets.submittedAt))
    .limit(limit)
    .all();

  // Get vote state for requesting user
  const targetIds = rows.map((r) => r.id);
  const userVotes = new Set<number>();
  if (user && targetIds.length > 0) {
    const voteRows = await db
      .select()
      .from(targetVotes)
      .where(
        and(
          inArray(targetVotes.targetId, targetIds),
          eq(targetVotes.user, user)
        )
      )
      .all();
    for (const v of voteRows) {
      userVotes.add(v.targetId);
    }
  }

  // Get linked raid info
  const raidIds = rows.map((r) => r.raidId).filter((id): id is number => id != null);
  const raidMap = new Map<number, { id: number; community: string; likes: number; retweets: number; replies: number }>();
  if (raidIds.length > 0) {
    const raidRows = await db
      .select({ id: raids.id, community: raids.community, likes: raids.likes, retweets: raids.retweets, replies: raids.replies })
      .from(raids)
      .where(inArray(raids.id, raidIds))
      .all();
    for (const r of raidRows) {
      raidMap.set(r.id, r);
    }
  }

  const mapped = rows.map((r) => ({
    id: r.id,
    tweetUrl: r.tweetUrl,
    tweetId: r.tweetId,
    author: r.author,
    authorName: r.authorName ?? undefined,
    authorAvatar: r.authorAvatar ?? undefined,
    authorFollowers: r.authorFollowers ?? undefined,
    tweetText: r.tweetText ?? undefined,
    submittedAt: r.submittedAt,
    upvotes: r.upvotes,
    voted: userVotes.has(r.id),
    raidId: r.raidId ?? undefined,
    raid: r.raidId ? raidMap.get(r.raidId) : undefined,
  }));

  return NextResponse.json(mapped, {
    headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" },
  });
}

// PATCH — upvote a target (requires auth)
export async function PATCH(request: Request) {
  const verified = await verifyPrivyToken(request);
  if (!verified) {
    return NextResponse.json({ error: "Must be signed in" }, { status: 401 });
  }

  const { allowed } = rateLimit(getClientKey(request) + ":target-vote", 30, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = await request.json();
  const parsed = targetVoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  // Get voter's X username
  let voter = "anon";
  try {
    const privyUser = await getPrivyUser(verified.userId);
    const xAccount = privyUser.twitter;
    if (xAccount?.username) voter = `@${xAccount.username}`;
  } catch {
    // fallback
  }

  const { targetId } = parsed.data;

  // Check target exists
  const target = await db
    .select({ id: targetTweets.id, upvotes: targetTweets.upvotes })
    .from(targetTweets)
    .where(eq(targetTweets.id, targetId))
    .get();
  if (!target) {
    return NextResponse.json({ error: "Target not found" }, { status: 404 });
  }

  // Check if already voted
  const existingVote = await db
    .select({ id: targetVotes.id })
    .from(targetVotes)
    .where(
      and(eq(targetVotes.targetId, targetId), eq(targetVotes.user, voter))
    )
    .get();

  if (existingVote) {
    // Unvote
    await db.delete(targetVotes).where(eq(targetVotes.id, existingVote.id));
    await db
      .update(targetTweets)
      .set({ upvotes: Math.max(0, target.upvotes - 1) })
      .where(eq(targetTweets.id, targetId));
    return NextResponse.json({ upvotes: Math.max(0, target.upvotes - 1), voted: false });
  }

  // Cast vote
  await db.insert(targetVotes).values({
    targetId,
    user: voter,
    votedAt: Date.now(),
  });
  await db
    .update(targetTweets)
    .set({ upvotes: target.upvotes + 1 })
    .where(eq(targetTweets.id, targetId));

  return NextResponse.json({ upvotes: target.upvotes + 1, voted: true });
}
