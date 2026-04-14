"use client";

import { useState, useEffect, useRef } from "react";
import { usePrivySafe } from "@/hooks/usePrivySafe";
import Image from "next/image";
import { useCommunity } from "@/context/CommunityContext";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AppHeader() {
  const { ready, authenticated, user, login, logout } = usePrivySafe();
  const { searchQuery, setSearchQuery } = useCommunity();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pathname = usePathname();

  // Debounce search input
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setSearchQuery(localSearch);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [localSearch, setSearchQuery]);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const xUsername = user?.twitter?.username;

  const isActive = (path: string) => pathname === path;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-md relative">
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
      <div className="flex h-12 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:bg-surface-hover md:hidden"
            aria-label="Toggle menu"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
          <Link href="/" className="flex items-center gap-2 text-base font-bold text-accent tracking-tight">
            <Image src="/nobg.png" alt="PumpChat" width={28} height={28} className="rounded-md" />
            PumpChat
          </Link>
          <a
            href="https://x.com/PumpChatDev"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:text-accent hover:bg-surface-hover"
            title="@PumpChatDev"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
          <div className="hidden md:block">
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="search by name, ticker, or contract address"
              className="h-8 w-64 rounded-md border border-border bg-background px-3 text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
            />
          </div>
        </div>
        <nav className="hidden items-center gap-4 text-xs font-medium text-text-secondary md:flex">
          <Link href="/app" className={`transition-colors hover:text-text-primary ${isActive("/app") ? "text-accent" : ""}`}>
            Communities
          </Link>
          <Link href="/app/targets" className={`transition-colors hover:text-text-primary ${isActive("/app/targets") ? "text-accent" : ""}`}>
            Targets
          </Link>
          <Link href="/app/leaderboard" className={`transition-colors hover:text-text-primary ${isActive("/app/leaderboard") ? "text-accent" : ""}`}>
            Leaderboard
          </Link>
          {/* Raid Agent */}
          <button
            className="group relative flex items-center gap-1.5 rounded-md border border-accent/30 bg-accent/5 px-2.5 py-1 text-xs font-bold text-accent transition-colors hover:bg-accent/10 cursor-default"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a2.25 2.25 0 01-1.59.659H9.06a2.25 2.25 0 01-1.591-.659L5 14.5m14 0V5.846a2.087 2.087 0 00-.684-1.544A21.88 21.88 0 0012 3c-2.14 0-4.194.306-6.132.876-.586.172-1.018.7-1.018 1.319v7.305" />
            </svg>
            Raid Agent
            <span className="flex h-4 items-center rounded-full bg-accent/15 px-1.5 text-[8px] font-black uppercase tracking-wider text-accent">
              soon
            </span>
            {/* Tooltip */}
            <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-background border border-border px-2 py-1 text-[10px] text-text-muted opacity-0 transition-opacity group-hover:opacity-100 shadow-lg z-50">
              Automated raiding agent — coming soon
            </span>
          </button>
        </nav>
        <div className="flex items-center gap-2">
          {/* X auth — primary via Privy */}
          {authenticated && xUsername ? (
            <button
              onClick={() => logout()}
              className="flex items-center gap-1.5 rounded-md border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
              title="Sign out"
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              @{xUsername}
              <svg className="h-3 w-3 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3-3l3-3m0 0l-3-3m3 3H9" />
              </svg>
            </button>
          ) : (
            <button
              onClick={() => login()}
              disabled={!ready}
              className="flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1 text-xs font-bold text-background transition-colors hover:bg-accent-hover"
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              sign in with X
            </button>
          )}
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="border-t border-border bg-surface p-3 space-y-2 md:hidden">
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="search by name, ticker, or contract address"
            className="h-8 w-full rounded-md border border-border bg-background px-3 text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
          <div className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            <Link href="/app" onClick={closeMobileMenu} className={`rounded-md px-2 py-1.5 hover:bg-surface-hover ${isActive("/app") ? "text-accent" : "text-text-primary"}`}>
              Communities
            </Link>
            <Link href="/app/targets" onClick={closeMobileMenu} className={`rounded-md px-2 py-1.5 hover:bg-surface-hover ${isActive("/app/targets") ? "text-accent" : ""}`}>
              Targets
            </Link>
            <Link href="/app/leaderboard" onClick={closeMobileMenu} className={`rounded-md px-2 py-1.5 hover:bg-surface-hover ${isActive("/app/leaderboard") ? "text-accent" : ""}`}>
              Leaderboard
            </Link>
            <div className="flex items-center gap-2 rounded-md border border-accent/20 bg-accent/5 px-2 py-1.5">
              <svg className="h-3.5 w-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a2.25 2.25 0 01-1.59.659H9.06a2.25 2.25 0 01-1.591-.659L5 14.5m14 0V5.846a2.087 2.087 0 00-.684-1.544A21.88 21.88 0 0012 3c-2.14 0-4.194.306-6.132.876-.586.172-1.018.7-1.018 1.319v7.305" />
              </svg>
              <span className="text-accent font-bold">Raid Agent</span>
              <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-accent">coming soon</span>
            </div>
          </div>
          {authenticated && xUsername ? (
            <button
              onClick={() => logout()}
              className="flex w-full items-center justify-center gap-1.5 rounded-md border border-accent/30 bg-accent/10 px-2.5 py-1.5 text-xs font-medium text-accent"
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              @{xUsername} · sign out
            </button>
          ) : (
            <button
              onClick={() => login()}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-accent px-2.5 py-1.5 text-xs font-bold text-background"
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              sign in with X
            </button>
          )}
        </div>
      )}
    </header>
  );
}
