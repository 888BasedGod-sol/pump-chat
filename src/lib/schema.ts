import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  xId: text("x_id").primaryKey(), // Twitter/X user ID
  xUsername: text("x_username").notNull(),
  displayName: text("display_name"),
  image: text("image"),
  createdAt: integer("created_at").notNull().default(0),
});

export const communityOwners = sqliteTable("community_owners", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  communityTicker: text("community_ticker").notNull(),
  xId: text("x_id").notNull(), // owner's X account ID
  walletAddress: text("wallet_address").notNull(), // verified wallet
  claimedAt: integer("claimed_at").notNull(),
});

export const communities = sqliteTable("communities", {
  ticker: text("ticker").primaryKey(),
  name: text("name").notNull(),
  mint: text("mint").notNull().unique(),
  members: integer("members").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at").notNull().default(0),
  image: text("image"),
  marketCapSol: integer("market_cap_sol"),
  complete: integer("complete", { mode: "boolean" }),
  bannerUrl: text("banner_url"),
  website: text("website"),
  twitter: text("twitter"),
  telegram: text("telegram"),
  discord: text("discord"),
});

export const raids = sqliteTable("raids", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  community: text("community").notNull(),
  mint: text("mint").notNull(),
  tweetUrl: text("tweet_url").notNull(),
  tweetId: text("tweet_id").notNull(),
  tweet: text("tweet").notNull(),
  author: text("author").notNull(),
  authorName: text("author_name"),
  authorAvatar: text("author_avatar"),
  likes: integer("likes").notNull().default(0),
  retweets: integer("retweets").notNull().default(0),
  replies: integer("replies").notNull().default(0),
  targetLikes: integer("target_likes").notNull().default(100),
  targetRetweets: integer("target_retweets").notNull().default(50),
  targetReplies: integer("target_replies").notNull().default(25),
  participants: integer("participants").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  warCry: text("war_cry"),
  createdBy: text("created_by"),
});

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  user: text("user").notNull(),
  msg: text("msg").notNull(),
  community: text("community").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const engagements = sqliteTable("engagements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  user: text("user").notNull(),
  type: text("type").notNull(), // "like" | "retweet" | "reply"
  raidId: integer("raid_id").notNull(),
  at: integer("at").notNull(),
});

export const communityMembers = sqliteTable("community_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  communityTicker: text("community_ticker").notNull(),
  user: text("user").notNull(), // @handle
  joinedAt: integer("joined_at").notNull(),
});

export const leaderVotes = sqliteTable("leader_votes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  communityTicker: text("community_ticker").notNull(),
  voter: text("voter").notNull(),       // @handle of the voter
  candidate: text("candidate").notNull(), // @handle of the candidate
  votedAt: integer("voted_at").notNull(),
});

export const targetTweets = sqliteTable("target_tweets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tweetUrl: text("tweet_url").notNull(),
  tweetId: text("tweet_id").notNull(),
  author: text("author").notNull(),           // @handle
  authorName: text("author_name"),             // display name from oEmbed
  authorAvatar: text("author_avatar"),         // profile pic
  authorFollowers: integer("author_followers"), // follower count
  tweetText: text("tweet_text"),               // tweet content
  submittedBy: text("submitted_by").notNull(), // @handle of submitter
  submittedAt: integer("submitted_at").notNull(),
  upvotes: integer("upvotes").notNull().default(0),
  raidId: integer("raid_id"),                  // null until raided
  communityTicker: text("community_ticker"),   // optional — null = global
});

export const targetVotes = sqliteTable("target_votes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  targetId: integer("target_id").notNull(),
  user: text("user").notNull(),   // @handle
  votedAt: integer("voted_at").notNull(),
});
