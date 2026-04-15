"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    twttr?: {
      widgets: {
        createTweet: (
          tweetId: string,
          el: HTMLElement,
          options?: Record<string, unknown>
        ) => Promise<HTMLElement | undefined>;
      };
    };
  }
}

let scriptLoaded = false;
let scriptLoading = false;
const loadCallbacks: (() => void)[] = [];

function loadTwitterScript() {
  if (scriptLoaded) return Promise.resolve();
  if (scriptLoading) {
    return new Promise<void>((resolve) => {
      loadCallbacks.push(resolve);
    });
  }
  scriptLoading = true;
  return new Promise<void>((resolve) => {
    loadCallbacks.push(resolve);
    const script = document.createElement("script");
    script.src = "https://platform.twitter.com/widgets.js";
    script.async = true;
    script.onload = () => {
      scriptLoaded = true;
      scriptLoading = false;
      for (const cb of loadCallbacks) cb();
      loadCallbacks.length = 0;
    };
    document.head.appendChild(script);
  });
}

interface TweetEmbedProps {
  tweetId: string;
}

export default function TweetEmbed({ tweetId }: TweetEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const el = containerRef.current;
    if (!el) return;

    loadTwitterScript().then(() => {
      if (cancelled || !window.twttr) {
        if (!cancelled) setError(true);
        return;
      }

      // Clear any previous embed
      el.innerHTML = "";

      window.twttr.widgets
        .createTweet(tweetId, el, {
          theme: "dark",
          dnt: true,
          conversation: "none",
          cards: "hidden",
          width: 400,
        })
        .then((tweet) => {
          if (cancelled) return;
          if (tweet) {
            setLoaded(true);
          } else {
            setError(true);
          }
        })
        .catch(() => {
          if (!cancelled) setError(true);
        });
    });

    return () => {
      cancelled = true;
    };
  }, [tweetId]);

  if (error) {
    return (
      <a
        href={`https://x.com/i/status/${tweetId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 rounded-xl border border-border bg-background/50 p-3 text-xs text-text-muted hover:text-accent transition-colors"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        view tweet on X
      </a>
    );
  }

  return (
    <div className="mb-3 rounded-xl overflow-hidden [&_twitter-widget]:!max-w-full [&_iframe]:!max-w-full">
      {!loaded && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-background/50 p-4">
          <div className="h-4 w-4 animate-smooth-spin rounded-full border-2 border-accent/30 border-t-accent" />
          <span className="text-[11px] text-text-muted">loading tweet...</span>
        </div>
      )}
      <div ref={containerRef} className={loaded ? "" : "h-0 overflow-hidden"} />
    </div>
  );
}
