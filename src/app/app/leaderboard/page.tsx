"use client";

import { useCommunity } from "@/context/CommunityContext";
import Link from "next/link";

export default function LeaderboardPage() {
  const {
    communityLeaders,
    leaderboardPeriod,
    setLeaderboardPeriod,
    isLoading,
  } = useCommunity();

  return (
    <div className="p-4 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-text-primary">leaderboard</h1>
          <p className="text-xs text-text-muted mt-0.5">most active communities competing for the top</p>
        </div>
        <div className="flex gap-1">
          {(["24h", "7d", "all"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setLeaderboardPeriod(t)}
              className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                leaderboardPeriod === t
                  ? "bg-accent/15 text-accent"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        {isLoading ? (
          <div className="px-4 py-12 text-center">
            <div className="inline-block h-5 w-5 animate-smooth-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="mt-3 text-xs text-text-muted">loading leaderboard...</p>
          </div>
        ) : communityLeaders.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm text-text-muted">
              no community activity yet. join a community and start chatting & raiding to compete.
            </p>
            <Link href="/app" className="mt-3 inline-block rounded-md bg-accent px-4 py-2 text-xs font-bold text-background hover:bg-accent-hover transition-colors">
              browse communities
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {/* Column headers */}
            <div className="flex items-center gap-3 px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-text-muted bg-surface-hover/50">
              <span className="w-8 text-center">#</span>
              <span className="flex-1">community</span>
              <span className="w-16 text-center hidden sm:block">msgs</span>
              <span className="w-16 text-center hidden sm:block">raids</span>
              <span className="w-16 text-center hidden sm:block">engaged</span>
              <span className="w-16 text-center hidden sm:block">users</span>
              <span className="w-20 text-right">score</span>
            </div>

            {communityLeaders.map((c) => (
              <Link
                key={c.ticker}
                href={`/app/community/${c.ticker}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-hover group"
              >
                {/* Rank */}
                <span
                  className={`flex h-7 w-8 shrink-0 items-center justify-center rounded text-xs font-bold ${
                    c.rank === 1
                      ? "bg-yellow-500/15 text-yellow-400"
                      : c.rank === 2
                      ? "bg-gray-400/15 text-gray-300"
                      : c.rank === 3
                      ? "bg-orange-500/15 text-orange-400"
                      : "text-text-muted"
                  }`}
                >
                  {c.rank}
                </span>

                {/* Avatar + name */}
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-[10px] font-bold text-accent">
                    {c.ticker.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary group-hover:text-accent transition-colors">
                      {c.name}
                    </p>
                    <p className="text-[10px] text-text-muted font-mono">${c.ticker}</p>
                    {/* Mobile-only compact stats row */}
                    <div className="flex items-center gap-2 mt-0.5 sm:hidden">
                      <span className="text-[9px] text-text-muted">{c.messages} msgs</span>
                      <span className="text-[9px] text-text-muted">{c.raids} raids</span>
                      <span className="text-[9px] text-text-muted">{c.engagements} eng</span>
                    </div>
                  </div>
                </div>

                {/* Stats columns — hidden on mobile, shown on sm+ */}
                <span className="w-16 text-center text-xs text-text-secondary hidden sm:block">{c.messages}</span>
                <span className="w-16 text-center text-xs text-text-secondary hidden sm:block">{c.raids}</span>
                <span className="w-16 text-center text-xs text-text-secondary hidden sm:block">{c.engagements}</span>
                <span className="w-16 text-center text-xs text-text-secondary hidden sm:block">{c.participants}</span>

                {/* Score */}
                <div className="w-20 text-right">
                  <p className="text-sm font-bold text-accent">{c.score.toLocaleString()}</p>
                  <p className="text-[9px] text-text-muted">pts</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Scoring explainer */}
      <div className="rounded-lg border border-border bg-surface/50 p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">how scoring works</p>
        <div className="flex gap-6 text-[11px] text-text-secondary">
          <span><span className="font-bold text-accent">1 pt</span> per message</span>
          <span><span className="font-bold text-accent">2 pts</span> per engagement</span>
          <span><span className="font-bold text-accent">5 pts</span> per raid</span>
        </div>
      </div>
    </div>
  );
}
