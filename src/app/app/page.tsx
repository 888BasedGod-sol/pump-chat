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
  const { communities, messages, raids, communityLeaders, searchQuery, isLoading, joinedCommunities } = useCommunity();

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
    const MIN_MCAP_USD = 3000;

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
      })
      .filter((c) => {
        // Always show communities with activity or that the user joined
        if (c.msgCount > 0 || c.raidCount > 0 || c.members > 0) return true;
        if (joinedCommunities.has(c.ticker)) return true;
        // Otherwise require minimum market cap
        if (c.fdv != null && c.fdv >= MIN_MCAP_USD) return true;
        // Rough SOL→USD estimate (~$150/SOL) for communities only having SOL mcap
        if (c.marketCapSol != null && c.marketCapSol * 150 >= MIN_MCAP_USD) return true;
        return false;
      });
  }, [communities, communityStats, communityLeaders, searchQuery, joinedCommunities]);

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
      className="group relative flex flex-col rounded-xl border border-border bg-surface overflow-hidden transition-all hover:border-accent/40 hover:bg-surface-hover"
    >
      {/* Header row */}
      <div className="flex items-center gap-3 p-3 pb-0">
        {c.image ? (
          <img
            src={c.image}
            alt={c.name}
            className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-border"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-xs font-bold text-accent ring-1 ring-accent/20">
            {c.ticker.slice(0, 2)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-bold text-text-primary group-hover:text-accent transition-colors">
              {c.name}
            </p>
            {c.rank <= 3 && (
              <span className={`shrink-0 rounded px-1 py-0.5 text-[8px] font-bold leading-none ${
                c.rank === 1 ? "bg-yellow-500/15 text-yellow-400" :
                c.rank === 2 ? "bg-gray-400/15 text-gray-300" :
                "bg-orange-500/15 text-orange-400"
              }`}>
                #{c.rank}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-text-muted font-mono">${c.ticker}</span>
            {c.complete !== undefined && (
              <span className={`rounded px-1 py-0.5 text-[8px] font-bold leading-none ${
                c.complete
                  ? "bg-accent/15 text-accent"
                  : "bg-yellow-500/15 text-yellow-400"
              }`}>
                {c.complete ? "GRADUATED" : "BONDING"}
              </span>
            )}
            {joinedCommunities.has(c.ticker) && (
              <span className="rounded px-1 py-0.5 text-[8px] font-bold leading-none bg-accent/15 text-accent">
                JOINED
              </span>
            )}
          </div>
        </div>

        {/* Price / mcap */}
        <div className="shrink-0 text-right">
          <p className="text-xs font-bold text-text-primary">
            {c.fdv ? fmtUsd(c.fdv) : c.marketCapSol ? fmtSol(c.marketCapSol) : "—"}
          </p>
          {c.priceChange24h != null && (
            <p className={`text-[10px] font-bold ${c.priceChange24h >= 0 ? "text-accent" : "text-red-400"}`}>
              {fmtPct(c.priceChange24h)}
            </p>
          )}
        </div>
      </div>

      {/* Community stats row */}
      <div className="flex items-center gap-3 px-3 pt-2.5 pb-2 text-[10px] text-text-muted">
        <span className="flex items-center gap-1">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <span className="font-medium text-text-secondary">{c.members}</span>
        </span>
        <span className="flex items-center gap-1">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          <span className="font-medium text-text-secondary">{c.msgCount}</span>
        </span>
        <span className="flex items-center gap-1">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          <span className="font-medium text-text-secondary">{c.raidCount}</span>
        </span>
        {c.holders != null && c.holders > 0 && (
          <span className="ml-auto text-[9px]">{fmtCompact(c.holders)} holders</span>
        )}
        {c.tokenCreatedAt ? (
          <span className="text-[9px]">{timeAgo(c.tokenCreatedAt)}</span>
        ) : null}
      </div>

      {/* Bonding curve progress */}
      {c.progressPercent !== undefined && !c.complete && (
        <div className="px-3 pb-2.5">
          <div className="h-1 w-full rounded-full bg-background overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${Math.min(c.progressPercent, 100)}%` }}
            />
          </div>
        </div>
      )}
    </Link>
  );

  return (
    <div className="p-3 lg:p-4 space-y-4 animate-page-in">
      {/* Page header */}
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-lg font-bold text-text-primary">Communities</h1>
          <p className="text-[11px] text-text-muted mt-0.5">Join a community to chat and raid together</p>
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
                <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Most Active</h2>
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
                <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider">All Communities</h2>
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
          <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider">New Tokens</h2>
          <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[9px] font-bold text-accent">LIVE</span>
        </div>
        <ErrorBoundary>
          <TokenFeed />
        </ErrorBoundary>
      </div>
    </div>
  );
}
