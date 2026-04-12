"use client";

import { use, useEffect, useState } from "react";
import { useCommunity } from "@/context/CommunityContext";
import CommunityChat from "@/components/CommunityChat";
import RaidPanel from "@/components/RaidPanel";
import ErrorBoundary from "@/components/ErrorBoundary";
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

export default function CommunityPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = use(params);
  const { communities, selectCommunity, communityLeaders, messages, raids, joinedCommunities, joinCommunity, leaveCommunity, isSignedIn } = useCommunity();

  const [mobileTab, setMobileTab] = useState<"raids" | "chat">("raids");
  const community = communities.find((c) => c.ticker === ticker);
  const leader = communityLeaders.find((l) => l.ticker === ticker);

  useEffect(() => {
    if (ticker) selectCommunity(ticker);
  }, [ticker, selectCommunity]);

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
            {community.image ? (
              <img
                src={community.image}
                alt={community.name}
                className="h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-accent/20"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-base font-bold text-accent ring-1 ring-accent/20">
                {community.ticker.slice(0, 2)}
              </div>
            )}

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

              {/* Inline stats */}
              <div className="flex items-center gap-3 mt-0.5 text-[10px] text-text-muted overflow-x-auto">
                {(community.fdv != null || community.marketCapSol != null) && (
                  <span>
                    <span className="text-text-secondary font-bold">
                      {community.fdv ? fmtUsd(community.fdv) : `${community.marketCapSol} SOL`}
                    </span>
                    {" "}mcap
                  </span>
                )}
                {community.holders != null && community.holders > 0 && (
                  <span><span className="text-text-secondary font-bold">{fmtCompact(community.holders)}</span> holders</span>
                )}
                {community.volume24h != null && community.volume24h > 0 && (
                  <span><span className="text-text-secondary font-bold">{fmtUsd(community.volume24h)}</span> vol</span>
                )}
                <span><span className="text-text-secondary font-bold">{msgCount}</span> msgs</span>
                <span><span className="text-text-secondary font-bold">{raidCount}</span> raids</span>
                {community.members > 0 && (
                  <span><span className="text-text-secondary font-bold">{community.members}</span> members</span>
                )}
                {leader && leader.score > 0 && (
                  <span><span className="text-accent font-bold">{leader.score}</span> pts</span>
                )}
              </div>
            </div>

            {/* Bonding curve — compact pill */}
            {community.progressPercent !== undefined && !community.complete && (
              <div className="hidden sm:flex items-center gap-2 shrink-0">
                <div className="h-1.5 w-20 rounded-full bg-background/60 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{ width: `${Math.min(community.progressPercent, 100)}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-accent">{community.progressPercent}%</span>
              </div>
            )}

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

      {/* ── Mobile tab switcher ── */}
      <div className="flex border-b border-border bg-surface lg:hidden">
        <button
          onClick={() => setMobileTab("raids")}
          className={`flex-1 py-2.5 text-xs font-bold text-center transition-colors relative ${
            mobileTab === "raids"
              ? "text-accent"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          raids{raidCount > 0 && ` (${raidCount})`}
          {mobileTab === "raids" && (
            <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-accent rounded-full" />
          )}
        </button>
        <button
          onClick={() => setMobileTab("chat")}
          className={`flex-1 py-2.5 text-xs font-bold text-center transition-colors relative ${
            mobileTab === "chat"
              ? "text-accent"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          chat{msgCount > 0 && ` (${msgCount})`}
          {mobileTab === "chat" && (
            <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-accent rounded-full" />
          )}
        </button>
      </div>

      {/* ── Main content: Raids + Chat ── */}
      <div className="p-3 lg:p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:gap-4">
          {/* Raid hub — 2/3 width (always visible on desktop, tab-controlled on mobile) */}
          <div className={`lg:col-span-2 ${mobileTab !== "raids" ? "hidden lg:block" : ""}`}>
            <ErrorBoundary>
              <RaidPanel />
            </ErrorBoundary>
          </div>

          {/* Chat — 1/3 width (always visible on desktop, tab-controlled on mobile) */}
          <div className={`lg:col-span-1 ${mobileTab !== "chat" ? "hidden lg:block" : ""}`}>
            <div className="lg:sticky lg:top-14 h-[calc(100vh-12rem)] lg:h-[calc(100vh-5rem)]">
              <ErrorBoundary>
                <CommunityChat />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
