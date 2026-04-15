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
      war_cry TEXT,
      created_by TEXT
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
    CREATE TABLE IF NOT EXISTS community_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      community_ticker TEXT NOT NULL,
      user TEXT NOT NULL,
      joined_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_engagements_raid_user_type ON engagements(raid_id, user, type);
    CREATE INDEX IF NOT EXISTS idx_engagements_raid_user ON engagements(raid_id, user);
    CREATE INDEX IF NOT EXISTS idx_messages_community ON messages(community);
    CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
    CREATE INDEX IF NOT EXISTS idx_raids_created_at ON raids(created_at);
    CREATE INDEX IF NOT EXISTS idx_raids_community ON raids(community);
    CREATE INDEX IF NOT EXISTS idx_community_owners_ticker ON community_owners(community_ticker);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_community_owners_unique ON community_owners(community_ticker, x_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_community_members_unique ON community_members(community_ticker, user);
    CREATE INDEX IF NOT EXISTS idx_community_members_ticker ON community_members(community_ticker);

    CREATE TABLE IF NOT EXISTS leader_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      community_ticker TEXT NOT NULL,
      voter TEXT NOT NULL,
      candidate TEXT NOT NULL,
      voted_at INTEGER NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_leader_votes_unique ON leader_votes(community_ticker, voter);
    CREATE INDEX IF NOT EXISTS idx_leader_votes_ticker ON leader_votes(community_ticker);

    CREATE TABLE IF NOT EXISTS target_tweets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tweet_url TEXT NOT NULL,
      tweet_id TEXT NOT NULL,
      author TEXT NOT NULL,
      author_name TEXT,
      author_avatar TEXT,
      tweet_text TEXT,
      submitted_by TEXT NOT NULL,
      submitted_at INTEGER NOT NULL,
      upvotes INTEGER NOT NULL DEFAULT 0,
      raid_id INTEGER,
      community_ticker TEXT
    );
    CREATE TABLE IF NOT EXISTS target_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_id INTEGER NOT NULL,
      user TEXT NOT NULL,
      voted_at INTEGER NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_target_votes_unique ON target_votes(target_id, user);
    CREATE INDEX IF NOT EXISTS idx_target_tweets_submitted ON target_tweets(submitted_at);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_target_tweets_tweet_id ON target_tweets(tweet_id);
  `).catch((err) => {
    console.warn("DB init warning (may be normal during build):", err.message);
  });

  // Migrations for existing tables (ALTER TABLE is not idempotent — ignore errors)
  client.execute("ALTER TABLE raids ADD COLUMN created_by TEXT").catch(() => {});
  client.execute("ALTER TABLE communities ADD COLUMN banner_url TEXT").catch(() => {});
  client.execute("ALTER TABLE communities ADD COLUMN website TEXT").catch(() => {});
  client.execute("ALTER TABLE communities ADD COLUMN twitter TEXT").catch(() => {});
  client.execute("ALTER TABLE communities ADD COLUMN telegram TEXT").catch(() => {});
  client.execute("ALTER TABLE communities ADD COLUMN discord TEXT").catch(() => {});
  client.execute("ALTER TABLE target_tweets ADD COLUMN author_followers INTEGER").catch(() => {});

  return db;
}

export const db = globalForDb.__db ?? (globalForDb.__db = initDb());
