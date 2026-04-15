"use client";

import { use, useEffect, useState } from "react";
import { useCommunity } from "@/context/CommunityContext";
import CommunityChat from "@/components/CommunityChat";
import RaidPanel from "@/components/RaidPanel";
import ErrorBoundary from "@/components/ErrorBoundary";
import TokenImage from "@/components/TokenImage";
import VoiceRoom from "@/components/VoiceRoom";
import LeaderVote from "@/components/LeaderVote";
import LeaderSettings from "@/components/LeaderSettings";
import Link from "next/link";

/* ---- helpers ---- */
function fmtUsd(n: number | null | undefined): string {
  if (n == null || n === 0) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
}
function fmtCompact(n: number | null | undefined): string {
  if (n == null || n === 0) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}
function fmtPrice(n: number | null | undefined): string {
  if (n == null || n === 0) return "—";
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toPrecision(4)}`;
}
function timeAgo(ts: number | null | undefined): string {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
function CopyIcon() {
  return (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}
function ExternalIcon() {
  return (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

export default function CommunityPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = use(params);
  const { communities, selectCommunity, communityLeaders, messages, raids, joinedCommunities, joinCommunity, leaveCommunity, isSignedIn, username } = useCommunity();

  const [mobileTab, setMobileTab] = useState<"raids" | "chat" | "voice" | "members">("raids");
  const [fetchedCommunity, setFetchedCommunity] = useState<typeof communities[number] | null>(null);
  const [copied, setCopied] = useState(false);
  const [members, setMembers] = useState<{ user: string; joinedAt: number; followers?: number | null }[]>([]);
  const [electedLeader, setElectedLeader] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const community = communities.find((c) => c.ticker === ticker) ?? fetchedCommunity;
  const leader = communityLeaders.find((l) => l.ticker === ticker);
  const isElectedLeader = !!electedLeader && username === electedLeader;

  useEffect(() => {
    if (ticker) selectCommunity(ticker);
  }, [ticker, selectCommunity]);

  // Fetch community members
  useEffect(() => {
    if (!ticker) return;
    let cancelled = false;
    fetch(`/api/communities/members?ticker=${encodeURIComponent(ticker)}`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { if (!cancelled && Array.isArray(data)) setMembers(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [ticker]);

  // Fetch elected leader from vote results
  useEffect(() => {
    if (!ticker) return;
    let cancelled = false;
    fetch(`/api/communities/vote?ticker=${encodeURIComponent(ticker)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (cancelled || !data?.votes?.length) return;
        // votes are sorted by count desc from the API
        setElectedLeader(data.votes[0].candidate);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [ticker, refreshKey]);

  // If community not in context (e.g. just created via lookup), fetch from API
  useEffect(() => {
    if (community || !ticker) return;
    let cancelled = false;
    fetch("/api/communities")
      .then((r) => r.ok ? r.json() : [])
      .then((all: typeof communities) => {
        if (cancelled) return;
        const found = all.find((c: typeof communities[number]) => c.ticker === ticker);
        if (found) setFetchedCommunity(found);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [community, ticker]);

  if (!community) {
    return (
      <div className="min-h-screen animate-page-in">
        {/* Loading skeleton */}
        <div className="border-b border-border bg-surface">
          <div className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-surface-hover animate-pulse" />
              <div className="h-10 w-10 rounded-xl bg-surface-hover animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 rounded bg-surface-hover animate-pulse" />
                <div className="h-3 w-48 rounded bg-surface-hover animate-pulse" />
              </div>
            </div>
          </div>
        </div>
        <div className="p-3 lg:p-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:gap-4">
            <div className="lg:col-span-2 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-xl border border-border bg-surface p-4 h-32" />
              ))}
            </div>
            <div className="hidden lg:block">
              <div className="animate-pulse rounded-xl border border-border bg-surface h-64" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const msgCount = messages.filter((m) => m.community === community.name).length;
  const raidCount = raids.filter((r) => r.community === community.name).length;

  const copyAddress = () => {
    navigator.clipboard.writeText(community.mint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen animate-page-in">
      {/* ── Compact hero bar ── */}
      <div className="relative overflow-hidden border-b border-border bg-surface">
        {/* Background glow from token image */}
        {community.image && (
          <div className="absolute inset-0 opacity-[0.05]">
            <img src={community.image} alt="" className="h-full w-full object-cover blur-3xl scale-150" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/80 to-surface" />

        <div className="relative px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Back */}
            <Link
              href="/app"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:text-accent hover:bg-surface-hover transition-colors shrink-0"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>

            {/* Token identity — compact */}
            <TokenImage src={community.image} ticker={community.ticker} alt={community.name} className="ring-accent/20" />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-text-primary truncate">{community.name}</h1>
                <span className="text-[10px] text-text-muted font-mono">${community.ticker}</span>
                {community.complete !== undefined && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                    community.complete
                      ? "bg-accent/15 text-accent"
                      : "bg-yellow-500/15 text-yellow-400"
                  }`}>
                    {community.complete ? "GRADUATED" : "BONDING"}
                  </span>
                )}
                {leader && leader.rank <= 3 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                    leader.rank === 1 ? "bg-yellow-500/15 text-yellow-400" :
                    leader.rank === 2 ? "bg-gray-400/15 text-gray-300" :
                    "bg-orange-500/15 text-orange-400"
                  }`}>
                    #{leader.rank}
                  </span>
                )}
              </div>

              {/* Inline stats — just quick-glance essentials */}
              <div className="flex items-center gap-3 mt-0.5 text-[10px] text-text-muted overflow-x-auto">
                {community.priceUsd != null && community.priceUsd > 0 && (
                  <span className="text-text-secondary font-bold">{fmtPrice(community.priceUsd)}</span>
                )}
                {community.priceChange24h != null && community.priceChange24h !== 0 && (
                  <span className={`font-bold ${community.priceChange24h > 0 ? "text-green-400" : "text-red-400"}`}>
                    {community.priceChange24h > 0 ? "+" : ""}{community.priceChange24h.toFixed(1)}%
                  </span>
                )}
                {(community.fdv != null || community.marketCapSol != null) && (
                  <span>
                    <span className="text-text-secondary font-bold">
                      {community.fdv ? fmtUsd(community.fdv) : `${community.marketCapSol} SOL`}
                    </span>
                    {" "}mcap
                  </span>
                )}
                {leader && leader.score > 0 && (
                  <span><span className="text-accent font-bold">{leader.score}</span> pts</span>
                )}
              </div>
            </div>

            {/* Join / Leave button */}
            {isSignedIn && (
              joinedCommunities.has(community.ticker) ? (
                <button
                  onClick={() => leaveCommunity(community.ticker)}
                  className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-[10px] font-bold text-text-muted transition-colors hover:border-danger hover:text-danger"
                >
                  Joined
                </button>
              ) : (
                <button
                  onClick={() => joinCommunity(community.ticker)}
                  className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-[10px] font-bold text-background transition-colors hover:bg-accent-hover"
                >
                  Join
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* ── Community banner ── */}
      {community.bannerUrl && (
        <div className="relative h-32 sm:h-40 overflow-hidden border-b border-border">
          <img
            src={community.bannerUrl}
            alt={`${community.name} banner`}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface/80 to-transparent" />
        </div>
      )}

      {/* ── Token Data Dashboard ── */}
      <div className="border-b border-border bg-surface/50">
        <div className="px-4 py-3">
          {/* Key metrics row */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {/* Price */}
            <div className="rounded-lg bg-surface border border-border p-2.5">
              <div className="text-[9px] uppercase tracking-wider text-text-muted font-medium">Price</div>
              <div className="mt-0.5 text-sm font-bold text-text-primary">{fmtPrice(community.priceUsd)}</div>
              {community.priceChange24h != null && community.priceChange24h !== 0 && (
                <div className={`text-[10px] font-bold ${community.priceChange24h > 0 ? "text-green-400" : "text-red-400"}`}>
                  {community.priceChange24h > 0 ? "+" : ""}{community.priceChange24h.toFixed(1)}%
                </div>
              )}
            </div>

            {/* Market Cap */}
            <div className="rounded-lg bg-surface border border-border p-2.5">
              <div className="text-[9px] uppercase tracking-wider text-text-muted font-medium">Market Cap</div>
              <div className="mt-0.5 text-sm font-bold text-text-primary">
                {community.fdv ? fmtUsd(community.fdv) : community.marketCapSol ? `${fmtCompact(community.marketCapSol)} SOL` : "—"}
              </div>
            </div>

            {/* Volume */}
            <div className="rounded-lg bg-surface border border-border p-2.5">
              <div className="text-[9px] uppercase tracking-wider text-text-muted font-medium">24h Volume</div>
              <div className="mt-0.5 text-sm font-bold text-text-primary">{fmtUsd(community.volume24h)}</div>
              {community.txns24h && (
                <div className="text-[10px] text-text-muted">
                  <span className="text-green-400">{community.txns24h.buys}B</span>
                  {" / "}
                  <span className="text-red-400">{community.txns24h.sells}S</span>
                </div>
              )}
            </div>

            {/* Liquidity */}
            <div className="rounded-lg bg-surface border border-border p-2.5">
              <div className="text-[9px] uppercase tracking-wider text-text-muted font-medium">Liquidity</div>
              <div className="mt-0.5 text-sm font-bold text-text-primary">{fmtUsd(community.liquidity)}</div>
            </div>

            {/* Holders */}
            <div className="rounded-lg bg-surface border border-border p-2.5">
              <div className="text-[9px] uppercase tracking-wider text-text-muted font-medium">Holders</div>
              <div className="mt-0.5 text-sm font-bold text-text-primary">{community.holders ? fmtCompact(community.holders) : "—"}</div>
            </div>

            {/* Community Stats */}
            <div className="rounded-lg bg-surface border border-border p-2.5">
              <div className="text-[9px] uppercase tracking-wider text-text-muted font-medium">Community</div>
              <div className="mt-0.5 text-sm font-bold text-text-primary">{community.members} members</div>
              <div className="text-[10px] text-text-muted">{msgCount} msgs · {raidCount} raids</div>
            </div>
          </div>

          {/* Bottom row: contract address, bonding progress, external links */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {/* Contract address */}
            <button
              onClick={copyAddress}
              className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-[10px] font-mono text-text-muted transition-colors hover:border-accent hover:text-accent"
              title="Copy contract address"
            >
              <span className="max-w-[120px] truncate sm:max-w-[200px]">{community.mint}</span>
              {copied ? (
                <svg className="h-3 w-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <CopyIcon />
              )}
            </button>

            {/* Bonding curve progress */}
            {community.progressPercent !== undefined && !community.complete && (
              <div className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1">
                <span className="text-[10px] text-text-muted">Bonding</span>
                <div className="h-1.5 w-16 rounded-full bg-border overflow-hidden">
                  <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.min(community.progressPercent, 100)}%` }} />
                </div>
                <span className="text-[10px] font-bold text-accent">{community.progressPercent}%</span>
              </div>
            )}

            {/* Created */}
            {community.tokenCreatedAt && (
              <span className="rounded-md border border-border bg-background px-2 py-1 text-[10px] text-text-muted">
                Created {timeAgo(community.tokenCreatedAt)}
              </span>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* External links */}
            {community.website && (
              <a
                href={community.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-md border border-accent/20 bg-accent/5 px-2 py-1 text-[10px] font-medium text-accent transition-colors hover:bg-accent/10"
              >
                Website <ExternalIcon />
              </a>
            )}
            {community.twitter && (
              <a
                href={`https://x.com/${community.twitter}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-md border border-accent/20 bg-accent/5 px-2 py-1 text-[10px] font-medium text-accent transition-colors hover:bg-accent/10"
              >
                @{community.twitter} <ExternalIcon />
              </a>
            )}
            {community.telegram && (
              <a
                href={community.telegram.startsWith("http") ? community.telegram : `https://t.me/${community.telegram.replace(/^@/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-md border border-accent/20 bg-accent/5 px-2 py-1 text-[10px] font-medium text-accent transition-colors hover:bg-accent/10"
              >
                Telegram <ExternalIcon />
              </a>
            )}
            {community.discord && (
              <a
                href={community.discord}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-md border border-accent/20 bg-accent/5 px-2 py-1 text-[10px] font-medium text-accent transition-colors hover:bg-accent/10"
              >
                Discord <ExternalIcon />
              </a>
            )}
            {community.pairUrl && (
              <a
                href={community.pairUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[10px] font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent"
              >
                DexScreener <ExternalIcon />
              </a>
            )}
            <a
              href={`https://pump.fun/coin/${community.mint}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[10px] font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent"
            >
              Pump.fun <ExternalIcon />
            </a>
            <a
              href={`https://solscan.io/token/${community.mint}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[10px] font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent"
            >
              Solscan <ExternalIcon />
            </a>

            {/* Leader edit button */}
            {isElectedLeader && (
              <LeaderSettings
                community={community}
                onSaved={() => {
                  setRefreshKey((k) => k + 1);
                  // Refetch community data to update social fields
                  fetch("/api/communities")
                    .then((r) => r.ok ? r.json() : [])
                    .then((all: typeof communities) => {
                      const found = all.find((c) => c.ticker === ticker);
                      if (found) setFetchedCommunity(found);
                    })
                    .catch(() => {});
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Members bar (top of page) ── */}
      <div className="border-b border-border bg-surface/50 hidden lg:block">
        <div className="px-4 py-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <h3 className="text-[10px] uppercase tracking-wider text-text-muted font-medium">Members</h3>
              <span className="text-[10px] text-accent font-bold">{members.length}</span>
            </div>
            <div className="flex-1 overflow-x-auto scrollbar-hide">
              {members.length === 0 ? (
                <span className="text-[10px] text-text-muted">No members yet — be the first to join!</span>
              ) : (
                <div className="flex items-center gap-2">
                  {[...members]
                    .sort((a, b) => (b.followers ?? 0) - (a.followers ?? 0))
                    .map((m) => (
                    <a
                      key={m.user}
                      href={`https://x.com/${m.user.replace(/^@/, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-full border border-border bg-background px-2 py-1 hover:border-accent/50 transition-colors shrink-0"
                    >
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/10 text-accent text-[9px] font-bold">
                        {m.user.charAt(1).toUpperCase()}
                      </div>
                      <span className="text-[10px] font-medium text-text-primary">{m.user}</span>
                      {m.followers != null && m.followers > 0 && (
                        <span className="text-[9px] text-text-muted">{fmtCompact(m.followers)}</span>
                      )}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile tab switcher ── */}
      <div className="flex border-b border-border bg-surface lg:hidden">
        {(["raids", "chat", "voice", "members"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={`flex-1 py-2.5 text-xs font-bold text-center transition-colors relative ${
              mobileTab === tab ? "text-accent" : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {tab === "raids" ? `raids${raidCount > 0 ? ` (${raidCount})` : ""}` :
             tab === "chat" ? `chat${msgCount > 0 ? ` (${msgCount})` : ""}` :
             tab === "voice" ? "voice" :
             `members${members.length > 0 ? ` (${members.length})` : ""}`}
            {mobileTab === tab && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-accent rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* ── Main content: Raids + Chat + Members ── */}
      <div className="p-3 lg:p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:gap-4">
          {/* Raid hub — 2/3 width (always visible on desktop, tab-controlled on mobile) */}
          <div className={`lg:col-span-2 ${mobileTab !== "raids" ? "hidden lg:block" : ""}`}>
            <ErrorBoundary>
              <RaidPanel />
            </ErrorBoundary>
          </div>

          {/* Right column: Chat + Voice + Members */}
          <div className="lg:col-span-1 flex flex-col gap-3">
            {/* Chat */}
            <div className={`${mobileTab !== "chat" ? "hidden lg:block" : ""}`}>
              <div className="lg:sticky lg:top-14 h-[calc(100vh-12rem)] lg:h-[calc(100vh-22rem)]">
                <ErrorBoundary>
                  <CommunityChat />
                </ErrorBoundary>
              </div>
            </div>

            {/* Voice Room */}
            <div className={`${mobileTab !== "voice" ? "hidden lg:block" : ""}`}>
              <VoiceRoom ticker={community.ticker} communityName={community.name} />
            </div>

            {/* Community Lead Voting Panel */}
            <div className={`${mobileTab !== "members" ? "hidden lg:block" : ""}`}>
              <LeaderVote
                ticker={community.ticker}
                members={members}
                isMember={joinedCommunities.has(community.ticker)}
              />
            </div>

            {/* Members panel (mobile only - desktop shows at top) */}
            <div className={`${mobileTab !== "members" ? "hidden" : ""} lg:hidden`}>
              <div className="rounded-xl border border-border bg-surface overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-3 py-2">
                  <h3 className="text-xs font-bold text-text-primary">Members</h3>
                  <span className="text-[10px] text-text-muted">{members.length}</span>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {members.length === 0 ? (
                    <div className="px-3 py-6 text-center text-xs text-text-muted">
                      No members yet — be the first to join!
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {[...members]
                        .sort((a, b) => (b.followers ?? 0) - (a.followers ?? 0))
                        .map((m) => (
                        <a
                          key={m.user}
                          href={`https://x.com/${m.user.replace(/^@/, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between px-3 py-2 hover:bg-surface-hover transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-accent text-[10px] font-bold">
                              {m.user.charAt(1).toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-text-primary">{m.user}</span>
                              {m.followers != null && m.followers > 0 && (
                                <span className="text-[9px] text-text-muted">{fmtCompact(m.followers)} followers</span>
                              )}
                            </div>
                          </div>
                          <span className="text-[10px] text-text-muted">
                            {timeAgo(m.joinedAt)}
                          </span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
