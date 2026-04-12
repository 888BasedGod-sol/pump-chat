"use client";

import { useState, useRef, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useCommunity } from "@/context/CommunityContext";
import Link from "next/link";

export default function CommunityChat() {
  const { messages, sendMessage, chatFilter, setChatFilter, communities, selectedCommunity, isSignedIn } = useCommunity();
  const { ready, login } = usePrivy();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Must have a specific community selected to chat
  const hasSelectedCommunity = selectedCommunity !== "all";
  const activeCommunity = communities.find((c) => c.ticker === selectedCommunity);

  // Filter messages — each community chat is strictly isolated
  const filteredMessages =
    chatFilter === "all"
      ? messages
      : messages.filter((m) => m.community === chatFilter);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [filteredMessages.length]);

  const handleSend = () => {
    if (!input.trim() || !hasSelectedCommunity) return;
    sendMessage(input);
    setInput("");
  };

  // Build filter tabs — communities that have at least one message, plus "all"
  const activeNames = new Set(messages.map((m) => m.community));
  const filterTabs = [
    "all",
    ...communities.filter((c) => activeNames.has(c.name)).map((c) => c.name),
  ];

  // Top communities by message count for the community picker
  const commsByMessages = [...communities]
    .map((c) => ({
      ...c,
      msgCount: messages.filter((m) => m.community === c.name).length,
    }))
    .sort((a, b) => b.msgCount - a.msgCount);

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-surface overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-surface to-surface-hover border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
              <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">
                {hasSelectedCommunity ? activeCommunity?.name ?? "chat" : "community chat"}
              </h3>
              {hasSelectedCommunity && filteredMessages.length > 0 && (
                <p className="text-[10px] text-text-muted">{filteredMessages.length} message{filteredMessages.length !== 1 ? "s" : ""}</p>
              )}
            </div>
          </div>
          {hasSelectedCommunity && (
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[10px] text-accent font-medium">live</span>
            </div>
          )}
        </div>
        {/* Filter tabs — only show when viewing "all" */}
        {!hasSelectedCommunity && filterTabs.length > 1 && (
          <div className="mt-2 flex items-center gap-1 overflow-x-auto">
            {filterTabs.map((ch) => (
              <button
                key={ch}
                onClick={() => setChatFilter(ch)}
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                  chatFilter === ch
                    ? "bg-accent/10 text-accent"
                    : "text-text-muted hover:bg-surface-hover hover:text-text-secondary"
                }`}
              >
                {ch}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Messages or community picker */}
      <div className="flex-1 overflow-y-auto">
        {!hasSelectedCommunity ? (
          <div className="p-3 space-y-2">
            <p className="text-[11px] text-text-muted text-center py-2">
              select a community to join the conversation
            </p>
            {commsByMessages.slice(0, 10).map((c) => (
              <Link
                key={c.ticker}
                href={`/app/community/${c.ticker}`}
                className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-background/50 px-3 py-2 text-left transition-colors hover:border-accent/40 hover:bg-surface-hover"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent/10 text-[10px] font-bold text-accent">
                  {c.ticker.slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-text-primary">{c.name}</p>
                  <p className="text-[10px] text-text-muted">${c.ticker}</p>
                </div>
                <div className="text-right">
                  {c.msgCount > 0 && (
                    <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                      {c.msgCount}
                    </span>
                  )}
                </div>
              </Link>
            ))}
            {communities.length === 0 && (
              <p className="text-[10px] text-text-muted text-center py-4">
                no communities yet. tokens will auto-create communities.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-0.5 p-3">
            {filteredMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface-hover">
                  <svg className="h-5 w-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-sm text-text-muted mb-1">
                  no messages yet
                </p>
                <p className="text-[10px] text-text-muted">
                  be the first to say something in {activeCommunity?.name ?? "this community"}
                </p>
              </div>
            )}
            {filteredMessages.map((m) => (
              <div key={m.id} className="group flex items-start gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-hover/50">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[9px] font-bold text-accent mt-0.5">
                  {m.user.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-accent truncate">{m.user}</span>
                    <span className="text-[9px] text-text-muted shrink-0">{m.time}</span>
                  </div>
                  <p className="text-xs text-text-secondary break-words leading-relaxed">{m.msg}</p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-2.5 bg-background/30">
        {hasSelectedCommunity && isSignedIn ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={`message ${activeCommunity?.name ?? "community"}...`}
              className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none transition-colors"
            />
            <button
              onClick={handleSend}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-background transition-colors hover:bg-accent-hover"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>
        ) : hasSelectedCommunity && !isSignedIn ? (
          <button
            onClick={() => login()}
            disabled={!ready}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent/10 border border-accent/30 px-3 py-2.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            connect your X to chat
          </button>
        ) : (
          <p className="text-center text-[10px] text-text-muted py-1">
            select a community to start chatting
          </p>
        )}
      </div>
    </div>
  );
}
