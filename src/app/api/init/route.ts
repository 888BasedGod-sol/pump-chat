import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { communities, messages, raids, engagements } from "@/lib/schema";
import { desc, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/init
 * Consolidated endpoint that returns all data needed for initial page load.
 * This reduces round trips from 4 separate requests to 1.
 */
export async function GET(request: NextRequest) {
  const user = request.nextUrl.searchParams.get("user");

  // Fetch all data in parallel
  const [commRows, msgRows, raidRows, engRows] = await Promise.all([
    db.select().from(communities).all(),
    db.select().from(messages).orderBy(desc(messages.createdAt)).limit(200).all(),
    db.select().from(raids).orderBy(desc(raids.createdAt)).limit(100).all(),
    db.select().from(engagements).all(),
  ]);

  // Map messages
  const mappedMessages = msgRows.reverse().map((m) => ({
    id: m.id,
    user: m.user,
    msg: m.msg,
    community: m.community,
    time: formatTime(m.createdAt),
  }));

  // Map raids with user engagement state
  const raidIds = raidRows.map((r) => r.id);
  const raidEngagers: Record<number, Record<string, string[]>> = {};
  const userEngagements = new Set<string>();
  
  for (const e of engRows) {
    if (!raidEngagers[e.raidId]) raidEngagers[e.raidId] = {};
    if (!raidEngagers[e.raidId][e.user]) raidEngagers[e.raidId][e.user] = [];
    raidEngagers[e.raidId][e.user].push(e.type);
    if (user && e.user === user) {
      userEngagements.add(`${e.raidId}:${e.type}`);
    }
  }

  const mappedRaids = raidRows.map((r) => ({
    id: r.id,
    community: r.community,
    mint: r.mint,
    tweetUrl: r.tweetUrl,
    tweetId: r.tweetId,
    tweet: r.tweet,
    author: r.author,
    authorName: r.authorName ?? undefined,
    authorAvatar: r.authorAvatar ?? undefined,
    likes: r.likes,
    retweets: r.retweets,
    replies: r.replies,
    target: { likes: r.targetLikes, retweets: r.targetRetweets, replies: r.targetReplies },
    participants: r.participants,
    createdAt: r.createdAt,
    engagedLike: userEngagements.has(`${r.id}:like`),
    engagedRT: userEngagements.has(`${r.id}:retweet`),
    engagedReply: userEngagements.has(`${r.id}:reply`),
    engagers: raidEngagers[r.id] ?? {},
    warCry: r.warCry ?? undefined,
  }));

  // Map communities
  const mappedCommunities = commRows.map((c) => ({
    ticker: c.ticker,
    name: c.name,
    mint: c.mint,
    members: c.members ?? 0,
    active: c.active !== false,
    image: c.image || undefined,
    marketCapSol: c.marketCapSol || undefined,
    complete: c.complete != null ? c.complete : undefined,
    bannerUrl: c.bannerUrl || undefined,
    website: c.website || undefined,
    twitter: c.twitter || undefined,
    telegram: c.telegram || undefined,
    discord: c.discord || undefined,
  }));

  return NextResponse.json({
    communities: mappedCommunities,
    messages: mappedMessages,
    raids: mappedRaids,
    engagements: engRows,
  }, {
    headers: { 
      "Cache-Control": "public, s-maxage=5, stale-while-revalidate=15",
    },
  });
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}
