import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messages } from "@/lib/schema";
import { desc } from "drizzle-orm";
import { messageCreateSchema } from "@/lib/validation";
import { rateLimit, getClientKey } from "@/lib/rateLimit";
import { verifyPrivyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET — list messages (newest last for chat order, limited to recent 200)
export async function GET() {
  const rows = (await db
    .select()
    .from(messages)
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
  return NextResponse.json(mapped);
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
