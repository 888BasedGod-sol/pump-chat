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
    <header className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-md">
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
          <Link href="/app" className="flex items-center gap-2 text-base font-bold text-accent tracking-tight">
            <Image src="/logo.png" alt="PumpChat" width={28} height={28} className="rounded-md" />
            PumpChat
          </Link>
          <div className="hidden md:block">
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="search for token or community"
              className="h-8 w-64 rounded-md border border-border bg-background px-3 text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
            />
          </div>
        </div>
        <nav className="hidden items-center gap-4 text-xs font-medium text-text-secondary md:flex">
          <Link href="/app" className={`transition-colors hover:text-text-primary ${isActive("/app") ? "text-accent" : ""}`}>
            communities
          </Link>
          <Link href="/app/leaderboard" className={`transition-colors hover:text-text-primary ${isActive("/app/leaderboard") ? "text-accent" : ""}`}>
            leaderboard
          </Link>
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
            placeholder="search for token or community"
            className="h-8 w-full rounded-md border border-border bg-background px-3 text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
          <div className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            <Link href="/app" onClick={closeMobileMenu} className={`rounded-md px-2 py-1.5 hover:bg-surface-hover ${isActive("/app") ? "text-accent" : "text-text-primary"}`}>
              communities
            </Link>
            <Link href="/app/leaderboard" onClick={closeMobileMenu} className={`rounded-md px-2 py-1.5 hover:bg-surface-hover ${isActive("/app/leaderboard") ? "text-accent" : ""}`}>
              leaderboard
            </Link>
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
