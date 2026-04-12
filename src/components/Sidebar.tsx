"use client";

import { useState } from "react";
import { useCommunity } from "@/context/CommunityContext";
import TokenImage from "@/components/TokenImage";

export default function Sidebar() {
  const { communities, selectedCommunity, selectCommunity, raids, addCommunity, searchQuery, setSearchQuery, joinedCommunities } = useCommunity();
  const [showAdd, setShowAdd] = useState(false);
  const [newTicker, setNewTicker] = useState("");
  const [newMint, setNewMint] = useState("");
  const [addError, setAddError] = useState("");

  const filteredCommunities = searchQuery
    ? communities.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.mint.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : communities;

  const totalMembers = communities.reduce((sum, c) => sum + c.members, 0);

  return (
    <aside className="hidden w-56 shrink-0 border-r border-border bg-surface/50 md:flex md:flex-col">
      {/* Communities Section */}
      <div className="flex-1 overflow-y-auto p-3">
        <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-text-muted">
          communities
        </p>
        <div className="space-y-0.5">
          {filteredCommunities.map((c) => (
            <button
              key={c.ticker}
              onClick={() => {
                selectCommunity(c.ticker);
                document.getElementById("community-chat")?.scrollIntoView({ behavior: "smooth" });
              }}
              className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors ${
                selectedCommunity === c.ticker
                  ? "bg-accent/10 border border-accent/30"
                  : "hover:bg-surface-hover"
              }`}
            >
              <TokenImage src={c.image} ticker={c.ticker} size="sm" />
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-xs font-medium text-text-primary">
                  {c.name}
                </p>
                <p className="text-[10px] text-text-muted">
                  {c.members} member{c.members !== 1 ? "s" : ""}
                  {joinedCommunities.has(c.ticker) && <span className="text-accent"> · joined</span>}
                </p>
              </div>
              {c.active && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              )}
            </button>
          ))}

          {communities.length === 0 && (
            <p className="px-2 py-3 text-[10px] text-text-muted text-center">
              no communities yet. join or create one below.
            </p>
          )}
        </div>

        <button
          onClick={() => setShowAdd(!showAdd)}
          className="mt-2 w-full rounded-md border border-dashed border-border px-2 py-1.5 text-[10px] font-medium text-text-muted transition-colors hover:border-accent hover:text-accent"
        >
          + join community
        </button>

        {showAdd && (
          <div className="mt-2 space-y-1.5 rounded-md border border-border bg-background p-2">
            <input
              type="text"
              value={newTicker}
              onChange={(e) => setNewTicker(e.target.value)}
              placeholder="ticker (e.g. MYTOKEN)"
              className="w-full rounded border border-border bg-surface px-2 py-1 text-[10px] text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
            />
            <input
              type="text"
              value={newMint}
              onChange={(e) => setNewMint(e.target.value)}
              placeholder="token mint address"
              className="w-full rounded border border-border bg-surface px-2 py-1 text-[10px] text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none font-mono"
            />
            <div className="flex gap-1">
              <button
                onClick={() => {
                  if (!newTicker.trim() || !newMint.trim()) return;
                  const ticker = newTicker.trim().toUpperCase();
                  const mint = newMint.trim();
                  if (communities.some((c) => c.mint === mint)) {
                    setAddError("a community already exists for this token");
                    return;
                  }
                  if (communities.some((c) => c.ticker === ticker)) {
                    setAddError("a community with this ticker already exists");
                    return;
                  }
                  setAddError("");
                  addCommunity(newTicker, `$${newTicker.toUpperCase()}`, mint);
                  setNewTicker("");
                  setNewMint("");
                  setShowAdd(false);
                }}
                className="flex-1 rounded bg-accent px-2 py-1 text-[10px] font-bold text-background hover:bg-accent-hover"
              >
                add
              </button>
              <button
                onClick={() => { setShowAdd(false); setAddError(""); }}
                className="rounded border border-border px-2 py-1 text-[10px] text-text-muted hover:text-text-secondary"
              >
                cancel
              </button>
            </div>
            {addError && (
              <p className="text-[10px] text-danger">{addError}</p>
            )}
          </div>
        )}

        {/* Quick Links */}
        <p className="mb-2 mt-5 px-2 text-[10px] font-bold uppercase tracking-widest text-text-muted">
          tools
        </p>
        <div className="space-y-0.5">
          {[
            { label: "tweet raids", id: "raid-panel" },
            { label: "token scanner", id: "token-feed" },
            { label: "leaderboard", id: "leaderboard" },
            { label: "chat", id: "community-chat" },
          ].map((link) => (
            <button
              key={link.label}
              onClick={() => document.getElementById(link.id)?.scrollIntoView({ behavior: "smooth" })}
              className="block w-full text-left rounded-md px-2 py-1.5 text-xs text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
            >
              {link.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom stats */}
      <div className="border-t border-border p-3">
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-md bg-background p-2">
            <p className="text-xs font-bold text-text-primary">{totalMembers}</p>
            <p className="text-[10px] text-text-muted">members</p>
          </div>
          <div className="rounded-md bg-background p-2">
            <p className="text-xs font-bold text-accent">{raids.length}</p>
            <p className="text-[10px] text-text-muted">raids</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
