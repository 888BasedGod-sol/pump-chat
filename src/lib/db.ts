import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { __db?: ReturnType<typeof initDb> };

function initDb() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL ?? "file:pump-chat.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const db = drizzle(client, { schema });

  // Auto-create tables (fire-and-forget — runs once on init)
  client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      x_id TEXT PRIMARY KEY,
      x_username TEXT NOT NULL,
      display_name TEXT,
      image TEXT,
      created_at INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS community_owners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      community_ticker TEXT NOT NULL,
      x_id TEXT NOT NULL,
      wallet_address TEXT NOT NULL,
      claimed_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS communities (
      ticker TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      mint TEXT NOT NULL UNIQUE,
      members INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT 0,
      image TEXT,
      market_cap_sol INTEGER,
      complete INTEGER
    );
    CREATE TABLE IF NOT EXISTS raids (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      community TEXT NOT NULL,
      mint TEXT NOT NULL,
      tweet_url TEXT NOT NULL,
      tweet_id TEXT NOT NULL,
      tweet TEXT NOT NULL,
      author TEXT NOT NULL,
      author_name TEXT,
      author_avatar TEXT,
      likes INTEGER NOT NULL DEFAULT 0,
      retweets INTEGER NOT NULL DEFAULT 0,
      replies INTEGER NOT NULL DEFAULT 0,
      target_likes INTEGER NOT NULL DEFAULT 100,
      target_retweets INTEGER NOT NULL DEFAULT 50,
      target_replies INTEGER NOT NULL DEFAULT 25,
      participants INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      war_cry TEXT
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user TEXT NOT NULL,
      msg TEXT NOT NULL,
      community TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS engagements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user TEXT NOT NULL,
      type TEXT NOT NULL,
      raid_id INTEGER NOT NULL,
      at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_engagements_raid_user_type ON engagements(raid_id, user, type);
    CREATE INDEX IF NOT EXISTS idx_engagements_raid_user ON engagements(raid_id, user);
    CREATE INDEX IF NOT EXISTS idx_messages_community ON messages(community);
    CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
    CREATE INDEX IF NOT EXISTS idx_raids_created_at ON raids(created_at);
    CREATE INDEX IF NOT EXISTS idx_raids_community ON raids(community);
    CREATE INDEX IF NOT EXISTS idx_community_owners_ticker ON community_owners(community_ticker);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_community_owners_unique ON community_owners(community_ticker, x_id);
  `).catch((err) => {
    console.warn("DB init warning (may be normal during build):", err.message);
  });

  return db;
}

export const db = globalForDb.__db ?? (globalForDb.__db = initDb());
