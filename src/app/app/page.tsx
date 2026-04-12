"use client";

import { useMemo } from "react";
import { useCommunity } from "@/context/CommunityContext";
import TokenFeed from "@/components/TokenFeed";
import ErrorBoundary from "@/components/ErrorBoundary";
import Link from "next/link";

/* ---- formatting helpers ---- */
function fmtUsd(n: number | null | undefined): string {
  if (n == null || n === 0) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.0001) return `$${n.toFixed(4)}`;
  return `$${n.toExponential(2)}`;
}

function fmtSol(n: number | null | undefined): string {
  if (n == null || n === 0) return "—";
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} SOL`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

function fmtCompact(n: number | null | undefined): string {
  if (n == null || n === 0) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function timeAgo(ts: number | null | undefined): string {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function CommunitiesPage() {
  const { communities, messages, raids, communityLeaders, searchQuery, isLoading } = useCommunity();

  // Build stats per community
  const communityStats = useMemo(() => {
    const stats = new Map<string, { messages: number; raids: number; participants: Set<string> }>();

    for (const m of messages) {
      if (!stats.has(m.community)) stats.set(m.community, { messages: 0, raids: 0, participants: new Set() });
      stats.get(m.community)!.messages++;
      stats.get(m.community)!.participants.add(m.user);
    }
    for (const r of raids) {
      if (!stats.has(r.community)) stats.set(r.community, { messages: 0, raids: 0, participants: new Set() });
      stats.get(r.community)!.raids++;
    }

    return stats;
  }, [messages, raids]);

  const enriched = useMemo(() => {
    return communities
      .filter((c) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.ticker.toLowerCase().includes(q);
      })
      .map((c) => {
        const s = communityStats.get(c.name);
        const leader = communityLeaders.find((l) => l.ticker === c.ticker);
        return {
          ...c,
          msgCount: s?.messages ?? 0,
          raidCount: s?.raids ?? 0,
          participantCount: s?.participants?.size ?? 0,
          score: leader?.score ?? 0,
          rank: leader?.rank ?? 999,
        };
      });
  }, [communities, communityStats, communityLeaders, searchQuery]);

  const mostActive = useMemo(() => {
    return [...enriched]
      .filter((c) => c.score > 0 || c.msgCount > 0 || c.raidCount > 0)
      .sort((a, b) => b.score - a.score || b.msgCount - a.msgCount)
      .slice(0, 6);
  }, [enriched]);

  const newest = useMemo(() => {
    const activeSet = new Set(mostActive.map((c) => c.ticker));
    return [...enriched]
      .filter((c) => !activeSet.has(c.ticker))
      .sort((a, b) => (b.tokenCreatedAt ?? 0) - (a.tokenCreatedAt ?? 0));
  }, [enriched, mostActive]);

  const renderCard = (c: (typeof enriched)[number]) => (
    <Link
      key={c.ticker}
      href={`/app/community/${c.ticker}`}
      className="group flex gap-3 rounded-xl border border-border bg-surface p-3 transition-all hover:border-accent/40 hover:bg-surface-hover"
    >
      {/* Left: token image */}
      {c.image ? (
        <img
          src={c.image}
          alt={c.name}
          className="h-12 w-12 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-sm font-bold text-accent">
          {c.ticker.slice(0, 2)}
        </div>
      )}

      {/* Right: info */}
      <div className="min-w-0 flex-1">
        {/* Row 1: name + status badge */}
        <div className="flex items-center justify-between gap-1.5">
          <p className="truncate text-sm font-bold text-text-primary group-hover:text-accent transition-colors">
            {c.name}
          </p>
          {c.complete !== undefined && (
            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[8px] font-bold leading-none ${
              c.complete
                ? "bg-accent/15 text-accent"
                : "bg-yellow-500/15 text-yellow-400"
            }`}>
              {c.complete ? "GRADUATED" : "BONDING"}
            </span>
          )}
        </div>

        {/* Row 2: ticker + rank + time */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] text-text-muted font-mono">${c.ticker}</span>
          {c.rank <= 3 && (
            <span className={`rounded px-1 py-0.5 text-[8px] font-bold leading-none ${
              c.rank === 1 ? "bg-yellow-500/15 text-yellow-400" :
              c.rank === 2 ? "bg-gray-400/15 text-gray-300" :
              "bg-orange-500/15 text-orange-400"
            }`}>
              #{c.rank}
            </span>
          )}
          {c.tokenCreatedAt ? (
            <span className="text-[9px] text-text-muted ml-auto">{timeAgo(c.tokenCreatedAt)}</span>
          ) : null}
        </div>

        {/* Row 3: market cap + 24h change */}
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="text-sm font-bold text-text-primary">
            {c.fdv ? fmtUsd(c.fdv) : c.marketCapSol ? fmtSol(c.marketCapSol) : "—"}
          </span>
          {c.priceChange24h != null && (
            <span className={`text-[10px] font-bold ${c.priceChange24h >= 0 ? "text-accent" : "text-red-400"}`}>
              {fmtPct(c.priceChange24h)}
            </span>
          )}
        </div>

        {/* Row 4: key stats inline */}
        <div className="mt-1 flex items-center gap-2 text-[9px] text-text-muted">
          {c.holders != null && c.holders > 0 && (
            <span>{fmtCompact(c.holders)} holders</span>
          )}
          {c.volume24h != null && c.volume24h > 0 && (
            <span>{fmtUsd(c.volume24h)} vol</span>
          )}
          {c.liquidity != null && c.liquidity > 0 && (
            <span>{fmtUsd(c.liquidity)} liq</span>
          )}
        </div>

        {/* Bonding curve progress bar */}
        {c.progressPercent !== undefined && !c.complete && (
          <div className="mt-1.5">
            <div className="h-1 w-full rounded-full bg-background overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${Math.min(c.progressPercent, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </Link>
  );

  return (
    <div className="p-3 lg:p-4 space-y-4 animate-page-in">
      {/* Page header */}
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-lg font-bold text-text-primary">communities</h1>
          <p className="text-[11px] text-text-muted mt-0.5">join a community to chat and raid together</p>
        </div>
        <span className="text-[10px] text-text-muted">{enriched.length} communities</span>
      </div>

      {/* Loading / empty state */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-border bg-surface p-3 h-28" />
          ))}
        </div>
      ) : enriched.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <p className="text-sm text-text-muted">
            {searchQuery ? "no communities match your search" : "no communities yet — tokens will auto-create them"}
          </p>
        </div>
      ) : (
        <>
          {/* Most Active */}
          {mostActive.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider">most active</h2>
                <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[9px] font-bold text-accent">{mostActive.length}</span>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {mostActive.map((c) => renderCard(c))}
              </div>
            </div>
          )}

          {/* Newest */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider">newest</h2>
              <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[9px] font-bold text-accent">{newest.length}</span>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {newest.map((c) => renderCard(c))}
            </div>
          </div>
        </>
      )}

      {/* Token Feed */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider">new tokens</h2>
          <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[9px] font-bold text-accent">LIVE</span>
        </div>
        <ErrorBoundary>
          <TokenFeed />
        </ErrorBoundary>
      </div>
    </div>
  );
}
