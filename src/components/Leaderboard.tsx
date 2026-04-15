"use client";

import { useCommunity } from "@/context/CommunityContext";

export default function Leaderboard() {
  const {
    leaders,
    communityLeaders,
    leaderboardPeriod,
    setLeaderboardPeriod,
    leaderboardMode,
    setLeaderboardMode,
    selectCommunity,
    isLoading,
  } = useCommunity();

  return (
    <div className="rounded-xl border border-border bg-surface">
      {/* Header */}
      <div className="border-b border-border px-4 py-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wide">
            leaderboard
          </h3>
          <div className="flex gap-1">
            {(["24h", "7d", "all"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setLeaderboardPeriod(t)}
                className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                  leaderboardPeriod === t
                    ? "bg-accent/10 text-accent"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        {/* Mode toggle */}
        <div className="mt-1.5 flex gap-1">
          {(["communities", "users"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setLeaderboardMode(m)}
              className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                leaderboardMode === m
                  ? "bg-accent/15 text-accent"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Community leaderboard */}
      {leaderboardMode === "communities" && (
        <div className="divide-y divide-border">
          {isLoading ? (
            <div className="px-4 py-6 text-center">
              <div className="inline-block h-4 w-4 animate-smooth-spin rounded-full border-2 border-accent border-t-transparent" />
              <p className="mt-2 text-xs text-text-muted">loading...</p>
            </div>
          ) : communityLeaders.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-text-muted">
                no community activity yet. send messages and engage in raids to compete.
              </p>
            </div>
          ) : (
            communityLeaders.map((c) => (
              <button
                key={c.ticker}
                onClick={() => selectCommunity(c.ticker)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-hover"
              >
                {/* Rank badge */}
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-[10px] font-bold ${
                    c.rank === 1
                      ? "bg-yellow-500/15 text-yellow-400"
                      : c.rank === 2
                      ? "bg-gray-400/15 text-gray-300"
                      : c.rank === 3
                      ? "bg-orange-500/15 text-orange-400"
                      : "bg-background text-text-muted"
                  }`}
                >
                  {c.rank}
                </span>

                {/* Community avatar */}
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent/10 text-[9px] font-bold text-accent">
                  {c.ticker.slice(0, 2)}
                </div>

                {/* Name + stats */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-text-primary">{c.name}</p>
                  <div className="flex items-center gap-2 text-[10px] text-text-muted">
                    <span>{c.messages} msgs</span>
                    <span className="text-text-muted/40">|</span>
                    <span>{c.raids} raids</span>
                    <span className="text-text-muted/40">|</span>
                    <span>{c.engagements} engaged</span>
                    <span className="text-text-muted/40">|</span>
                    <span>{c.participants} users</span>
                  </div>
                </div>

                {/* Score */}
                <div className="text-right">
                  <p className="text-sm font-bold text-accent">{c.score.toLocaleString()}</p>
                  <p className="text-[9px] text-text-muted">pts</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* User leaderboard */}
      {leaderboardMode === "users" && (
        <div className="divide-y divide-border">
          {isLoading ? (
            <div className="px-4 py-6 text-center">
              <div className="inline-block h-4 w-4 animate-smooth-spin rounded-full border-2 border-accent border-t-transparent" />
              <p className="mt-2 text-xs text-text-muted">loading...</p>
            </div>
          ) : leaders.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-text-muted">no engagement data yet. participate in raids to appear here.</p>
            </div>
          ) : (
            leaders.map((l) => (
              <div
                key={l.user}
                className="flex items-center gap-3 px-4 py-2 transition-colors hover:bg-surface-hover"
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold ${
                    l.rank <= 3
                      ? "bg-accent/15 text-accent"
                      : "bg-background text-text-muted"
                  }`}
                >
                  {l.rank}
                </span>
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/10 text-[9px] font-bold text-accent">
                  {l.user.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-text-primary">{l.user}</p>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-text-muted">
                  <span>{l.likes} likes</span>
                  <span>{l.retweets} rt</span>
                  <span>{l.replies} replies</span>
                </div>
                <span className="ml-1 text-xs font-bold text-accent">{l.score.toLocaleString()}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
