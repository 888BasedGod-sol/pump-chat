import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { raids, engagements } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";
import { raidCreateSchema, raidEngageSchema } from "@/lib/validation";
import { rateLimit, getClientKey } from "@/lib/rateLimit";
import { verifyPrivyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET — list raids (newest first), with optional per-user engagement state
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const user = searchParams.get("user");

  const rows = db.select().from(raids).orderBy(desc(raids.createdAt)).limit(100).all();

  // If a user is provided, batch-fetch their engagements for all returned raids
  let userEngagements: Set<string> | undefined;
  if (user) {
    const userRows = db
      .select()
      .from(engagements)
      .where(eq(engagements.user, user))
      .all();
    userEngagements = new Set(userRows.map((e) => `${e.raidId}:${e.type}`));
  }

  const mapped = rows.map((r) => ({
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
    engagedLike: userEngagements?.has(`${r.id}:like`) ?? false,
    engagedRT: userEngagements?.has(`${r.id}:retweet`) ?? false,
    engagedReply: userEngagements?.has(`${r.id}:reply`) ?? false,
    warCry: r.warCry ?? undefined,
  }));
  return NextResponse.json(mapped);
}

// POST — create a new raid (requires auth)
export async function POST(request: Request) {
  const verified = await verifyPrivyToken(request);
  if (!verified) {
    return NextResponse.json({ error: "Must be signed in" }, { status: 401 });
  }

  const { allowed } = rateLimit(getClientKey(request) + ":raid-create", 5, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = await request.json();
  const parsed = raidCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const { community, mint, tweetUrl, tweetId, tweet, author, authorName, authorAvatar, targetLikes, targetRetweets, targetReplies, warCry } = parsed.data;

  // Fetch real tweet content via X oEmbed (no API key required)
  let resolvedTweet = tweet || tweetUrl;
  let resolvedAuthorName = authorName || undefined;
  let resolvedAuthorAvatar = authorAvatar || undefined;
  try {
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(tweetUrl)}&omit_script=true&dnt=true`;
    const oembedRes = await fetch(oembedUrl, { signal: AbortSignal.timeout(5000) });
    if (oembedRes.ok) {
      const oembed = await oembedRes.json();
      // Extract text from the HTML — the oEmbed html contains the tweet text inside <p> tags
      if (oembed.html) {
        const textMatch = oembed.html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
        if (textMatch) {
          // Strip HTML tags from within the paragraph
          resolvedTweet = textMatch[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').trim();
        }
      }
      if (oembed.author_name) resolvedAuthorName = oembed.author_name;
      // oEmbed doesn't include avatar, try a secondary approach
    }
  } catch {
    // oEmbed failed — proceed with URL-parsed data
  }

  // Try to get author avatar from unavatar (open source, no API key)
  if (!resolvedAuthorAvatar && author) {
    const handle = author.replace(/^@/, "");
    resolvedAuthorAvatar = `https://unavatar.io/twitter/${handle}`;
  }

  // Validate the raid's community exists
  const result = db
    .insert(raids)
    .values({
      community,
      mint: mint || "",
      tweetUrl,
      tweetId,
      tweet: resolvedTweet,
      author: author || "@anonymous",
      authorName: resolvedAuthorName || null,
      authorAvatar: resolvedAuthorAvatar || null,
      likes: 0,
      retweets: 0,
      replies: 0,
      targetLikes: targetLikes ?? 100,
      targetRetweets: targetRetweets ?? 50,
      targetReplies: targetReplies ?? 25,
      participants: 0,
      createdAt: Date.now(),
      warCry: warCry || null,
    })
    .returning()
    .get();

  return NextResponse.json(result);
}

// PATCH — engage a raid (like/retweet/reply) (requires auth)
export async function PATCH(request: Request) {
  const verified = await verifyPrivyToken(request);
  if (!verified) {
    return NextResponse.json({ error: "Must be signed in" }, { status: 401 });
  }

  const { allowed } = rateLimit(getClientKey(request) + ":raid-engage", 30, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = await request.json();
  const parsed = raidEngageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const { raidId, type, user } = parsed.data;

  // Validate raid exists
  const raid = db.select().from(raids).where(eq(raids.id, raidId)).get();
  if (!raid) {
    return NextResponse.json({ error: "Raid not found" }, { status: 404 });
  }

  // Check for duplicate engagement using targeted WHERE clause (not full table scan)
  const existing = db
    .select()
    .from(engagements)
    .where(
      and(
        eq(engagements.raidId, raidId),
        eq(engagements.user, user),
        eq(engagements.type, type)
      )
    )
    .get();

  if (existing) {
    return NextResponse.json({ error: "already engaged" }, { status: 409 });
  }

  // Record engagement
  db.insert(engagements)
    .values({ user, type, raidId, at: Date.now() })
    .run();

  // Count engagements for this user on this raid to determine if first
  const userEngagementCount = db
    .select()
    .from(engagements)
    .where(
      and(
        eq(engagements.raidId, raidId),
        eq(engagements.user, user)
      )
    )
    .all().length;

  const updates: Record<string, number> = {};
  if (type === "like") updates.likes = raid.likes + 1;
  if (type === "retweet") updates.retweets = raid.retweets + 1;
  if (type === "reply") updates.replies = raid.replies + 1;
  if (userEngagementCount === 1) updates.participants = raid.participants + 1;

  db.update(raids).set(updates).where(eq(raids.id, raidId)).run();

  return NextResponse.json({ ok: true });
}
