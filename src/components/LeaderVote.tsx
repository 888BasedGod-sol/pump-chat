"use client";

import { useState, useEffect, useCallback } from "react";
import { usePrivySafe } from "@/hooks/usePrivySafe";

interface VoteResult {
  candidate: string;
  votes: number;
}

export default function LeaderVote({
  ticker,
  members,
  isMember,
}: {
  ticker: string;
  members: { user: string; joinedAt: number }[];
  isMember: boolean;
}) {
  const { authenticated, getAccessToken } = usePrivySafe();
  const [votes, setVotes] = useState<VoteResult[]>([]);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState("");

  const totalVotes = votes.reduce((sum, v) => sum + v.votes, 0);

  const fetchVotes = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (authenticated) {
        const token = await getAccessToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`/api/communities/vote?ticker=${encodeURIComponent(ticker)}`, { headers });
      if (!res.ok) return;
      const data = await res.json();
      setVotes(data.votes ?? []);
      setMyVote(data.myVote ?? null);
    } catch {
      // silent
    }
  }, [ticker, authenticated, getAccessToken]);

  useEffect(() => {
    fetchVotes();
  }, [fetchVotes]);

  const castVote = useCallback(async (candidate: string) => {
    if (!authenticated || voting) return;
    setVoting(true);
    setError("");
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/communities/vote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ticker, candidate }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Vote failed");
      } else {
        setMyVote(candidate);
        fetchVotes();
      }
    } catch {
      setError("Network error");
    } finally {
      setVoting(false);
    }
  }, [authenticated, voting, ticker, getAccessToken, fetchVotes]);

  // Find the leader (most votes)
  const leader = votes.length > 0 ? votes[0] : null;

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5">
          <svg className="h-3.5 w-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-xs font-bold text-text-primary">Community Leader Vote</h3>
        </div>
        <span className="text-[10px] text-text-muted">{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</span>
      </div>

      {/* Current leader banner */}
      {leader && leader.votes > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-accent/5 border-b border-accent/10">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-accent text-[10px] font-bold">
            {leader.candidate.charAt(1).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <a
              href={`https://x.com/${leader.candidate.replace(/^@/, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-accent hover:underline truncate block"
            >
              {leader.candidate}
            </a>
            <span className="text-[9px] text-text-muted">Current leader · {leader.votes} vote{leader.votes !== 1 ? "s" : ""}</span>
          </div>
          <svg className="h-4 w-4 text-yellow-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </div>
      )}

      {error && (
        <div className="px-3 py-1.5 text-[10px] text-danger bg-danger/5">{error}</div>
      )}

      {/* Candidate list */}
      <div className="max-h-52 overflow-y-auto">
        {members.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-text-muted">
            No members yet — join to start voting!
          </div>
        ) : (
          <div className="divide-y divide-border">
            {members.map((m) => {
              const voteData = votes.find((v) => v.candidate === m.user);
              const voteCount = voteData?.votes ?? 0;
              const pct = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
              const isMyVote = myVote === m.user;
              const isLeader = leader?.candidate === m.user && leader.votes > 0;

              return (
                <div key={m.user} className="relative flex items-center gap-2 px-3 py-2 hover:bg-surface-hover transition-colors">
                  {/* Vote bar background */}
                  {pct > 0 && (
                    <div
                      className="absolute inset-0 bg-accent/5 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  )}

                  <div className="relative flex items-center gap-2 flex-1 min-w-0">
                    <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold shrink-0 ${
                      isLeader ? "bg-accent/20 text-accent" : "bg-surface-hover text-text-secondary"
                    }`}>
                      {m.user.charAt(1).toUpperCase()}
                    </div>
                    <a
                      href={`https://x.com/${m.user.replace(/^@/, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-text-primary hover:text-accent transition-colors truncate"
                    >
                      {m.user}
                    </a>
                    {voteCount > 0 && (
                      <span className="text-[9px] text-text-muted shrink-0">
                        {voteCount} · {pct.toFixed(0)}%
                      </span>
                    )}
                  </div>

                  <div className="relative shrink-0">
                    {authenticated && isMember ? (
                      <button
                        onClick={() => castVote(m.user)}
                        disabled={voting}
                        className={`rounded-md px-2 py-1 text-[10px] font-bold transition-all ${
                          isMyVote
                            ? "bg-accent/15 text-accent border border-accent/30"
                            : "bg-surface-hover text-text-muted hover:text-accent hover:bg-accent/10 border border-transparent"
                        }`}
                      >
                        {isMyVote ? "Voted" : "Vote"}
                      </button>
                    ) : voteCount > 0 ? (
                      <span className="text-[10px] text-text-muted">{voteCount}</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!authenticated && members.length > 0 && (
        <div className="border-t border-border px-3 py-2 text-center">
          <span className="text-[10px] text-text-muted">Sign in & join to vote</span>
        </div>
      )}
      {authenticated && !isMember && members.length > 0 && (
        <div className="border-t border-border px-3 py-2 text-center">
          <span className="text-[10px] text-text-muted">Join the community to vote</span>
        </div>
      )}
    </div>
  );
}
