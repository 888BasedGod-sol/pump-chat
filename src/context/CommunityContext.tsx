"use client";

import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef, type ReactNode } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface Community {
  ticker: string;
  name: string;
  members: number;
  active: boolean;
  mint: string; // token mint address for balance verification
  /* dynamic token metadata — refreshed from /api/tokens every 15s */
  image?: string;
  marketCapSol?: number;
  progressPercent?: number;
  complete?: boolean;
  realSolReserves?: number;
  tokenTotalSupply?: string;
  /* DexScreener market data */
  priceUsd?: number | null;
  priceChange24h?: number | null;
  volume24h?: number | null;
  liquidity?: number | null;
  fdv?: number | null;
  pairUrl?: string | null;
  txns24h?: { buys: number; sells: number } | null;
  tokenCreatedAt?: number | null;
  holders?: number | null;
}

export interface ChatMessage {
  id: number;
  user: string;
  msg: string;
  time: string;
  community: string;
}

export interface Raid {
  id: number;
  community: string;
  mint: string; // token mint for this raid's community
  tweetUrl: string; // full twitter/x URL
  tweetId: string; // extracted tweet ID
  tweet: string; // display text (tweet content or URL)
  author: string; // @handle extracted from URL or user-supplied
  authorName?: string; // display name from oEmbed (e.g. "Elon Musk")
  authorAvatar?: string; // profile image URL from oEmbed
  likes: number;
  retweets: number;
  replies: number;
  target: { likes: number; retweets: number; replies: number };
  createdAt: number; // timestamp ms — countdown computed dynamically
  engagedLike: boolean;
  engagedRT: boolean;
  engagedReply: boolean;
  participants: number; // unique engagers
  engagers: Record<string, string[]>; // { "@user": ["like","retweet","reply"] }
  warCry?: string; // rally message from raid creator
}

export interface Leader {
  rank: number;
  user: string;
  score: number;
  likes: number;
  retweets: number;
  replies: number;
}

export interface CommunityLeader {
  rank: number;
  name: string;
  ticker: string;
  score: number;
  messages: number;
  raids: number;
  engagements: number;
  participants: number;
}

export interface ActivityItem {
  user: string;
  action: string;
  target: string;
  time: string;
}

