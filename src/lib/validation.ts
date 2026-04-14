import { z } from "zod";

/** Solana public key: base58-encoded, 32-44 chars */
const solanaAddress = z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "Invalid Solana address");

/** Tweet URL must start with https:// and match twitter/x domain */
const tweetUrl = z.string().regex(
  /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/[\w]+\/status\/\d+/i,
  "Must be a valid twitter.com or x.com tweet URL"
);

export const raidCreateSchema = z.object({
  community: z.string().min(1).max(100),
  mint: solanaAddress.or(z.literal("")),
  tweetUrl: tweetUrl,
  tweetId: z.string().regex(/^\d+$/, "Tweet ID must be numeric"),
  tweet: z.string().max(500).optional(),
  author: z.string().max(50).optional(),
  authorName: z.string().max(100).optional(),
  authorAvatar: z.string().url().max(500).optional(),
  targetLikes: z.number().int().min(1).max(100_000).optional(),
  targetRetweets: z.number().int().min(1).max(100_000).optional(),
  targetReplies: z.number().int().min(1).max(100_000).optional(),
  warCry: z.string().max(140).optional(),
  createdBy: z.string().max(50).optional(),
});

export const raidEngageSchema = z.object({
  raidId: z.number().int().positive(),
  type: z.enum(["like", "retweet", "reply"]),
  user: z.string().min(1).max(50),
});

export const messageCreateSchema = z.object({
  user: z.string().min(1).max(50),
  msg: z.string().min(1).max(2000),
  community: z.string().min(1).max(100),
});

export const communityBulkSchema = z.object({
  communities: z.array(
    z.object({
      ticker: z.string().min(1).max(20).regex(/^[A-Z0-9]+$/i, "Ticker must be alphanumeric"),
      name: z.string().max(100).optional(),
      mint: solanaAddress,
      image: z.string().url().max(500).optional(),
      marketCapSol: z.number().optional(),
      complete: z.boolean().optional(),
    })
  ).min(1).max(100),
});

export const balanceQuerySchema = z.object({
  wallet: solanaAddress,
  mint: solanaAddress,
});

export const claimOwnershipSchema = z.object({
  communityTicker: z.string().min(1).max(20),
  walletAddress: solanaAddress,
});

export const targetSubmitSchema = z.object({
  tweetUrl: tweetUrl,
  communityTicker: z.string().min(1).max(20).optional(),
});

export const targetVoteSchema = z.object({
  targetId: z.number().int().positive(),
});
