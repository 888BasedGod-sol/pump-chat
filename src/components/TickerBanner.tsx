"use client";

import { useMemo, useRef, useEffect, useCallback } from "react";
import { useCommunity, type Community } from "@/context/CommunityContext";
import Link from "next/link";

function fmtPct(n: number | null | undefined): string {
  if (n == null) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

function fmtVol(n: number | null | undefined): string {
  if (n == null || n === 0) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

const SPEED = 0.5; // pixels per frame (~30px/s at 60fps)

export default function TickerBanner() {
  const { communities } = useCommunity();
  const scrollRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const rafRef = useRef<number>(0);
  const pausedRef = useRef(false);

  const sorted = useMemo(() => {
    return [...communities]
      .filter((c) => c.volume24h != null && c.volume24h > 0)
      .sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0))
      .slice(0, 30);
  }, [communities]);

  const tick = useCallback(() => {
    const el = scrollRef.current;
    if (el && !pausedRef.current) {
      offsetRef.current += SPEED;
      const half = el.scrollWidth / 2;
      if (offsetRef.current >= half) offsetRef.current -= half;
      el.style.transform = `translate3d(-${offsetRef.current}px, 0, 0)`;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  if (sorted.length === 0) return null;

  // Duplicate items for seamless infinite scroll
  const items = [...sorted, ...sorted];

  return (
    <div
      className="relative w-full overflow-hidden bg-gradient-to-r from-background via-surface to-background border-b border-accent/10"
      onMouseEnter={() => (pausedRef.current = true)}
      onMouseLeave={() => (pausedRef.current = false)}
    >
      <div
        ref={scrollRef}
        className="flex whitespace-nowrap py-1.5 will-change-transform"
      >
        {items.map((c, i) => (
          <TickerItem key={`${c.ticker}-${i}`} community={c} />
        ))}
      </div>
    </div>
  );
}

function TickerItem({ community }: { community: Community }) {
  const pctChange = community.priceChange24h;
  const isUp = pctChange != null && pctChange >= 0;

  return (
    <Link
      href={`/app/community/${community.ticker}`}
      className="inline-flex items-center gap-2 px-4 text-xs shrink-0 hover:bg-accent/5 transition-colors"
    >
      {community.image && (
        <img
          src={community.image}
          alt=""
          className="w-4 h-4 rounded-full ring-1 ring-white/10"
        />
      )}
      <span className="font-semibold text-text-primary">${community.ticker}</span>
      <span
        className={
          isUp
            ? "text-accent font-bold"
            : "text-danger font-bold"
        }
      >
        {fmtPct(pctChange)}
      </span>
      <span className="text-text-muted">Vol {fmtVol(community.volume24h)}</span>
    </Link>
  );
}
