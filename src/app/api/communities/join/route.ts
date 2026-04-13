import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { communityMembers, communities } from "@/lib/schema";
import { verifyPrivyToken, getPrivyUser } from "@/lib/auth";
import { eq, and, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// POST — join a community
export async function POST(request: Request) {
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

  // Verify community exists
  const community = await db.select().from(communities).where(eq(communities.ticker, ticker)).get();
  if (!community) {
    return NextResponse.json({ error: "Community not found" }, { status: 404 });
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

  // Check if already a member
  const existing = await db
    .select()
    .from(communityMembers)
    .where(and(eq(communityMembers.communityTicker, ticker), eq(communityMembers.user, username)))
    .get();

  if (existing) {
    return NextResponse.json({ error: "Already a member" }, { status: 409 });
  }

  // Insert membership
  await db.insert(communityMembers).values({
    communityTicker: ticker,
    user: username,
    joinedAt: Date.now(),
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

  return NextResponse.json(rows.map((r) => r.communityTicker));
}
