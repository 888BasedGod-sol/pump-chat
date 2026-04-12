"use client";

import { useState } from "react";
import { useCommunity } from "@/context/CommunityContext";
import TokenImage from "@/components/TokenImage";

export default function MobileSidebar() {
  const { communities, selectedCommunity, selectCommunity, raids, addCommunity, joinedCommunities } = useCommunity();
  const [open, setOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newTicker, setNewTicker] = useState("");
  const [newMint, setNewMint] = useState("");
  const [addError, setAddError] = useState("");

  const totalMembers = communities.reduce((sum, c) => sum + c.members, 0);

  return (
    <>
      {/* Floating toggle button - only on mobile */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-accent text-background shadow-lg md:hidden"
        aria-label="Open communities"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-out panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-border bg-surface transition-transform duration-200 md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-12 items-center justify-between border-b border-border px-4">
          <span className="text-sm font-bold text-accent">communities</span>
          <button
            onClick={() => setOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-surface-hover"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="space-y-0.5">
            {communities.map((c) => (
              <button
                key={c.ticker}
                onClick={() => {
                  selectCommunity(c.ticker);
                  setOpen(false);
                  setTimeout(() => document.getElementById("community-chat")?.scrollIntoView({ behavior: "smooth" }), 200);
                }}
                className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors ${
                  selectedCommunity === c.ticker
                    ? "bg-accent/10 border border-accent/30"
                    : "hover:bg-surface-hover"
                }`}
              >
                <TokenImage src={c.image} ticker={c.ticker} size="sm" />
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-xs font-medium text-text-primary">{c.name}</p>
                  <p className="text-[10px] text-text-muted">
                    {c.members} member{c.members !== 1 ? "s" : ""}
                    {joinedCommunities.has(c.ticker) && <span className="text-accent"> · joined</span>}
                  </p>
                </div>
                {c.active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
              </button>
            ))}

            {communities.length === 0 && (
              <p className="px-2 py-3 text-[10px] text-text-muted text-center">
                No communities yet. Join one below.
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
              {addError && <p className="text-[10px] text-danger">{addError}</p>}
            </div>
          )}
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
    </>
  );
}
