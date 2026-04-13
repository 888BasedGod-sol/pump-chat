import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messages } from "@/lib/schema";
import { desc, eq, and, gt } from "drizzle-orm";
import { messageCreateSchema } from "@/lib/validation";
import { rateLimit, getClientKey } from "@/lib/rateLimit";
import { verifyPrivyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET — list messages
// Optional query params:
//   community — filter to a single community name
//   after     — only return messages with id > after (for incremental polling)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const community = searchParams.get("community");
  const afterId = parseInt(searchParams.get("after") ?? "0", 10) || 0;

  const conditions = [];
  if (community) conditions.push(eq(messages.community, community));
  if (afterId > 0) conditions.push(gt(messages.id, afterId));

  const query = db.select().from(messages);
  const filtered = conditions.length > 0
    ? query.where(conditions.length === 1 ? conditions[0] : and(...conditions))
    : query;

  const rows = (await filtered
    .orderBy(desc(messages.createdAt))
    .limit(200)
    .all()
  ).reverse(); // oldest first for chat display order

  const mapped = rows.map((m) => ({
    id: m.id,
    user: m.user,
    msg: m.msg,
    community: m.community,
    time: formatTime(m.createdAt),
  }));
  return NextResponse.json(mapped, {
    headers: { "Cache-Control": "public, s-maxage=2, stale-while-revalidate=5" },
  });
}

// POST — send a message (requires auth)
export async function POST(request: Request) {
  const verified = await verifyPrivyToken(request);
  if (!verified) {
    return NextResponse.json({ error: "Must be signed in" }, { status: 401 });
  }

  const { allowed } = rateLimit(getClientKey(request), 20, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = await request.json();
  const parsed = messageCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const { user, msg, community } = parsed.data;

  const result = await db
    .insert(messages)
    .values({
      user,
      msg,
      community,
      createdAt: Date.now(),
    })
    .returning()
    .get();

  return NextResponse.json({
    id: result.id,
    user: result.user,
    msg: result.msg,
    community: result.community,
    time: "now",
  });
}

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h`;
  return `${Math.floor(diff / 86400_000)}d`;
}
