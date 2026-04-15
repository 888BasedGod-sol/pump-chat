"use client";

import { useMemo, useEffect, useState, useCallback } from "react";
import { useCommunity } from "@/context/CommunityContext";
import TokenImage from "@/components/TokenImage";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

type FilterTab = "all" | "joined";
type SortOption = "active" | "mcap" | "newest" | "members";

export default function CommunitiesPage() {
  const { communities, messages, raids, communityLeaders, searchQuery, isLoading, joinedCommunities } = useCommunity();
  const router = useRouter();
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [sortBy, setSortBy] = useState<SortOption>("active");

  // Detect Solana address (base58, 32-50 chars)
  const isSolanaAddress = useCallback((q: string) => /^[1-9A-HJ-NP-Za-km-z]{32,50}$/.test(q.trim()), []);

  // Reset lookup error when search changes
  useEffect(() => { setLookupError(""); }, [searchQuery]);

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

  // Enrich, filter, sort
  const enriched = useMemo(() => {
    const MIN_MCAP_USD = 3000;
    const q = searchQuery?.toLowerCase() ?? "";

    return communities
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
        // Text search
        if (q) {
          const match = c.name.toLowerCase().includes(q) || c.ticker.toLowerCase().includes(q) || c.mint.toLowerCase().includes(q);
          if (!match) return false;
        }
        // Tab filter
        if (filterTab === "joined" && !joinedCommunities.has(c.ticker)) return false;
        // Min mcap gate (skip when searching or on "joined" tab)
        if (!q && filterTab !== "joined") {
          if (c.msgCount > 0 || c.raidCount > 0 || c.members > 0) return true;
          if (joinedCommunities.has(c.ticker)) return true;
          if (c.fdv != null && c.fdv >= MIN_MCAP_USD) return true;
          if (c.marketCapSol != null && c.marketCapSol * 150 >= MIN_MCAP_USD) return true;
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "mcap":
            return (b.fdv ?? b.marketCapSol ?? 0) - (a.fdv ?? a.marketCapSol ?? 0);
          case "newest":
            return (b.tokenCreatedAt ?? 0) - (a.tokenCreatedAt ?? 0);
          case "members":
            return b.members - a.members;
          case "active":
          default:
            return b.score - a.score || b.msgCount - a.msgCount || b.raidCount - a.raidCount || b.members - a.members;
        }
      });
  }, [communities, communityStats, communityLeaders, searchQuery, joinedCommunities, filterTab, sortBy]);

  // Contract address detection
  const searchIsAddress = searchQuery ? isSolanaAddress(searchQuery) : false;
  const hasLocalMatch = searchIsAddress && enriched.length > 0;

  const handleLookup = useCallback(() => {
    if (!searchQuery || lookingUp) return;
    setLookupError("");
    setLookingUp(true);
    fetch(`/api/communities/lookup?mint=${encodeURIComponent(searchQuery.trim())}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data) => {
        if (data?.ticker) router.push(`/app/community/${data.ticker}`);
        else setLookupError("Token not found on-chain");
      })
      .catch(() => setLookupError("Could not find this token"))
      .finally(() => setLookingUp(false));
  }, [searchQuery, lookingUp, router]);

  // Auto-trigger lookup for addresses with no local match
  useEffect(() => {
    if (searchIsAddress && !hasLocalMatch && !lookingUp && !lookupError) {
      handleLookup();
    }
  }, [searchIsAddress, hasLocalMatch, lookingUp, lookupError, handleLookup]);

  // Tab counts
  const tabCounts = useMemo(() => {
    let joined = 0;
    for (const c of communities) {
      if (joinedCommunities.has(c.ticker)) joined++;
    }
    return { joined };
  }, [communities, joinedCommunities]);

  const filterTabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: "all", label: "all" },
    { key: "joined", label: "joined", count: tabCounts.joined },
  ];

  const sortOptions: { key: SortOption; label: string }[] = [
    { key: "active", label: "most active" },
    { key: "mcap", label: "market cap" },
    { key: "newest", label: "newest" },
    { key: "members", label: "members" },
  ];

  const renderCard = (c: (typeof enriched)[number]) => (
    <Link
      key={c.ticker}
      href={`/app/community/${c.ticker}`}
      className="group relative flex flex-col rounded-xl border border-border bg-surface overflow-hidden transition-all hover:border-accent/50 hover:bg-surface-hover hover:shadow-[0_0_20px_-5px_var(--color-accent-glow)]"
    >
      {/* Subtle top accent line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent group-hover:via-accent/60 transition-all" />
      <div className="flex items-center gap-3 p-3 pb-0">
        <TokenImage src={c.image} ticker={c.ticker} alt={c.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-bold text-text-primary group-hover:text-accent transition-colors">
              {c.name}
            </p>
            {c.rank <= 3 && (
              <span className={`shrink-0 rounded px-1 py-0.5 text-[8px] font-bold leading-none ${
                c.rank === 1 ? "bg-yellow-400/20 text-yellow-300 shadow-[0_0_6px_rgba(250,204,21,0.2)]" :
                c.rank === 2 ? "bg-gray-400/15 text-gray-300" :
                "bg-orange-400/20 text-orange-300"
              }`}>
                #{c.rank}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-text-muted font-mono">${c.ticker}</span>
            {c.complete && (
              <span className="rounded px-1 py-0.5 text-[8px] font-bold leading-none bg-accent/20 text-accent">
                GRADUATED
              </span>
            )}
            {joinedCommunities.has(c.ticker) && (
              <span className="rounded px-1 py-0.5 text-[8px] font-bold leading-none bg-secondary/20 text-secondary">
                JOINED
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-bold text-text-primary">
            {c.fdv ? fmtUsd(c.fdv) : c.marketCapSol ? fmtSol(c.marketCapSol) : "—"}
          </p>
          {c.priceChange24h != null && (
            <p className={`text-[10px] font-bold ${c.priceChange24h >= 0 ? "text-accent" : "text-danger"}`}>
              {fmtPct(c.priceChange24h)}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 px-3 pt-2.5 pb-2 text-[10px] text-text-muted">
        <span className="flex items-center gap-1 text-secondary/70 group-hover:text-secondary transition-colors">
          <svg className="h-3 w-3 drop-shadow-[0_0_3px_var(--color-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <span className="font-semibold text-text-secondary">{c.members}</span>
        </span>
        <span className="flex items-center gap-1 text-accent/70 group-hover:text-accent transition-colors">
          <svg className="h-3 w-3 drop-shadow-[0_0_3px_var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          <span className="font-semibold text-text-secondary">{c.msgCount}</span>
        </span>
        <span className="flex items-center gap-1 text-yellow-400/70 group-hover:text-yellow-400 transition-colors">
          <svg className="h-3 w-3 drop-shadow-[0_0_3px_rgba(250,204,21,0.4)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          <span className="font-semibold text-text-secondary">{c.raidCount}</span>
        </span>
        {c.holders != null && c.holders > 0 && (
          <span className="ml-auto text-[9px]">{fmtCompact(c.holders)} holders</span>
        )}
        {c.tokenCreatedAt ? (
          <span className="text-[9px]">{timeAgo(c.tokenCreatedAt)}</span>
        ) : null}
      </div>

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
    <div className="p-3 lg:p-4 space-y-3 animate-page-in">
      {/* ── Contract address lookup banner ── */}
      {searchIsAddress && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-3 flex items-center gap-3">
          {lookingUp ? (
            <>
              <div className="h-5 w-5 animate-smooth-spin rounded-full border-2 border-accent border-t-transparent shrink-0" />
              <p className="text-sm text-text-secondary">looking up token on-chain...</p>
            </>
          ) : lookupError ? (
            <>
              <svg className="h-5 w-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm text-text-muted flex-1">{lookupError}</p>
              <button onClick={handleLookup} className="text-xs font-bold text-accent hover:underline shrink-0">
                retry
              </button>
            </>
          ) : hasLocalMatch ? (
            <>
              <svg className="h-5 w-5 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-text-secondary flex-1">community found</p>
            </>
          ) : null}
        </div>
      )}

      {/* ── Filter tabs + Sort ── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 overflow-x-auto">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterTab(tab.key)}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all whitespace-nowrap ${
                filterTab === tab.key
                  ? "bg-accent/15 text-accent shadow-[0_0_8px_-2px_var(--color-accent-glow)]"
                  : "text-text-muted hover:text-text-secondary hover:bg-surface-hover"
              }`}
            >
              {tab.label}
              {tab.count != null && tab.count > 0 && (
                <span className={`ml-1 ${filterTab === tab.key ? "text-accent/60" : "text-text-muted/50"}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-text-muted hidden sm:inline">{enriched.length} found</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="rounded-lg border border-border bg-surface px-2 py-1.5 text-[11px] font-medium text-text-secondary cursor-pointer focus:outline-none focus:border-accent"
          >
            {sortOptions.map((opt) => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-border bg-surface p-3 h-28" />
          ))}
        </div>
      ) : enriched.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center space-y-2">
          {lookingUp ? (
            <div className="flex flex-col items-center gap-2">
              <div className="h-5 w-5 animate-smooth-spin rounded-full border-2 border-accent border-t-transparent" />
              <p className="text-sm text-text-muted">looking up token on-chain...</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-text-muted">
                {searchQuery
                  ? "no communities match your search"
                  : filterTab === "joined"
                  ? "you haven't joined any communities yet"
                  : "no communities found"}
              </p>
              {!searchQuery && (
                <p className="text-[11px] text-text-muted/60">
                  paste a contract address in the search bar to add any Solana token
                </p>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {enriched.map((c) => renderCard(c))}
        </div>
      )}
    </div>
  );
}
