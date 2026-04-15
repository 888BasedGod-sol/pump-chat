import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { communityMembers, communities } from "@/lib/schema";
import { verifyPrivyToken, getPrivyUser } from "@/lib/auth";
import { eq, and, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** Fetch follower count for a username from X API */
async function fetchFollowerCount(username: string): Promise<number | null> {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) return null;
  
  const handle = username.replace(/^@/, "");
  try {
    const res = await fetch(
      `https://api.twitter.com/2/users/by/username/${handle}?user.fields=public_metrics`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.public_metrics?.followers_count ?? null;
  } catch {
    return null;
  }
}

// POST — join a community
export async function POST(request: Request) {
  const verified = await verifyPrivyToken(request);
  if (!verified) {
    console.error("[JOIN] Auth failed — no valid token");
    return NextResponse.json({ error: "Must be signed in" }, { status: 401 });
  }
  console.log("[JOIN] Auth passed, userId:", verified.userId);

  const body = await request.json();
  const ticker = typeof body.ticker === "string" ? body.ticker.trim() : "";
  const clientUser = typeof body.user === "string" ? body.user.trim() : "";
  console.log("[JOIN] body:", { ticker, clientUser });
  if (!ticker) {
    return NextResponse.json({ error: "ticker is required" }, { status: 400 });
  }

  // Verify community exists
  const community = await db.select().from(communities).where(eq(communities.ticker, ticker)).get();
  if (!community) {
    console.error("[JOIN] Community not found:", ticker);
    return NextResponse.json({ error: "Community not found" }, { status: 404 });
  }

  // Resolve X username from Privy, fall back to client-provided username
  let username = "";
  try {
    const privyUser = await getPrivyUser(verified.userId);
    console.log("[JOIN] Privy user twitter:", privyUser.twitter);
    const twitter = privyUser.twitter;
    if (twitter?.username) {
      username = `@${twitter.username}`;
    }
  } catch (err) {
    console.error("[JOIN] getPrivyUser failed:", err);
  }
  if (!username && clientUser.startsWith("@")) {
    console.log("[JOIN] Using client fallback username:", clientUser);
    username = clientUser;
  }
  if (!username) {
    console.error("[JOIN] Could not resolve username. clientUser:", clientUser);
    return NextResponse.json({ error: "Could not resolve X account" }, { status: 400 });
  }
  console.log("[JOIN] Resolved username:", username);

  // Check if already a member
  const existing = await db
    .select()
    .from(communityMembers)
    .where(and(eq(communityMembers.communityTicker, ticker), eq(communityMembers.user, username)))
    .get();

  if (existing) {
    // Return current member count so client can sync
    const count = await db
      .select({ count: sql<number>`count(*)` })
      .from(communityMembers)
      .where(eq(communityMembers.communityTicker, ticker))
      .get();
    return NextResponse.json({ error: "Already a member", joined: true, members: count?.count ?? 1 }, { status: 409 });
  }

  // Fetch follower count from X API
  const followers = await fetchFollowerCount(username);

  // Insert membership
  await db.insert(communityMembers).values({
    communityTicker: ticker,
    user: username,
    joinedAt: Date.now(),
    followers,
  }).run();

  // Update member count on community
  const count = await db
    .select({ count: sql<number>`count(*)` })
    .from(communityMembers)
    .where(eq(communityMembers.communityTicker, ticker))
    .get();

  await db
    .update(communities)
    .set({ members: count?.count ?? 1 })
    .where(eq(communities.ticker, ticker))
    .run();

  return NextResponse.json({ joined: true, members: count?.count ?? 1 });
}

// DELETE — leave a community
export async function DELETE(request: Request) {
  const verified = await verifyPrivyToken(request);
  if (!verified) {
    return NextResponse.json({ error: "Must be signed in" }, { status: 401 });
  }

  const body = await request.json();
  const ticker = typeof body.ticker === "string" ? body.ticker.trim() : "";
  const clientUser = typeof body.user === "string" ? body.user.trim() : "";
  if (!ticker) {
    return NextResponse.json({ error: "ticker is required" }, { status: 400 });
  }

  // Resolve X username from Privy, fall back to client-provided username
  let username = "";
  try {
    const privyUser = await getPrivyUser(verified.userId);
    const twitter = privyUser.twitter;
    if (twitter?.username) {
      username = `@${twitter.username}`;
    }
  } catch {
    // Privy API call failed — fall back to client-provided user
  }
  if (!username && clientUser.startsWith("@")) {
    username = clientUser;
  }
  if (!username) {
    return NextResponse.json({ error: "Could not resolve X account" }, { status: 400 });
  }

  // Delete membership
  await db
    .delete(communityMembers)
    .where(and(eq(communityMembers.communityTicker, ticker), eq(communityMembers.user, username)))
    .run();

  // Update member count
  const count = await db
    .select({ count: sql<number>`count(*)` })
    .from(communityMembers)
    .where(eq(communityMembers.communityTicker, ticker))
    .get();

  await db
    .update(communities)
    .set({ members: count?.count ?? 0 })
    .where(eq(communities.ticker, ticker))
    .run();

  return NextResponse.json({ left: true, members: count?.count ?? 0 });
}

// GET — get communities the current user has joined
export async function GET(request: Request) {
  const url = new URL(request.url);
  const user = url.searchParams.get("user");
  if (!user) {
    return NextResponse.json({ error: "user param required" }, { status: 400 });
  }

  const rows = await db
    .select({ communityTicker: communityMembers.communityTicker })
    .from(communityMembers)
    .where(eq(communityMembers.user, user))
    .all();

  return NextResponse.json(rows.map((r) => r.communityTicker), {
    headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" },
  });
}
