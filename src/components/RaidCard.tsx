"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { type Raid, getRaidTimeLeft, getRaidStatus } from "@/context/CommunityContext";

const RAID_DURATION_MS = 60 * 60 * 1000;
const XP_PER_ACTION = 10;

function getMinutesLeft(raid: Raid): number {
  const remaining = RAID_DURATION_MS - (Date.now() - raid.createdAt);
  return Math.max(0, Math.ceil(remaining / 60_000));
}

// Confetti particle component
function ConfettiBurst() {
  const colors = ["#4ade80", "#f59e0b", "#ec4899", "#3b82f6", "#a855f7", "#ef4444"];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-10">
      {Array.from({ length: 24 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-sm"
          style={{
            width: `${4 + Math.random() * 4}px`,
            height: `${4 + Math.random() * 4}px`,
            background: colors[i % colors.length],
            left: `${10 + Math.random() * 80}%`,
            top: `${-5 - Math.random() * 10}%`,
            animation: `confetti-fall ${0.8 + Math.random() * 0.8}s ease-in forwards`,
            animationDelay: `${Math.random() * 0.3}s`,
          }}
        />
      ))}
    </div>
  );
}

// XP float notification
function XpFloat({ amount }: { amount: number }) {
  return (
    <div className="absolute -top-2 right-4 z-10 animate-xp-float">
      <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-black text-accent">
        +{amount} XP
      </span>
    </div>
  );
}

interface RaidCardProps {
  raid: Raid;
  connected: boolean;
  verified: boolean | null;
  checking: boolean;
  onEngage: (raidId: number, type: "like" | "retweet" | "reply") => void;
  expanded: boolean;
  onToggleExpand: () => void;
}

