"use client";

import { useState, useEffect, useMemo } from "react";
import { useCommunity } from "@/context/CommunityContext";
import { getRaidStatus, parseTweetUrl } from "@/context/CommunityContext";
import RaidCard from "@/components/RaidCard";

type RaidTab = "active" | "completed" | "expired";

export default function RaidPanel() {
  const { raids, engageRaid, selectedCommunity, createRaid, communities } = useCommunity();
  const [showCreate, setShowCreate] = useState(false);
  const [tweetUrl, setTweetUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [targetLikes, setTargetLikes] = useState("100");
  const [targetRTs, setTargetRTs] = useState("50");
  const [targetReplies, setTargetReplies] = useState("25");
  const [showTargets, setShowTargets] = useState(false);
  const [activeTab, setActiveTab] = useState<RaidTab>("active");
  const [expandedRaid, setExpandedRaid] = useState<number | null>(null);

  // Tick every 15s to update countdown timers
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 15_000);
    return () => clearInterval(interval);
  }, []);

  // Filter raids by selected community
  const communityRaids =
    selectedCommunity === "all"
      ? raids
      : raids.filter((r) => {
          const comm = communities.find((c) => c.ticker === selectedCommunity);
          return comm ? r.community === comm.name : false;
        });

  // Split by status
  const activeRaids = useMemo(() => communityRaids.filter((r) => getRaidStatus(r) === "active"), [communityRaids]);
  const completedRaids = useMemo(() => communityRaids.filter((r) => getRaidStatus(r) === "completed"), [communityRaids]);
  const expiredRaids = useMemo(() => communityRaids.filter((r) => getRaidStatus(r) === "expired"), [communityRaids]);

  // Count raids that still need user engagement
  const raidsNeedingAction = useMemo(() =>
    activeRaids.filter((r) => !r.engagedLike || !r.engagedRT || !r.engagedReply),
    [activeRaids]
  );

  const displayRaids = useMemo(() =>
    activeTab === "active"
      ? activeRaids
      : activeTab === "completed"
      ? completedRaids
      : expiredRaids,
    [activeTab, activeRaids, completedRaids, expiredRaids]
  );

  const tabCounts = {
    active: activeRaids.length,
    completed: completedRaids.length,
    expired: expiredRaids.length,
  };

  const handleCreate = () => {
    const parsed = parseTweetUrl(tweetUrl);
    if (!parsed) {
      setUrlError("Paste a valid x.com tweet URL");
      return;
    }
    setUrlError("");
    createRaid(tweetUrl, {
      likes: Math.max(1, parseInt(targetLikes) || 100),
      retweets: Math.max(1, parseInt(targetRTs) || 50),
      replies: Math.max(1, parseInt(targetReplies) || 25),
    });
    setTweetUrl("");
    setTargetLikes("100");
    setTargetRTs("50");
    setTargetReplies("25");
    setShowTargets(false);
    setShowCreate(false);
  };

  // Parse URL on change for live preview
  const parsedPreview = parseTweetUrl(tweetUrl);

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-surface to-surface-hover">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 animate-pulse-glow">
            <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">raid hub</h3>
            {activeRaids.length > 0 && (
              <p className="text-[10px] text-accent font-medium flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                {activeRaids.length} live &middot; {raidsNeedingAction.length} need you
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${
            showCreate
              ? "bg-danger/10 text-danger hover:bg-danger/20"
              : "bg-accent text-background hover:bg-accent-hover shadow-md shadow-accent/25 hover:shadow-lg hover:shadow-accent/30 hover:-translate-y-0.5"
          }`}
        >
          {showCreate ? "cancel" : "+ new raid"}
        </button>
      </div>

      {/* Create raid form */}
      {showCreate && (
        <div className="border-b border-border px-4 py-3 space-y-2.5 bg-surface-hover/50">
          {/* Community indicator */}
          {selectedCommunity !== "all" && (() => {
            const comm = communities.find((c) => c.ticker === selectedCommunity);
            return comm ? (
              <div className="flex items-center gap-2 rounded-md bg-accent/5 border border-accent/10 px-2.5 py-1.5">
                <span className="text-[10px] text-text-muted">raiding for</span>
                <span className="text-[10px] font-bold text-accent">{comm.name}</span>
                <span className="text-[9px] text-text-muted font-mono">${comm.ticker}</span>
              </div>
            ) : null;
          })()}
          <div>
            <label className="text-[10px] font-medium text-text-muted uppercase tracking-wide mb-1 block">
              tweet URL
            </label>
            <input
              type="url"
              value={tweetUrl}
              onChange={(e) => {
                setTweetUrl(e.target.value);
                setUrlError("");
              }}
              placeholder="https://x.com/user/status/123..."
              className={`w-full rounded-md border bg-background px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none transition-colors ${
                urlError
                  ? "border-danger focus:border-danger"
                  : "border-border focus:border-accent"
              }`}
            />
            {urlError && (
              <p className="text-[10px] text-danger mt-0.5">{urlError}</p>
            )}
          </div>

          {/* URL parsed preview */}
          {parsedPreview && (
            <div className="flex items-center gap-2 rounded-md bg-accent/5 border border-accent/20 px-2.5 py-1.5">
              <svg className="h-3.5 w-3.5 text-accent flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span className="text-[10px] text-accent font-medium">{parsedPreview.author}</span>
              <span className="text-[10px] text-text-muted">tweet #{parsedPreview.tweetId.slice(-6)}</span>
              <svg className="h-3 w-3 text-accent ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}

          {/* Custom targets toggle */}
          <button
            onClick={() => setShowTargets(!showTargets)}
            className="flex items-center gap-1 text-[10px] text-text-muted hover:text-text-secondary transition-colors"
          >
            <svg
              className={`h-3 w-3 transition-transform ${showTargets ? "rotate-90" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            custom targets
          </button>

          {showTargets && (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[9px] text-text-muted block mb-0.5">likes</label>
                <input
                  type="number"
                  min="1"
                  value={targetLikes}
                  onChange={(e) => setTargetLikes(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-text-primary focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[9px] text-text-muted block mb-0.5">retweets</label>
                <input
                  type="number"
                  min="1"
                  value={targetRTs}
                  onChange={(e) => setTargetRTs(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-text-primary focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[9px] text-text-muted block mb-0.5">replies</label>
                <input
                  type="number"
                  min="1"
                  value={targetReplies}
                  onChange={(e) => setTargetReplies(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-text-primary focus:border-accent focus:outline-none"
                />
              </div>
            </div>
          )}

          {communities.length === 0 && (
            <p className="text-[10px] text-warning">waiting for communities to load from token feed...</p>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowCreate(false);
                setTweetUrl("");
                setUrlError("");
              }}
              className="rounded-md border border-border px-3 py-1.5 text-[10px] font-medium text-text-muted transition-colors hover:text-text-secondary"
            >
              cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!parsedPreview || communities.length === 0}
              className={`rounded-md px-4 py-1.5 text-[10px] font-bold transition-colors ${
                parsedPreview && communities.length > 0
                  ? "bg-accent text-background hover:bg-accent-hover"
                  : "bg-accent/20 text-accent/40 cursor-not-allowed"
              }`}
            >
              launch raid
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border bg-background/30">
        {(["active", "completed", "expired"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2.5 text-xs font-bold uppercase tracking-wide transition-all relative ${
              activeTab === tab
                ? tab === "expired"
                  ? "text-danger"
                  : "text-accent"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {tab}
            {tabCounts[tab] > 0 && (
              <span className={`ml-1.5 inline-flex items-center justify-center h-4 min-w-4 rounded-full px-1 text-[9px] font-bold ${
                activeTab === tab
                  ? tab === "expired"
                    ? "bg-danger/15 text-danger"
                    : "bg-accent/15 text-accent"
                  : "bg-surface-hover text-text-muted"
              }`}>
                {tabCounts[tab]}
              </span>
            )}
            {activeTab === tab && (
              <span className={`absolute bottom-0 left-2 right-2 h-0.5 rounded-full ${
                tab === "expired" ? "bg-danger" : "bg-accent"
              }`} />
            )}
          </button>
        ))}
      </div>

      {/* Raid list */}
      <div className="divide-y divide-border/50 max-h-[600px] overflow-y-auto">
        {displayRaids.length === 0 && (
          <div className="px-4 py-12 text-center animate-fade-in">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/5 border border-accent/10 animate-pulse-glow">
              <svg className="h-6 w-6 text-accent/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-text-muted mb-1">
              {activeTab === "active"
                ? "No active raids"
                : activeTab === "completed"
                ? "No completed raids"
                : "No expired raids"}
            </p>
            <p className="text-[11px] text-text-muted/60">
              {activeTab === "active"
                ? "start a raid and rally the community"
                : activeTab === "completed"
                ? "completed raids will appear here"
                : "expired raids will appear here"}
            </p>
            {activeTab === "active" && (
              <button
                onClick={() => setShowCreate(true)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-accent/10 px-4 py-2 text-xs font-bold text-accent hover:bg-accent/20 transition-all hover:-translate-y-0.5 active:scale-95"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                launch the first one
              </button>
            )}
          </div>
        )}
        {displayRaids.map((raid) => (
          <RaidCard
            key={raid.id}
            raid={raid}
            onEngage={engageRaid}
            expanded={expandedRaid === raid.id}
            onToggleExpand={() =>
              setExpandedRaid((prev) => (prev === raid.id ? null : raid.id))
            }
          />
        ))}
      </div>
    </div>
  );
}
