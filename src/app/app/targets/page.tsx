"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { usePrivySafe } from "@/hooks/usePrivySafe";
import { useCommunity } from "@/context/CommunityContext";
import { TARGET_ACCOUNTS } from "@/lib/targetAccounts";

/* ---- Types ---- */
interface Target {
  id: number;
  tweetUrl: string;
  tweetId: string;
  author: string;
  authorName?: string;
  authorAvatar?: string;
  tweetText?: string;
  submittedAt: number;
  upvotes: number;
  voted: boolean;
  raidId?: number;
}

type SortOption = "newest" | "top" | "hot";

/* ---- Helpers ---- */
function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function TargetsPage() {
  const { authenticated, getAccessToken, user } = usePrivySafe();
  const { communities, selectedCommunity, createRaid } = useCommunity();
  const xUsername = user?.twitter?.username ? `@${user.twitter.username}` : undefined;

  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [filterAuthor, setFilterAuthor] = useState<string | null>(null);
  const [votingIds, setVotingIds] = useState<Set<number>>(new Set());
  const [raidingId, setRaidingId] = useState<number | null>(null);
  const [raidCommunity, setRaidCommunity] = useState("");

  // Fetch targets
  const fetchTargets = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (xUsername) params.set("user", xUsername);
      const res = await fetch(`/api/targets?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTargets(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [xUsername]);

  useEffect(() => {
    fetchTargets();
    const interval = setInterval(fetchTargets, 30_000);
    return () => clearInterval(interval);
  }, [fetchTargets]);

  // Upvote/unvote
  const handleVote = async (targetId: number) => {
    if (votingIds.has(targetId)) return;
    setVotingIds((prev) => new Set(prev).add(targetId));

    setTargets((prev) =>
      prev.map((t) =>
        t.id === targetId
          ? { ...t, upvotes: t.voted ? t.upvotes - 1 : t.upvotes + 1, voted: !t.voted }
          : t
      )
    );

    try {
      const token = await getAccessToken?.();
      const res = await fetch("/api/targets", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ targetId }),
      });
      if (res.ok) {
        const data = await res.json();
        setTargets((prev) =>
          prev.map((t) => (t.id === targetId ? { ...t, upvotes: data.upvotes, voted: data.voted } : t))
        );
      } else {
        setTargets((prev) =>
          prev.map((t) =>
            t.id === targetId
              ? { ...t, upvotes: t.voted ? t.upvotes - 1 : t.upvotes + 1, voted: !t.voted }
              : t
          )
        );
      }
    } catch {
      setTargets((prev) =>
        prev.map((t) =>
          t.id === targetId
            ? { ...t, upvotes: t.voted ? t.upvotes - 1 : t.upvotes + 1, voted: !t.voted }
            : t
        )
      );
    } finally {
      setVotingIds((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
    }
  };

  // Raid from target
  const handleCreateRaid = (target: Target) => {
    setRaidingId(target.id);
    const defaultComm =
      selectedCommunity !== "all"
        ? selectedCommunity
        : communities[0]?.ticker ?? "";
    setRaidCommunity(defaultComm);
  };

  const confirmCreateRaid = () => {
    const target = targets.find((t) => t.id === raidingId);
    if (!target || !raidCommunity) return;
    createRaid(target.tweetUrl);
    setRaidingId(null);
    setRaidCommunity("");
    setTimeout(fetchTargets, 1000);
  };

  // Unique authors with tweet counts + avatar lookup
  const authorStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of targets) {
      const handle = t.author.replace("@", "").toLowerCase();
      map.set(handle, (map.get(handle) ?? 0) + 1);
    }
    return map;
  }, [targets]);

  const authorAvatars = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of targets) {
      const handle = t.author.replace("@", "").toLowerCase();
      if (t.authorAvatar && !map.has(handle)) {
        map.set(handle, t.authorAvatar);
      }
    }
    return map;
  }, [targets]);

  // Filter + sort
  const sorted = useMemo(() => {
    let filtered = targets;
    if (filterAuthor) {
      filtered = targets.filter(
        (t) => t.author.replace("@", "").toLowerCase() === filterAuthor.toLowerCase()
      );
    }
    const copy = [...filtered];
    switch (sortBy) {
      case "top":
        copy.sort((a, b) => b.upvotes - a.upvotes);
        break;
      case "hot":
        copy.sort((a, b) => {
          const ageA = (Date.now() - a.submittedAt) / (6 * 3600_000);
          const ageB = (Date.now() - b.submittedAt) / (6 * 3600_000);
          return b.upvotes / Math.max(1, ageB) - a.upvotes / Math.max(1, ageA);
        });
        break;
      default:
        copy.sort((a, b) => b.submittedAt - a.submittedAt);
    }
    return copy;
  }, [targets, sortBy, filterAuthor]);

  const noApiKey = !loading && targets.length === 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex gap-6">
        {/* Sidebar — monitored accounts */}
        <aside className="hidden w-56 shrink-0 md:block">
          <div className="sticky top-16 space-y-3">
            <div>
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">
                monitored accounts
              </h2>
              <div className="space-y-0.5">
                <button
                  onClick={() => setFilterAuthor(null)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                    !filterAuthor
                      ? "bg-accent/10 text-accent font-semibold"
                      : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                  }`}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-hover text-[9px] font-bold">
                    {targets.length}
                  </span>
                  all accounts
                </button>
                {TARGET_ACCOUNTS.map((handle) => {
                  const count = authorStats.get(handle.toLowerCase()) ?? 0;
                  const isActive = filterAuthor?.toLowerCase() === handle.toLowerCase();
                  return (
                    <button
                      key={handle}
                      onClick={() => setFilterAuthor(isActive ? null : handle)}
                      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                        isActive
                          ? "bg-accent/10 text-accent font-semibold"
                          : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                      }`}
                    >
                      {authorAvatars.get(handle.toLowerCase()) ? (
                        <img
                          src={authorAvatars.get(handle.toLowerCase())}
                          alt={handle}
                          width={18}
                          height={18}
                          className="rounded-full"
                        />
                      ) : (
                        <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-surface-hover text-[8px] font-bold uppercase text-text-muted">
                          {handle[0]}
                        </span>
                      )}
                      <span className="truncate">@{handle}</span>
                      {count > 0 && (
                        <span className="ml-auto shrink-0 rounded-full bg-surface-hover px-1.5 text-[9px] font-bold tabular-nums text-text-muted">
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        {/* Main feed */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-text-primary">targets</h1>
              <p className="text-xs text-text-muted mt-0.5">
                live feed from {TARGET_ACCOUNTS.length} monitored accounts
              </p>
            </div>
            <div className="flex gap-1">
              {(["newest", "hot", "top"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                    sortBy === s
                      ? "bg-accent/15 text-accent"
                      : "text-text-muted hover:text-text-secondary"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile account filter */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 md:hidden scrollbar-none">
            <button
              onClick={() => setFilterAuthor(null)}
              className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold transition-colors ${
                !filterAuthor
                  ? "bg-accent/15 text-accent"
                  : "bg-surface text-text-muted border border-border"
              }`}
            >
              all
            </button>
            {TARGET_ACCOUNTS.map((handle) => (
              <button
                key={handle}
                onClick={() =>
                  setFilterAuthor(
                    filterAuthor?.toLowerCase() === handle.toLowerCase() ? null : handle
                  )
                }
                className={`shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
                  filterAuthor?.toLowerCase() === handle.toLowerCase()
                    ? "bg-accent/15 text-accent"
                    : "bg-surface text-text-muted border border-border"
                }`}
              >
                {authorAvatars.get(handle.toLowerCase()) ? (
                  <img
                    src={authorAvatars.get(handle.toLowerCase())}
                    alt={handle}
                    width={14}
                    height={14}
                    className="rounded-full"
                  />
                ) : (
                  <span className="flex h-[14px] w-[14px] items-center justify-center rounded-full bg-surface-hover text-[7px] font-bold uppercase text-text-muted">
                    {handle[0]}
                  </span>
                )}
                @{handle}
              </button>
            ))}
          </div>

          {/* Feed */}
          {loading ? (
            <div className="flex flex-col items-center py-16">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              <p className="mt-3 text-xs text-text-muted">loading targets...</p>
            </div>
          ) : noApiKey ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface p-12 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
                <svg className="h-7 w-7 text-accent" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </div>
              <h2 className="text-sm font-bold text-text-primary">waiting for tweets</h2>
              <p className="mt-1 max-w-sm text-xs text-text-muted">
                monitoring {TARGET_ACCOUNTS.length} accounts. tweets will appear here once the X API feed is connected.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {TARGET_ACCOUNTS.slice(0, 8).map((h) => (
                  <a
                    key={h}
                    href={`https://x.com/${h}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-full border border-border bg-surface-hover px-2 py-0.5 text-[10px] text-text-secondary hover:text-accent transition-colors"
                  >
                    {authorAvatars.get(h.toLowerCase()) ? (
                      <img
                        src={authorAvatars.get(h.toLowerCase())}
                        alt={h}
                        width={14}
                        height={14}
                        className="rounded-full"
                      />
                    ) : (
                      <span className="flex h-[14px] w-[14px] items-center justify-center rounded-full bg-surface text-[7px] font-bold uppercase text-text-muted">
                        {h[0]}
                      </span>
                    )}
                    @{h}
                  </a>
                ))}
                {TARGET_ACCOUNTS.length > 8 && (
                  <span className="rounded-full border border-border bg-surface-hover px-2 py-0.5 text-[10px] text-text-muted">
                    +{TARGET_ACCOUNTS.length - 8} more
                  </span>
                )}
              </div>
            </div>
          ) : sorted.length === 0 && filterAuthor ? (
            <div className="rounded-xl border border-border bg-surface p-8 text-center">
              <p className="text-xs text-text-muted">
                no tweets from <span className="text-text-secondary font-medium">@{filterAuthor}</span> yet
              </p>
              <button
                onClick={() => setFilterAuthor(null)}
                className="mt-2 text-[10px] text-accent hover:underline"
              >
                show all accounts
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {sorted.map((target) => (
                <TargetCard
                  key={target.id}
                  target={target}
                  authenticated={authenticated}
                  onVote={() => handleVote(target.id)}
                  voting={votingIds.has(target.id)}
                  onRaid={() => handleCreateRaid(target)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Raid creation modal */}
      {raidingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-xl border border-border bg-surface p-5 space-y-4">
            <h3 className="text-sm font-bold text-text-primary">create raid from target</h3>
            <p className="text-xs text-text-muted">
              select which community should raid this tweet:
            </p>
            <select
              value={raidCommunity}
              onChange={(e) => setRaidCommunity(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs text-text-primary focus:border-accent focus:outline-none"
            >
              <option value="">select a community...</option>
              {communities.map((c) => (
                <option key={c.ticker} value={c.ticker}>
                  ${c.ticker} — {c.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setRaidingId(null);
                  setRaidCommunity("");
                }}
                className="rounded-lg px-4 py-2 text-xs font-medium text-text-muted hover:text-text-secondary transition-colors"
              >
                cancel
              </button>
              <button
                onClick={confirmCreateRaid}
                disabled={!raidCommunity}
                className="rounded-lg bg-accent px-4 py-2 text-xs font-bold text-background hover:bg-accent-hover transition-colors disabled:opacity-40"
              >
                create raid
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Target Card ---- */
function TargetCard({
  target,
  authenticated,
  onVote,
  voting,
  onRaid,
}: {
  target: Target;
  authenticated: boolean;
  onVote: () => void;
  voting: boolean;
  onRaid: () => void;
}) {
  const hasRaid = !!target.raidId;

  return (
    <div className="group rounded-xl border border-border bg-surface transition-colors hover:border-border/80">
      <div className="flex">
        {/* Upvote column */}
        <div className="flex flex-col items-center justify-start border-r border-border px-3 py-3">
          <button
            onClick={() => authenticated && onVote()}
            disabled={!authenticated || voting}
            className={`flex flex-col items-center gap-0.5 transition-colors ${
              target.voted
                ? "text-accent"
                : authenticated
                ? "text-text-muted hover:text-accent"
                : "text-text-muted/50 cursor-not-allowed"
            }`}
            title={authenticated ? (target.voted ? "remove vote" : "upvote") : "sign in to vote"}
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill={target.voted ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
            </svg>
            <span className="text-xs font-bold tabular-nums">{target.upvotes}</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 px-4 py-3 min-w-0">
          {/* Author line */}
          <div className="flex items-center gap-2 mb-1.5">
            {target.authorAvatar ? (
              <img
                src={target.authorAvatar}
                alt={target.author}
                width={20}
                height={20}
                className="rounded-full"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            ) : (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-hover text-[9px] font-bold uppercase text-text-muted">
                {target.author.replace("@", "")[0]}
              </span>
            )}
            <div className="flex items-center gap-1.5 min-w-0">
              {target.authorName && (
                <a
                  href={`https://x.com/${target.author.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-text-primary truncate hover:text-accent transition-colors"
                >
                  {target.authorName}
                </a>
              )}
              <a
                href={`https://x.com/${target.author.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-text-muted truncate hover:text-accent transition-colors"
              >
                {target.author}
              </a>
            </div>
            <span className="ml-auto shrink-0 text-[10px] text-text-muted">
              {timeAgo(target.submittedAt)}
            </span>
          </div>

          {/* Tweet text */}
          {target.tweetText ? (
            <p className="text-xs text-text-secondary leading-relaxed line-clamp-4 mb-2">
              {target.tweetText}
            </p>
          ) : (
            <p className="text-xs text-text-muted italic mb-2">tweet content unavailable</p>
          )}

          {/* Footer */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* View on X */}
            <a
              href={target.tweetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-text-muted hover:text-secondary transition-colors"
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              view on X
            </a>

            {/* Raid status / create raid button */}
            <div className="ml-auto">
              {hasRaid ? (
                <span className="flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-bold text-accent">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                  raiding
                </span>
              ) : authenticated ? (
                <button
                  onClick={onRaid}
                  className="flex items-center gap-1 rounded-full border border-accent/30 bg-accent/5 px-2.5 py-1 text-[10px] font-bold text-accent transition-colors hover:bg-accent/15"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                  raid this
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
