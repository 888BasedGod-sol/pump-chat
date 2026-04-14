import { TARGET_ACCOUNTS } from "./targetAccounts";

/**
 * Fetch recent tweets from the monitored target accounts using the X API v2.
 *
 * Requires env var: X_BEARER_TOKEN
 *
 * Returns an array of tweet objects with author info attached.
 * Silently skips accounts that fail or are not found.
 */

const BASE = "https://api.twitter.com/2";

function getBearerToken(): string | null {
  return process.env.X_BEARER_TOKEN ?? null;
}

interface XUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
}

interface XTweet {
  id: string;
  text: string;
  created_at?: string;
  author_id: string;
  public_metrics?: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
    quote_count: number;
    impression_count: number;
  };
}

export interface FetchedTweet {
  tweetId: string;
  tweetUrl: string;
  text: string;
  authorUsername: string;
  authorName: string;
  authorAvatar: string;
  createdAt: number; // timestamp ms
  likes: number;
  retweets: number;
  replies: number;
  impressions: number;
}

/**
 * Look up X user IDs from usernames. X API allows up to 100 per request.
 */
async function resolveUserIds(
  usernames: string[],
  token: string
): Promise<Map<string, XUser>> {
  const map = new Map<string, XUser>();
  // Batch in groups of 100
  for (let i = 0; i < usernames.length; i += 100) {
    const batch = usernames.slice(i, i + 100);
    const url = `${BASE}/users/by?usernames=${batch.join(",")}&user.fields=profile_image_url`;
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) continue;
      const json = await res.json();
      if (json.data) {
        for (const u of json.data as XUser[]) {
          map.set(u.id, u);
        }
      }
    } catch {
      // skip batch on error
    }
  }
  return map;
}

/**
 * Fetch recent tweets for a single user ID.
 * Returns up to `max` tweets from the last 7 days (X API free/basic limit).
 */
async function fetchUserTweets(
  userId: string,
  token: string,
  max: number = 10,
  sinceId?: string
): Promise<XTweet[]> {
  const params = new URLSearchParams({
    "tweet.fields": "created_at,public_metrics,author_id",
    max_results: String(Math.min(max, 100)),
    exclude: "retweets,replies",
  });
  if (sinceId) params.set("since_id", sinceId);

  const url = `${BASE}/users/${userId}/tweets?${params}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data as XTweet[]) ?? [];
  } catch {
    return [];
  }
}

/**
 * Fetch recent tweets from all TARGET_ACCOUNTS.
 * Returns flattened array of enriched tweet objects, newest first.
 */
export async function fetchTargetTweets(sinceIds?: Record<string, string>): Promise<FetchedTweet[]> {
  const token = getBearerToken();
  if (!token) return [];

  // Step 1: resolve usernames → user IDs + profile info
  const userMap = await resolveUserIds([...TARGET_ACCOUNTS], token);
  if (userMap.size === 0) return [];

  // Build username lookup by ID
  const idToUser = new Map<string, XUser>();
  for (const [id, user] of userMap) {
    idToUser.set(id, user);
  }

  // Step 2: fetch tweets for each user in parallel (with concurrency limit)
  const userIds = [...userMap.keys()];
  const CONCURRENCY = 5;
  const allTweets: { tweet: XTweet; user: XUser }[] = [];

  for (let i = 0; i < userIds.length; i += CONCURRENCY) {
    const batch = userIds.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (uid) => {
        const user = idToUser.get(uid)!;
        const sinceId = sinceIds?.[user.username.toLowerCase()];
        const tweets = await fetchUserTweets(uid, token, 10, sinceId);
        return tweets.map((t) => ({ tweet: t, user }));
      })
    );
    for (const r of results) {
      if (r.status === "fulfilled") allTweets.push(...r.value);
    }
  }

  // Step 3: map to FetchedTweet
  const result: FetchedTweet[] = allTweets.map(({ tweet, user }) => ({
    tweetId: tweet.id,
    tweetUrl: `https://x.com/${user.username}/status/${tweet.id}`,
    text: tweet.text,
    authorUsername: user.username,
    authorName: user.name,
    authorAvatar: user.profile_image_url?.replace("_normal", "_200x200") ?? `https://unavatar.io/twitter/${user.username}`,
    createdAt: tweet.created_at ? new Date(tweet.created_at).getTime() : Date.now(),
    likes: tweet.public_metrics?.like_count ?? 0,
    retweets: tweet.public_metrics?.retweet_count ?? 0,
    replies: tweet.public_metrics?.reply_count ?? 0,
    impressions: tweet.public_metrics?.impression_count ?? 0,
  }));

  // Sort newest first
  result.sort((a, b) => b.createdAt - a.createdAt);
  return result;
}
