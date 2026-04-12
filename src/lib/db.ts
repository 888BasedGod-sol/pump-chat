import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";

const DB_PATH = path.join(process.cwd(), "pump-chat.db");

// Singleton — reuse across hot reloads in dev
const globalForDb = globalThis as unknown as { __db?: ReturnType<typeof initDb> };

function initDb() {
  try {
    const sqlite = new Database(DB_PATH);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");

    // Auto-create tables
    sqlite.exec(`
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

      -- Performance indexes
      CREATE INDEX IF NOT EXISTS idx_engagements_raid_user_type ON engagements(raid_id, user, type);
      CREATE INDEX IF NOT EXISTS idx_engagements_raid_user ON engagements(raid_id, user);
      CREATE INDEX IF NOT EXISTS idx_messages_community ON messages(community);
      CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
      CREATE INDEX IF NOT EXISTS idx_raids_created_at ON raids(created_at);
      CREATE INDEX IF NOT EXISTS idx_raids_community ON raids(community);
      CREATE INDEX IF NOT EXISTS idx_community_owners_ticker ON community_owners(community_ticker);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_community_owners_unique ON community_owners(community_ticker, x_id);
    `);

    // Safe migrations for existing DBs — ALTER TABLE ADD COLUMN is idempotent-safe with try/catch
    const migrations = [
      "ALTER TABLE communities ADD COLUMN image TEXT",
      "ALTER TABLE communities ADD COLUMN market_cap_sol INTEGER",
      "ALTER TABLE communities ADD COLUMN complete INTEGER",
      "ALTER TABLE raids ADD COLUMN war_cry TEXT",
      "ALTER TABLE raids ADD COLUMN author_name TEXT",
      "ALTER TABLE raids ADD COLUMN author_avatar TEXT",
    ];
    for (const sql of migrations) {
      try { sqlite.exec(sql); } catch { /* column already exists */ }
    }

    return drizzle(sqlite, { schema });
  } catch (err) {
    console.error("Failed to initialize database:", err);
    throw err;
  }
}

export const db = globalForDb.__db ?? (globalForDb.__db = initDb());
