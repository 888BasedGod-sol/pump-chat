"use client";

import { useState, useCallback } from "react";

/**
 * Rewrite unreliable IPFS gateway URLs to Cloudflare's gateway.
 * ipfs.io is notoriously slow/flaky; Cloudflare's is fast and cached.
 */
function optimizeImageUrl(url: string): string {
  if (!url) return url;
  // Rewrite ipfs.io → cloudflare-ipfs.com
  if (url.includes("ipfs.io/ipfs/")) {
    return url.replace("https://ipfs.io/ipfs/", "https://cloudflare-ipfs.com/ipfs/");
  }
  return url;
}

interface TokenImageProps {
  src: string | undefined | null;
  ticker: string;
  alt?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-7 w-7 text-[9px]",
  md: "h-10 w-10 text-xs",
  lg: "h-12 w-12 text-sm",
};

export default function TokenImage({
  src,
  ticker,
  alt,
  size = "md",
  className = "",
}: TokenImageProps) {
  const [failed, setFailed] = useState(false);
  const onError = useCallback(() => setFailed(true), []);

  const sz = sizeClasses[size];
  const optimized = src ? optimizeImageUrl(src) : null;

  if (optimized && !failed) {
    return (
      <img
        src={optimized}
        alt={alt ?? ticker}
        onError={onError}
        loading="lazy"
        className={`${sz} shrink-0 rounded-lg object-cover ring-1 ring-border ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sz} shrink-0 flex items-center justify-center rounded-lg bg-accent/10 font-bold text-accent ring-1 ring-accent/20 ${className}`}
    >
      {ticker.slice(0, 2)}
    </div>
  );
}