export interface Engagement {
  user: string;
  type: "like" | "retweet" | "reply";
  raidId: number;
  at: number; // timestamp ms
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const RAID_DURATION_MS = 60 * 60 * 1000; // 60 minutes

export function getRaidTimeLeft(raid: Raid): string {
  const elapsed = Date.now() - raid.createdAt;
  const remaining = RAID_DURATION_MS - elapsed;
  if (remaining <= 0) return "expired";
  const mins = Math.ceil(remaining / 60_000);
  if (mins >= 60) return "60m";
  return `${mins}m`;
}

export function isRaidActive(raid: Raid): boolean {
  return Date.now() - raid.createdAt < RAID_DURATION_MS;
}

export function isRaidCompleted(raid: Raid): boolean {
  return (
    raid.likes >= raid.target.likes &&
    raid.retweets >= raid.target.retweets &&
    raid.replies >= raid.target.replies
  );
}

export function getRaidStatus(raid: Raid): "active" | "completed" | "expired" {
  if (isRaidCompleted(raid)) return "completed";
  if (!isRaidActive(raid)) return "expired";
  return "active";
}

/** Parse a twitter.com or x.com status URL → { tweetId, author } or null */
export function parseTweetUrl(url: string): { tweetId: string; author: string } | null {
  try {
    const match = url.match(
      /^https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/(@?[\w]+)\/status\/(\d+)/i
    );
    if (!match) return null;
    const author = match[1].startsWith("@") ? match[1] : `@${match[1]}`;
    return { tweetId: match[2], author };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Seed data                                                          */
/* ------------------------------------------------------------------ */

const SEED_COMMUNITIES: Community[] = [];

const SEED_MESSAGES: ChatMessage[] = [];

const SEED_RAIDS: Raid[] = [];

/* ------------------------------------------------------------------ */
/*  Context value                                                      */
/* ------------------------------------------------------------------ */

interface CommunityCtx {
  /* data */
  communities: Community[];
  selectedCommunity: string; // ticker or "all"
  messages: ChatMessage[];
  raids: Raid[];
  leaders: Leader[];
  communityLeaders: CommunityLeader[];
  activity: ActivityItem[];
  chatFilter: string; // "all" | community name
  leaderboardPeriod: "24h" | "7d" | "all";
  leaderboardMode: "communities" | "users";
  searchQuery: string;
  joinedCommunities: Set<string>; // tickers the current user has joined

  /* identity */
  username: string;
  isSignedIn: boolean;

  /* loading */
  isLoading: boolean;

  /* actions */
  selectCommunity: (ticker: string) => void;
  sendMessage: (msg: string) => void;
  setChatFilter: (f: string) => void;
  engageRaid: (raidId: number, type: "like" | "retweet" | "reply") => void;
  setLeaderboardPeriod: (p: "24h" | "7d" | "all") => void;
  setLeaderboardMode: (m: "communities" | "users") => void;
  createRaid: (tweetUrl: string, targets?: { likes?: number; retweets?: number; replies?: number }, warCry?: string) => void;
  addCommunity: (ticker: string, name: string, mint: string) => void;
  getMintForCommunity: (communityName: string) => string | null;
  setSearchQuery: (q: string) => void;
  syncTokenCommunities: (tokens: Array<{ address: string; name: string; symbol: string; image?: string; marketCapSol?: number; progressPercent?: number; complete?: boolean; realSolReserves?: number; tokenTotalSupply?: string; priceUsd?: number | null; priceChange24h?: number | null; volume24h?: number | null; liquidity?: number | null; fdv?: number | null; pairUrl?: string | null; txns24h?: { buys: number; sells: number } | null; createdAt?: number | null }>) => void;
  joinCommunity: (ticker: string) => Promise<void>;
  leaveCommunity: (ticker: string) => Promise<void>;
}

const CommunityContext = createContext<CommunityCtx | null>(null);

export function useCommunity() {
  const ctx = useContext(CommunityContext);
  if (!ctx) throw new Error("useCommunity must be inside CommunityProvider");
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function CommunityProvider({
  children,
  xUsername,
  xId,
  getAccessToken,
}: {
  children: ReactNode;
  xUsername?: string | null;
  xId?: string | null;
  getAccessToken?: () => Promise<string | null>;
}) {
  // X account is primary identity; fall back to anon
  const isSignedIn = !!xUsername;
  const username = xUsername ? `@${xUsername}` : "anon";
  const [communities, setCommunities] = useState<Community[]>(SEED_COMMUNITIES);
  const [selectedCommunity, setSelectedCommunity] = useState("all");
  const [messages, setMessages] = useState<ChatMessage[]>(SEED_MESSAGES);
  const [raids, setRaids] = useState<Raid[]>(SEED_RAIDS);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [chatFilter, setChatFilter] = useState("all");
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<"24h" | "7d" | "all">("24h");
  const [leaderboardMode, setLeaderboardMode] = useState<"communities" | "users">("communities");
  const [searchQuery, setSearchQuery] = useState("");
  const [nextMsgId, setNextMsgId] = useState(1);
  const [nextRaidId, setNextRaidId] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [joinedCommunities, setJoinedCommunities] = useState<Set<string>>(new Set());
  const communitiesLoaded = useRef(false);
  const lastEngageRef = useRef(0); // timestamp of last engagement, used to skip polls during PATCH

  /* -- hydrate from DB on mount ----------------------------------- */
  useEffect(() => {
    async function hydrate() {
      try {
        const [commRes, msgRes, raidRes, engRes] = await Promise.all([
          fetch("/api/communities").then((r) => r.json()).catch(() => []),
          fetch("/api/messages").then((r) => r.json()).catch(() => []),
          fetch("/api/raids" + (username !== "anon" ? `?user=${encodeURIComponent(username)}` : "")).then((r) => r.json()).catch(() => []),
          fetch("/api/engagements").then((r) => r.json()).catch(() => []),
        ]);

        if (Array.isArray(commRes) && commRes.length > 0) {
          const mapped = commRes.map((r: Record<string, unknown>) => ({
            ticker: r.ticker as string,
            name: r.name as string,
            mint: r.mint as string,
            members: (r.members as number) ?? 0,
            active: r.active !== false,
            image: (r.image as string) || undefined,
            marketCapSol: (r.marketCapSol as number) || undefined,
            complete: r.complete != null ? (r.complete as boolean) : undefined,
          }));
          setCommunities(mapped);

          // If many communities lack images, trigger a background backfill
          const missingImages = mapped.filter((c) => !c.image).length;
          if (missingImages > 5) {
            fetch("/api/communities/backfill", { method: "POST" })
              .then((res) => res.json())
              .then((data) => {
                if (data.updated > 0) {
                  // Re-fetch communities to pick up backfilled images
                  fetch("/api/communities").then((r) => r.json()).then((fresh) => {
                    if (Array.isArray(fresh) && fresh.length > 0) {
                      setCommunities((prev) =>
                        prev.map((c) => {
                          const f = fresh.find((fc: Record<string, unknown>) => fc.ticker === c.ticker);
                          if (f?.image && !c.image) return { ...c, image: f.image as string };
                          return c;
                        })
                      );
                    }
                  }).catch(() => {});
                }
              })
              .catch(() => {});
          }
        }
        communitiesLoaded.current = true;
        if (Array.isArray(msgRes) && msgRes.length > 0) {
          setMessages(msgRes);
          setNextMsgId(Math.max(...msgRes.map((m: { id: number }) => m.id)) + 1);
        }
        if (Array.isArray(raidRes) && raidRes.length > 0) {
          setRaids(raidRes);
          setNextRaidId(Math.max(...raidRes.map((r: { id: number }) => r.id)) + 1);
        }
        if (Array.isArray(engRes) && engRes.length > 0) {
          setEngagements(engRes);
        }

        // Fetch which communities the user has joined
        if (username !== "anon") {
          try {
            const joinedRes = await fetch(`/api/communities/join?user=${encodeURIComponent(username)}`);
            if (joinedRes.ok) {
              const tickers: string[] = await joinedRes.json();
              if (Array.isArray(tickers)) {
                setJoinedCommunities(new Set(tickers));
              }
            }
          } catch {
            // ignore
          }
        }
      } catch {
        // hydration failed — app works with empty state
      } finally {
        setIsLoading(false);
      }
    }
    hydrate();
  }, []);

  /* -- fetch fresh raids from server ------------------------------- */
  const fetchRaids = useCallback(async () => {
    try {
      const url = username !== "anon" ? `/api/raids?user=${encodeURIComponent(username)}` : "/api/raids";
      const res = await fetch(url);
      if (!res.ok) return;
      const fresh: Raid[] = await res.json();
      if (!Array.isArray(fresh) || fresh.length === 0) return;
      setRaids(fresh);
      setNextRaidId(Math.max(...fresh.map((r) => r.id)) + 1);
    } catch {
      // fetch failed — ignore
    }
  }, [username]);

  /* -- poll raids every 10s for real-time engagement counts -------- */
  useEffect(() => {
    if (isLoading) return;
    const interval = setInterval(async () => {
      // Skip poll if an engagement happened in the last 3 seconds
      // (the PATCH + immediate refresh handles that window)
      if (Date.now() - lastEngageRef.current < 3000) return;
      await fetchRaids();
    }, 10_000);
    return () => clearInterval(interval);
  }, [isLoading, fetchRaids]);

  /* -- enrich communities with DexScreener market data ------------ */
  const marketEnrichmentDone = useRef(false);
  useEffect(() => {
    if (isLoading || marketEnrichmentDone.current) return;
    // Only enrich communities that lack price data
    const needEnrichment = communities.filter((c) => c.mint && c.priceUsd == null);
    if (needEnrichment.length === 0) return;
    marketEnrichmentDone.current = true;

    const mints = needEnrichment.map((c) => c.mint);
    // Batch in groups of 100
    async function enrich() {
      try {
        for (let i = 0; i < mints.length; i += 100) {
          const batch = mints.slice(i, i + 100);
          const res = await fetch("/api/market", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mints: batch }),
          });
          if (!res.ok) continue;
          const { data } = await res.json();
          if (!data || typeof data !== "object") continue;

          setCommunities((prev) =>
            prev.map((c) => {
              const d = data[c.mint];
              if (!d) return c;
              return {
                ...c,
                priceUsd: d.priceUsd ?? c.priceUsd,
                priceChange24h: d.priceChange24h ?? c.priceChange24h,
                volume24h: d.volume24h ?? c.volume24h,
                liquidity: d.liquidity ?? c.liquidity,
                fdv: d.fdv ?? c.fdv,
                pairUrl: d.pairUrl ?? c.pairUrl,
                txns24h: d.txns24h ?? c.txns24h,
                tokenCreatedAt: d.createdAt ?? c.tokenCreatedAt,
                image: d.image || c.image,
                holders: d.holders ?? c.holders,
              };
            })
          );
        }
      } catch {
        // market enrichment failed — non-critical
      }
    }
    enrich();
  }, [isLoading, communities]);

  /* -- compute leaders from engagements filtered by period ---------- */
  const leaders = useMemo(() => {
    const now = Date.now();
    const cutoff =
      leaderboardPeriod === "24h" ? now - 24 * 60 * 60 * 1000 :
      leaderboardPeriod === "7d" ? now - 7 * 24 * 60 * 60 * 1000 :
      0;

    const filtered = engagements.filter((e) => e.at >= cutoff);
    const map = new Map<string, { likes: number; retweets: number; replies: number }>();
    for (const e of filtered) {
      const prev = map.get(e.user) ?? { likes: 0, retweets: 0, replies: 0 };
      if (e.type === "like") prev.likes++;
      else if (e.type === "retweet") prev.retweets++;
      else prev.replies++;
      map.set(e.user, prev);
    }

    return Array.from(map.entries())
      .map(([user, stats]) => ({
        user,
        ...stats,
        score: stats.likes + stats.retweets + stats.replies,
        rank: 0,
      }))
      .sort((a, b) => b.score - a.score)
      .map((l, i) => ({ ...l, rank: i + 1 }));
  }, [engagements, leaderboardPeriod]);

  /* -- compute community leaderboard ------------------------------ */
  const communityLeaders = useMemo((): CommunityLeader[] => {
    const now = Date.now();
    const cutoff =
      leaderboardPeriod === "24h" ? now - 24 * 60 * 60 * 1000 :
      leaderboardPeriod === "7d" ? now - 7 * 24 * 60 * 60 * 1000 :
      0;

    // Build a lookup: raidId -> community name
    const raidToCommunity = new Map<number, string>();
    for (const r of raids) {
      raidToCommunity.set(r.id, r.community);
    }

    // Accumulate stats per community name
    const map = new Map<string, { messages: number; raids: number; engagements: number; participants: Set<string> }>();

    const ensure = (name: string) => {
      if (!map.has(name)) map.set(name, { messages: 0, raids: 0, engagements: 0, participants: new Set() });
      return map.get(name)!;
    };

    // Count messages per community (use createdAt timestamp parsed from time field)
    for (const m of messages) {
      if (m.community === "general") continue;
      const entry = ensure(m.community);
      entry.messages++;
      entry.participants.add(m.user);
    }

    // Count raids per community
    for (const r of raids) {
      if (r.createdAt < cutoff) continue;
      const entry = ensure(r.community);
      entry.raids++;
    }

    // Count engagements per community (via raid -> community)
    for (const e of engagements) {
      if (e.at < cutoff) continue;
      const commName = raidToCommunity.get(e.raidId);
      if (!commName) continue;
      const entry = ensure(commName);
      entry.engagements++;
      entry.participants.add(e.user);
    }

    return Array.from(map.entries())
      .map(([name, stats]) => {
        const comm = communities.find((c) => c.name === name);
        return {
          name,
          ticker: comm?.ticker ?? name.slice(0, 6).toUpperCase(),
          messages: stats.messages,
          raids: stats.raids,
          engagements: stats.engagements,
          participants: stats.participants.size,
          // Weighted score: messages=1pt, engagements=2pt, raids=5pt
          score: stats.messages + stats.engagements * 2 + stats.raids * 5,
          rank: 0,
        };
      })
      .sort((a, b) => b.score - a.score)
      .map((l, i) => ({ ...l, rank: i + 1 }));
  }, [messages, raids, engagements, communities, leaderboardPeriod]);

  /* -- select community ------------------------------------------- */
  const selectCommunity = useCallback((ticker: string) => {
    setSelectedCommunity(ticker);
    if (ticker === "all") {
      setChatFilter("all");
    } else {
      const name = communities.find((c) => c.ticker === ticker)?.name ?? "all";
      setChatFilter(name);
    }
  }, [communities]);

  /* -- send chat message ------------------------------------------ */
  const sendMessage = useCallback((msg: string) => {
    if (!msg.trim()) return;
    // Must be signed in with X to chat
    if (!isSignedIn) return;
    // Require a specific community — no "general" bucket
    if (selectedCommunity === "all") return;
    const community = communities.find((c) => c.ticker === selectedCommunity)?.name;
    if (!community) return;

    const newMsg: ChatMessage = {
      id: nextMsgId,
      user: username,
      msg: msg.trim(),
      time: "now",
      community,
    };
    setMessages((prev) => [...prev, newMsg]);
    setNextMsgId((prev) => prev + 1);

    // Persist to DB (with auth token)
    (async () => {
      const token = await getAccessToken?.();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      fetch("/api/messages", {
        method: "POST",
        headers,
        body: JSON.stringify({ user: username, msg: msg.trim(), community }),
      }).catch(() => {});
    })();

    setActivity((prev) => [
      { user: username, action: "sent message in", target: community, time: "now" },
      ...prev.slice(0, 19),
    ]);
  }, [isSignedIn, selectedCommunity, communities, nextMsgId, username, getAccessToken]);

  /* -- engage raid ------------------------------------------------ */
  const engageRaid = useCallback((raidId: number, type: "like" | "retweet" | "reply") => {
    // Mark engagement time so polling skips during the PATCH window
    lastEngageRef.current = Date.now();

    setRaids((prev) =>
      prev.map((r) => {
        if (r.id !== raidId) return r;
        const already =
          type === "like" ? r.engagedLike :
          type === "retweet" ? r.engagedRT :
          r.engagedReply;
        if (already) return r;
        const isFirstEngagement = !r.engagedLike && !r.engagedRT && !r.engagedReply;
        // Update engagers map
        const prevTypes = r.engagers[username] ?? [];
        const updatedEngagers = {
          ...r.engagers,
          [username]: [...prevTypes, type],
        };
        return {
          ...r,
          likes: type === "like" ? r.likes + 1 : r.likes,
          retweets: type === "retweet" ? r.retweets + 1 : r.retweets,
          replies: type === "reply" ? r.replies + 1 : r.replies,
          engagedLike: type === "like" ? true : r.engagedLike,
          engagedRT: type === "retweet" ? true : r.engagedRT,
          engagedReply: type === "reply" ? true : r.engagedReply,
          participants: isFirstEngagement ? r.participants + 1 : r.participants,
          engagers: updatedEngagers,
        };
      })
    );

    // Record engagement with timestamp for leaderboard period filtering
    setEngagements((prev) => [
      ...prev,
      { user: username, type, raidId, at: Date.now() },
    ]);

    // Persist to DB, then immediately refresh from server for authoritative counts
    (async () => {
      try {
        const token = await getAccessToken?.();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch("/api/raids", {
          method: "PATCH",
          headers,
          body: JSON.stringify({ raidId, type, user: username }),
        });
        if (res.ok) {
          // PATCH succeeded — immediately fetch fresh data so counters are authoritative
          await fetchRaids();
        }
        // If PATCH fails (409 duplicate, 401 auth, etc.), the optimistic update
        // stays until the next poll cycle corrects it
      } catch {
        // Network error — optimistic update remains, next poll will correct
      }
    })();

    // push to activity
    const raid = raids.find((r) => r.id === raidId);
    setActivity((prev) => [
      { user: username, action: type === "like" ? "liked" : type === "retweet" ? "retweeted" : "replied to", target: raid?.author ?? "unknown", time: "now" },
      ...prev.slice(0, 19),
    ]);
  }, [raids, username, getAccessToken, fetchRaids]);

  /* -- create raid ------------------------------------------------ */
  const createRaid = useCallback((tweetUrl: string, targets?: { likes?: number; retweets?: number; replies?: number }, warCry?: string) => {
    if (!tweetUrl.trim()) return;
    const parsed = parseTweetUrl(tweetUrl.trim());
    if (!parsed) return; // invalid URL

    const comm = selectedCommunity === "all"
      ? communities[0]
      : communities.find((c) => c.ticker === selectedCommunity);
    if (!comm) return;
    const communityName = comm.name;
    const mint = comm.mint;

    const newRaid: Raid = {
      id: nextRaidId,
      community: communityName,
      mint,
      tweetUrl: tweetUrl.trim(),
      tweetId: parsed.tweetId,
      tweet: tweetUrl.trim(),
      author: parsed.author,
      authorName: undefined,
      authorAvatar: `https://unavatar.io/twitter/${parsed.author.replace(/^@/, "")}`,
      likes: 0,
      retweets: 0,
      replies: 0,
      target: {
        likes: targets?.likes ?? 100,
        retweets: targets?.retweets ?? 50,
        replies: targets?.replies ?? 25,
      },
      createdAt: Date.now(),
      engagedLike: false,
      engagedRT: false,
      engagedReply: false,
      participants: 0,
      engagers: {},
      warCry: warCry || undefined,
    };
    setRaids((prev) => [newRaid, ...prev]);
    setNextRaidId((prev) => prev + 1);

    // Persist to DB (with auth token) — server will enrich with oEmbed data
    (async () => {
      const token = await getAccessToken?.();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      try {
        const res = await fetch("/api/raids", {
          method: "POST",
          headers,
          body: JSON.stringify({
            community: communityName,
            mint,
            tweetUrl: tweetUrl.trim(),
            tweetId: parsed.tweetId,
            tweet: tweetUrl.trim(),
            author: parsed.author,
            targetLikes: targets?.likes ?? 100,
            targetRetweets: targets?.retweets ?? 50,
            targetReplies: targets?.replies ?? 25,
            warCry: warCry || undefined,
          }),
        });
        if (res.ok) {
          // Server enriches with oEmbed — refresh raids to get full tweet data
          await fetchRaids();
        }
      } catch { /* network error — optimistic local state persists */ }
    })();

    setActivity((prev) => [
      { user: username, action: "created raid for", target: communityName, time: "now" },
      ...prev.slice(0, 19),
    ]);
  }, [selectedCommunity, communities, nextRaidId, username, getAccessToken]);

  /* -- add community ---------------------------------------------- */
  const addCommunity = useCallback((ticker: string, name: string, mint: string) => {
    if (!ticker.trim() || !mint.trim()) return;
    if (communities.some((c) => c.ticker === ticker.toUpperCase())) return;
    if (communities.some((c) => c.mint === mint)) return;
    setCommunities((prev) => [
      ...prev,
      { ticker: ticker.toUpperCase(), name: name || `$${ticker.toUpperCase()}`, members: 1, active: true, mint },
    ]);
  }, [communities]);

  /* -- join community --------------------------------------------- */
  const joinCommunity = useCallback(async (ticker: string) => {
    // Optimistic update
    setJoinedCommunities((prev) => new Set(prev).add(ticker));
    setCommunities((prev) =>
      prev.map((c) => c.ticker === ticker ? { ...c, members: c.members + 1 } : c)
    );

    try {
      const token = await getAccessToken?.();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/communities/join", {
        method: "POST",
        headers,
        body: JSON.stringify({ ticker }),
      });
      if (!res.ok) {
        // Revert optimistic update
        setJoinedCommunities((prev) => {
          const next = new Set(prev);
          next.delete(ticker);
          return next;
        });
        setCommunities((prev) =>
          prev.map((c) => c.ticker === ticker ? { ...c, members: Math.max(0, c.members - 1) } : c)
        );
      } else {
        const data = await res.json();
        if (typeof data.members === "number") {
          setCommunities((prev) =>
            prev.map((c) => c.ticker === ticker ? { ...c, members: data.members } : c)
          );
        }
      }
    } catch {
      // Revert on network error
      setJoinedCommunities((prev) => {
        const next = new Set(prev);
        next.delete(ticker);
        return next;
      });
      setCommunities((prev) =>
        prev.map((c) => c.ticker === ticker ? { ...c, members: Math.max(0, c.members - 1) } : c)
      );
    }
  }, [getAccessToken]);

  /* -- leave community -------------------------------------------- */
  const leaveCommunity = useCallback(async (ticker: string) => {
    // Optimistic update
    setJoinedCommunities((prev) => {
      const next = new Set(prev);
      next.delete(ticker);
      return next;
    });
    setCommunities((prev) =>
      prev.map((c) => c.ticker === ticker ? { ...c, members: Math.max(0, c.members - 1) } : c)
    );

    try {
      const token = await getAccessToken?.();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/communities/join", {
        method: "DELETE",
        headers,
        body: JSON.stringify({ ticker }),
      });
      if (!res.ok) {
        // Revert
        setJoinedCommunities((prev) => new Set(prev).add(ticker));
        setCommunities((prev) =>
          prev.map((c) => c.ticker === ticker ? { ...c, members: c.members + 1 } : c)
        );
      } else {
        const data = await res.json();
        if (typeof data.members === "number") {
          setCommunities((prev) =>
            prev.map((c) => c.ticker === ticker ? { ...c, members: data.members } : c)
          );
        }
      }
    } catch {
      // Revert
      setJoinedCommunities((prev) => new Set(prev).add(ticker));
      setCommunities((prev) =>
        prev.map((c) => c.ticker === ticker ? { ...c, members: c.members + 1 } : c)
      );
    }
  }, [getAccessToken]);

  /* -- bulk-sync communities from token feed ---------------------- */
  const syncTokenCommunities = useCallback(
    (tokens: Array<{ address: string; name: string; symbol: string; image?: string; marketCapSol?: number; progressPercent?: number; complete?: boolean; realSolReserves?: number; tokenTotalSupply?: string; priceUsd?: number | null; priceChange24h?: number | null; volume24h?: number | null; liquidity?: number | null; fdv?: number | null; pairUrl?: string | null; txns24h?: { buys: number; sells: number } | null; createdAt?: number | null }>) => {
      setCommunities((prev) => {
        const existingMints = new Set(prev.map((c) => c.mint));
        const existingTickers = new Set(prev.map((c) => c.ticker));

        // Update existing communities with fresh token metadata
        let updated = prev.map((c) => {
          const token = tokens.find((t) => t.address === c.mint);
          if (!token) return c;
          return {
            ...c,
            image: token.image || c.image,
            marketCapSol: token.marketCapSol ?? c.marketCapSol,
            progressPercent: token.progressPercent ?? c.progressPercent,
            complete: token.complete ?? c.complete,
            realSolReserves: token.realSolReserves ?? c.realSolReserves,
            tokenTotalSupply: token.tokenTotalSupply || c.tokenTotalSupply,
            priceUsd: token.priceUsd ?? c.priceUsd,
            priceChange24h: token.priceChange24h ?? c.priceChange24h,
            volume24h: token.volume24h ?? c.volume24h,
            liquidity: token.liquidity ?? c.liquidity,
            fdv: token.fdv ?? c.fdv,
            pairUrl: token.pairUrl ?? c.pairUrl,
            txns24h: token.txns24h ?? c.txns24h,
            tokenCreatedAt: token.createdAt ?? c.tokenCreatedAt,
          };
        });

        const newCommunities: Community[] = [];
        for (const token of tokens) {
          if (existingMints.has(token.address)) continue;

          // Derive ticker from symbol or address
          let ticker = token.symbol
            ? token.symbol.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10)
            : "";
          // Fallback to address prefix if symbol is empty or non-alphanumeric
          if (!ticker) ticker = token.address.slice(0, 6).toUpperCase();

          // Ensure unique ticker
          let suffix = 1;
          const baseTicker = ticker;
          while (existingTickers.has(ticker)) {
            ticker = `${baseTicker}${suffix}`;
            suffix++;
          }
          existingTickers.add(ticker);
          existingMints.add(token.address);

          const name = token.name || `$${ticker}`;

          newCommunities.push({
            ticker,
            name,
            members: 0,
            active: true,
            mint: token.address,
            image: token.image,
            marketCapSol: token.marketCapSol,
            progressPercent: token.progressPercent,
            complete: token.complete,
            realSolReserves: token.realSolReserves,
            tokenTotalSupply: token.tokenTotalSupply,
            priceUsd: token.priceUsd,
            priceChange24h: token.priceChange24h,
            volume24h: token.volume24h,
            liquidity: token.liquidity,
            fdv: token.fdv,
            pairUrl: token.pairUrl,
            txns24h: token.txns24h,
            tokenCreatedAt: token.createdAt,
          });
        }

        if (newCommunities.length === 0) {
          // Still return updated if token metadata changed
          // Persist metadata updates (images, mcap, etc.) to DB for existing communities
          const toUpdate = tokens
            .filter((t) => existingMints.has(t.address) && t.image)
            .map((t) => ({ mint: t.address, image: t.image, marketCapSol: t.marketCapSol, complete: t.complete }));
          if (toUpdate.length > 0) {
            fetch("/api/communities", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ communities: toUpdate }),
            }).catch(() => {});
          }
          return updated;
        }

        // Persist new communities to DB (with image + metadata)
        fetch("/api/communities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            communities: newCommunities.map(({ ticker, name, mint, image, marketCapSol, complete }) => ({
              ticker, name, mint, image, marketCapSol, complete,
            })),
          }),
        }).catch(() => {});

        // Also persist metadata updates for existing communities
        const toUpdate = tokens
          .filter((t) => existingMints.has(t.address) && t.image)
          .map((t) => ({ mint: t.address, image: t.image, marketCapSol: t.marketCapSol, complete: t.complete }));
        if (toUpdate.length > 0) {
          fetch("/api/communities", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ communities: toUpdate }),
          }).catch(() => {});
        }

        return [...updated, ...newCommunities];
      });
    },
    []
  );

  /* -- get mint for a community name ------------------------------ */
  const getMintForCommunity = useCallback((communityName: string): string | null => {
    const comm = communities.find((c) => c.name === communityName);
    return comm?.mint ?? null;
  }, [communities]);

  return (
    <CommunityContext.Provider
      value={{
        communities,
        selectedCommunity,
        messages,
        raids,
        leaders,
        communityLeaders,
        activity,
        chatFilter,
        leaderboardPeriod,
        leaderboardMode,
        searchQuery,
        joinedCommunities,
        username,
        isSignedIn,
        isLoading,
        selectCommunity,
        sendMessage,
        setChatFilter,
        engageRaid,
        setLeaderboardPeriod,
        setLeaderboardMode,
        createRaid,
        addCommunity,
        getMintForCommunity,
        setSearchQuery,
        syncTokenCommunities,
        joinCommunity,
        leaveCommunity,
      }}
    >
      {children}
    </CommunityContext.Provider>
  );
}