export default function RaidCard({
  raid,
  connected,
  verified,
  checking,
  onEngage,
  expanded,
  onToggleExpand,
}: RaidCardProps) {
  const status = getRaidStatus(raid);
  const timeLeft = getRaidTimeLeft(raid);
  const minsLeft = getMinutesLeft(raid);

  const likeProg = Math.min((raid.likes / raid.target.likes) * 100, 100);
  const rtProg = Math.min((raid.retweets / raid.target.retweets) * 100, 100);
  const replyProg = Math.min((raid.replies / raid.target.replies) * 100, 100);
  const overallProg = Math.min(
    ((raid.likes + raid.retweets + raid.replies) /
      (raid.target.likes + raid.target.retweets + raid.target.replies)) *
      100,
    100
  );

  const isActive = status === "active";
  const isCompleted = status === "completed";
  const isUrgent = isActive && minsLeft <= 10;
  const isCritical = isActive && minsLeft <= 3;

  // Milestone detection
  const prevProgRef = useRef(overallProg);
  const [milestone, setMilestone] = useState<number | null>(null);
  useEffect(() => {
    const thresholds = [25, 50, 75, 100];
    for (const t of thresholds) {
      if (prevProgRef.current < t && overallProg >= t) {
        setMilestone(t);
        const timer = setTimeout(() => setMilestone(null), 2000);
        return () => clearTimeout(timer);
      }
    }
    prevProgRef.current = overallProg;
  }, [overallProg]);

  // Confetti on completion
  const [showConfetti, setShowConfetti] = useState(false);
  const wasCompletedRef = useRef(isCompleted);
  useEffect(() => {
    if (isCompleted && !wasCompletedRef.current) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 2000);
      return () => clearTimeout(timer);
    }
    wasCompletedRef.current = isCompleted;
  }, [isCompleted]);

  // XP float on engage
  const [xpFloat, setXpFloat] = useState(false);
  const handleEngage = useCallback((raidId: number, type: "like" | "retweet" | "reply") => {
    onEngage(raidId, type);
    setXpFloat(true);
    setTimeout(() => setXpFloat(false), 1200);
  }, [onEngage]);

  // Open X intent popup and record engagement
  const openIntent = useCallback((raidId: number, type: "like" | "retweet" | "reply") => {
    const tweetId = raid.tweetId;
    const intentUrls: Record<string, string> = {
      like: `https://x.com/intent/like?tweet_id=${tweetId}`,
      retweet: `https://x.com/intent/retweet?tweet_id=${tweetId}`,
      reply: `https://x.com/intent/tweet?in_reply_to=${tweetId}`,
    };
    const w = 550, h = 420;
    const left = Math.round(window.screenX + (window.outerWidth - w) / 2);
    const top = Math.round(window.screenY + (window.outerHeight - h) / 2);
    window.open(
      intentUrls[type],
      `intent_${type}_${tweetId}`,
      `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no`
    );
    handleEngage(raidId, type);
  }, [raid.tweetId, handleEngage]);

  // Raid all — open all unengaged intents
  const handleRaidAll = useCallback(() => {
    const types: ("like" | "retweet" | "reply")[] = [];
    if (!raid.engagedLike) types.push("like");
    if (!raid.engagedRT) types.push("retweet");
    if (!raid.engagedReply) types.push("reply");
    if (types.length === 0) return;
    // Open first intent immediately, rest with staggered delays
    types.forEach((type, i) => {
      setTimeout(() => openIntent(raid.id, type), i * 800);
    });
  }, [raid.id, raid.engagedLike, raid.engagedRT, raid.engagedReply, openIntent]);

  const userEngageCount = (raid.engagedLike ? 1 : 0) + (raid.engagedRT ? 1 : 0) + (raid.engagedReply ? 1 : 0);
  const userXP = userEngageCount * XP_PER_ACTION;
  const allDone = raid.engagedLike && raid.engagedRT && raid.engagedReply;

  // Urgency class
  const urgencyRing = isCritical
    ? "ring-1 ring-danger/40 animate-urgency-critical"
    : isUrgent
    ? "ring-1 ring-warning/30 animate-urgency"
    : "";

  // Determine if tweet field has actual content (not just a URL)
  const hasTweetText = raid.tweet && !raid.tweet.startsWith("http");
  const displayName = raid.authorName || raid.author;
  const handle = raid.author.startsWith("@") ? raid.author : `@${raid.author}`;

  return (
    <div
      className={`relative overflow-hidden transition-all animate-fade-in ${urgencyRing} ${
        milestone ? "animate-milestone" : ""
      } ${isActive ? "bg-surface" : "bg-surface/40"}`}
    >
      {showConfetti && <ConfettiBurst />}
      {xpFloat && <XpFloat amount={XP_PER_ACTION} />}

      {/* ── Tweet content + status header ── */}
      <button onClick={onToggleExpand} className="w-full text-left px-4 py-3 group">
        {/* Top row: author info + timer */}
        <div className="flex items-center gap-3 mb-2">
          {/* Author avatar */}
          {raid.authorAvatar ? (
            <img
              src={raid.authorAvatar}
              alt={displayName}
              className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-border"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 ring-1 ring-border text-xs font-bold text-accent">
              {displayName.replace(/^@/, "").slice(0, 2).toUpperCase()}
            </div>
          )}

          {/* Author name + handle */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-bold text-text-primary truncate">{displayName}</span>
              {raid.authorName && (
                <span className="text-[11px] text-text-muted truncate">{handle}</span>
              )}
            </div>
            {/* War cry inline */}
            {raid.warCry && (
              <span className="text-[10px] text-accent/80 truncate block max-w-[280px]">
                &ldquo;{raid.warCry}&rdquo;
              </span>
            )}
          </div>

          {/* Engagement dots */}
          <div className="flex items-center gap-1 shrink-0">
            <div className={`h-2 w-2 rounded-full ${raid.engagedLike ? "bg-pink-400" : "bg-border"}`} title="like" />
            <div className={`h-2 w-2 rounded-full ${raid.engagedRT ? "bg-accent" : "bg-border"}`} title="retweet" />
            <div className={`h-2 w-2 rounded-full ${raid.engagedReply ? "bg-blue-400" : "bg-border"}`} title="reply" />
          </div>

          {/* Timer / status */}
          <div className="shrink-0">
            {isActive ? (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${
                isCritical ? "bg-danger/15 text-danger animate-timer-pulse" :
                isUrgent ? "bg-warning/15 text-warning animate-timer-pulse" :
                "bg-surface-hover text-text-muted"
              }`}>
                {timeLeft}
              </span>
            ) : isCompleted ? (
              <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <span className="text-[10px] text-danger font-bold">expired</span>
            )}
          </div>

          {/* Expand chevron */}
          <svg className={`h-4 w-4 text-text-muted transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Tweet text */}
        {hasTweetText && (
          <p className="text-[13px] leading-relaxed text-text-secondary mb-2.5 line-clamp-3 pl-12">
            {raid.tweet}
          </p>
        )}

        {/* Progress bar */}
        <div className="flex items-center gap-2 pl-12">
          <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-background">
            {[25, 50, 75].map((m) => (
              <div key={m} className={`absolute top-0 bottom-0 w-px ${overallProg >= m ? "bg-accent/30" : "bg-text-muted/10"}`} style={{ left: `${m}%` }} />
            ))}
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                isCompleted ? "bg-accent" : isCritical ? "bg-danger" : isUrgent ? "bg-warning" : "bg-accent"
              }`}
              style={{ width: `${overallProg}%` }}
            />
            {isActive && overallProg < 100 && <div className="absolute inset-0 progress-shimmer rounded-full" />}
          </div>
          <span className={`text-[10px] font-bold tabular-nums ${overallProg >= 100 ? "text-accent" : "text-text-muted"}`}>
            {Math.round(overallProg)}%
          </span>
        </div>
      </button>

      {/* ── Quick action bar (always visible for active raids) ── */}
      {isActive && !expanded && (
        <div className="px-4 pb-3 pl-16 flex items-center gap-2">
          {!connected ? (
            <span className="text-[10px] text-warning">connect to X to participate</span>
          ) : verified === false ? (
            <span className="text-[10px] text-danger">must hold ${raid.community} to raid</span>
          ) : allDone ? (
            <div className="flex items-center gap-2 flex-1">
              <span className="text-[10px] text-accent font-bold">all done! {userXP} XP earned</span>
              <a
                href={`https://x.com/i/status/${raid.tweetId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto rounded-lg bg-surface-hover px-2.5 py-1 text-[10px] text-text-muted hover:text-accent transition-colors"
              >
                view tweet
              </a>
            </div>
          ) : (
            <>
              <button
                onClick={() => openIntent(raid.id, "like")}
                disabled={raid.engagedLike || checking}
                className={`raid-action-pill ${raid.engagedLike ? "raid-action-done text-pink-400 bg-pink-500/15" : "text-pink-400 bg-pink-500/8 hover:bg-pink-500/20"}`}
              >
                <svg className="h-3.5 w-3.5" fill={raid.engagedLike ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span className="text-[10px] font-bold">{raid.likes}</span>
              </button>
              <button
                onClick={() => openIntent(raid.id, "retweet")}
                disabled={raid.engagedRT || checking}
                className={`raid-action-pill ${raid.engagedRT ? "raid-action-done text-accent bg-accent/15" : "text-accent bg-accent/8 hover:bg-accent/20"}`}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-[10px] font-bold">{raid.retweets}</span>
              </button>
              <button
                onClick={() => openIntent(raid.id, "reply")}
                disabled={raid.engagedReply || checking}
                className={`raid-action-pill ${raid.engagedReply ? "raid-action-done text-blue-400 bg-blue-500/15" : "text-blue-400 bg-blue-500/8 hover:bg-blue-500/20"}`}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="text-[10px] font-bold">{raid.replies}</span>
              </button>
              <button
                onClick={handleRaidAll}
                disabled={checking}
                className="ml-auto rounded-lg bg-accent px-3 py-1.5 text-[10px] font-black text-background hover:bg-accent-hover transition-all active:scale-95 shadow-md shadow-accent/20 hover:shadow-lg hover:shadow-accent/30 hover:-translate-y-0.5"
              >
                {checking ? "..." : "RAID ALL"}
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Expanded detail panel ── */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3 animate-slide-down">
          {/* Full tweet text if not shown above (fallback for URL-only raids) */}
          {!hasTweetText && (
            <a
              href={`https://x.com/i/status/${raid.tweetId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg bg-background/60 border border-border/50 px-3 py-2 text-[11px] text-text-muted hover:text-accent transition-colors truncate"
            >
              {raid.tweetUrl || `https://x.com/i/status/${raid.tweetId}`}
            </a>
          )}

          {/* War cry */}
          {raid.warCry && (
            <div className="flex items-center gap-2 rounded-lg bg-accent/5 border border-accent/10 px-3 py-2">
              <svg className="h-4 w-4 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
              <span className="text-[11px] font-bold text-accent animate-cry truncate">{raid.warCry}</span>
            </div>
          )}

          {/* Detailed progress bars */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-text-muted font-medium">
                progress
                {milestone && <span className="ml-1.5 text-accent font-bold">{milestone}% reached!</span>}
              </span>
              <span className={`text-sm font-bold ${overallProg >= 100 ? "text-accent" : "text-text-primary"}`}>
                {Math.round(overallProg)}%
              </span>
            </div>

            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-background">
              {[25, 50, 75].map((m) => (
                <div key={m} className={`absolute top-0 bottom-0 w-px z-[1] ${overallProg >= m ? "bg-accent/40" : "bg-text-muted/20"}`} style={{ left: `${m}%` }} />
              ))}
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out progress-fill ${
                  isCritical ? "bg-gradient-to-r from-danger/80 to-danger" : isUrgent ? "bg-gradient-to-r from-warning/80 to-warning" : isCompleted ? "bg-accent" : "bg-gradient-to-r from-accent/80 to-accent"
                }`}
                style={{ width: `${overallProg}%` }}
              />
              {isActive && overallProg < 100 && <div className="absolute inset-0 progress-shimmer rounded-full" />}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-background/60 p-2">
                <div className="flex items-center justify-between mb-1">
                  <svg className="h-3.5 w-3.5 text-pink-400" fill={likeProg >= 100 ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span className="text-[9px] text-text-muted">{raid.likes}/{raid.target.likes}</span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-background">
                  <div className="h-full rounded-full bg-pink-500 transition-all duration-500 progress-fill" style={{ width: `${likeProg}%` }} />
                </div>
              </div>
              <div className="rounded-lg bg-background/60 p-2">
                <div className="flex items-center justify-between mb-1">
                  <svg className="h-3.5 w-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="text-[9px] text-text-muted">{raid.retweets}/{raid.target.retweets}</span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-background">
                  <div className="h-full rounded-full bg-accent transition-all duration-500 progress-fill" style={{ width: `${rtProg}%` }} />
                </div>
              </div>
              <div className="rounded-lg bg-background/60 p-2">
                <div className="flex items-center justify-between mb-1">
                  <svg className="h-3.5 w-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="text-[9px] text-text-muted">{raid.replies}/{raid.target.replies}</span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-background">
                  <div className="h-full rounded-full bg-blue-500 transition-all duration-500 progress-fill" style={{ width: `${replyProg}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Raiders count */}
          {raid.participants > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1.5">
                {Array.from({ length: Math.min(raid.participants, 4) }).map((_, i) => (
                  <div key={i} className="h-5 w-5 rounded-full bg-gradient-to-br from-accent/30 to-accent/10 border border-surface flex items-center justify-center">
                    <svg className="h-2.5 w-2.5 text-accent/60" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                ))}
              </div>
              <span className="text-[10px] text-text-muted">
                <span className="text-accent font-bold">{raid.participants}</span> raider{raid.participants !== 1 ? "s" : ""}
                {raid.participants >= 5 && <span className="text-warning ml-1 font-bold">hot!</span>}
                {raid.participants >= 15 && <span className="text-danger ml-1 font-bold">on fire!</span>}
              </span>
              {userXP > 0 && (
                <span className="ml-auto rounded-full bg-accent/10 px-2 py-0.5 text-[9px] font-black text-accent">
                  {userXP} XP
                </span>
              )}
            </div>
          )}

          {/* Action buttons in expanded view */}
          {isActive && (
            <div className="flex items-center gap-2">
              {!connected ? (
                <span className="text-[11px] text-warning font-medium">connect to X to participate</span>
              ) : verified === false ? (
                <span className="text-[11px] text-danger font-medium">must hold ${raid.community} to participate</span>
              ) : allDone ? (
                <span className="text-[11px] text-accent font-bold">all actions completed! {userXP} XP earned</span>
              ) : (
                <>
                  <button
                    onClick={() => openIntent(raid.id, "like")}
                    disabled={raid.engagedLike || checking}
                    className={`group/btn flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all active:scale-95 ${
                      raid.engagedLike ? "bg-pink-500/20 text-pink-400" : checking ? "bg-surface-hover text-text-muted cursor-wait" : "bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 hover:shadow-md hover:shadow-pink-500/10 hover:-translate-y-0.5"
                    }`}
                  >
                    <svg className={`h-4 w-4 ${raid.engagedLike ? "animate-engage-pop" : "group-hover/btn:scale-110 transition-transform"}`} fill={raid.engagedLike ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    {raid.engagedLike ? "done" : "like"}
                  </button>
                  <button
                    onClick={() => openIntent(raid.id, "retweet")}
                    disabled={raid.engagedRT || checking}
                    className={`group/btn flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all active:scale-95 ${
                      raid.engagedRT ? "bg-accent/20 text-accent" : checking ? "bg-surface-hover text-text-muted cursor-wait" : "bg-accent/10 text-accent hover:bg-accent/20 hover:shadow-md hover:shadow-accent/10 hover:-translate-y-0.5"
                    }`}
                  >
                    <svg className={`h-4 w-4 ${raid.engagedRT ? "animate-engage-pop" : "group-hover/btn:scale-110 transition-transform"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {raid.engagedRT ? "done" : "retweet"}
                  </button>
                  <button
                    onClick={() => openIntent(raid.id, "reply")}
                    disabled={raid.engagedReply || checking}
                    className={`group/btn flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all active:scale-95 ${
                      raid.engagedReply ? "bg-blue-500/20 text-blue-400" : checking ? "bg-surface-hover text-text-muted cursor-wait" : "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:shadow-md hover:shadow-blue-500/10 hover:-translate-y-0.5"
                    }`}
                  >
                    <svg className={`h-4 w-4 ${raid.engagedReply ? "animate-engage-pop" : "group-hover/btn:scale-110 transition-transform"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {raid.engagedReply ? "done" : "reply"}
                  </button>
                </>
              )}
            </div>
          )}

          {/* View on X link */}
          <a
            href={`https://x.com/i/status/${raid.tweetId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-lg bg-background/50 px-3 py-2 text-[11px] text-text-muted hover:text-accent transition-colors"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            view tweet on X
            <svg className="h-3 w-3 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>

          {/* Completed / expired footer */}
          {!isActive && (
            <div className="text-center pt-1">
              {isCompleted ? (
                <div className="flex items-center justify-center gap-2 text-[11px]">
                  <span className="text-accent font-bold">raid complete!</span>
                  {userXP > 0 && (
                    <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[9px] font-black text-accent">
                      you earned {userXP} XP
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-[11px] text-text-muted">raid has expired</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
