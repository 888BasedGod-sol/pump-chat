"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useCommunity } from "@/context/CommunityContext";
import TokenDetail from "@/components/TokenDetail";

function TokenImage({ src, alt, symbol, complete }: { src: string; alt: string; symbol: string; complete: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${complete ? "bg-accent/10 text-accent" : "bg-warning/10 text-warning"}`}>
        {symbol ? symbol.slice(0, 2).toUpperCase() : complete ? "G" : "B"}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className="h-9 w-9 shrink-0 rounded-lg object-cover"
      onError={() => setFailed(true)}
    />
  );
}

interface Token {
  address: string;
  name: string;
  symbol: string;
  image: string;
  virtualSolReserves: string;
  realSolReserves: number;
  tokenTotalSupply: string;
  complete: boolean;
  marketCapSol: number;
  progressPercent: number;
  priceUsd: number | null;
  priceChange24h: number | null;
  volume24h: number | null;
  liquidity: number | null;
  fdv: number | null;
  pairUrl: string | null;
  txns24h: { buys: number; sells: number } | null;
  createdAt: number | null;
}

export default function TokenFeed() {
  const { syncTokenCommunities } = useCommunity();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "graduated">("all");
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);

  const fetchTokens = useCallback(async () => {
    try {
      const res = await fetch("/api/tokens");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setTokens(data.tokens);
      setError(null);

      // Auto-create communities for every token from pumpfun
      if (data.tokens?.length > 0) {
        syncTokenCommunities(data.tokens);
      }
    } catch {
      setError("Failed to load tokens. RPC may be rate-limited.");
    } finally {
      setLoading(false);
    }
  }, [syncTokenCommunities]);

  useEffect(() => {
    fetchTokens();
    // Poll every 15 seconds for new tokens
    const interval = setInterval(fetchTokens, 15_000);
    return () => clearInterval(interval);
  }, [fetchTokens]);

  const filteredTokens = useMemo(() => tokens.filter((t) => {
    if (filter === "active") return !t.complete;
    if (filter === "graduated") return t.complete;
    return true;
  }), [tokens, filter]);

  const shortenAddress = (addr: string) =>
    `${addr.slice(0, 4)}...${addr.slice(-4)}`;

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-border bg-surface p-4"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-background" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 rounded bg-background" />
                <div className="h-3 w-32 rounded bg-background" />
              </div>
            </div>
            <div className="mt-3 flex gap-3 border-t border-border pt-3">
              <div className="h-3 w-16 rounded bg-background" />
              <div className="h-3 w-20 rounded bg-background" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/5 p-6 text-center">
        <p className="text-sm text-danger">{error}</p>
        <button
          onClick={fetchTokens}
          className="mt-3 rounded-lg bg-surface px-4 py-2 text-xs font-medium text-text-secondary hover:text-text-primary"
        >
          retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Token detail overlay */}
      {selectedToken && (
        <div className="mb-4">
          <TokenDetail token={selectedToken} onClose={() => setSelectedToken(null)} />
        </div>
      )}

      {/* Filter bar */}
      <div className="mb-4 flex items-center gap-2">
        {(["all", "active", "graduated"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
              filter === f
                ? "bg-accent/15 text-accent"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {f === "all" ? "all tokens" : f === "active" ? "bonding" : "graduated"}
          </button>
        ))}
        <span className="ml-auto text-xs text-text-muted">
          {filteredTokens.length} tokens · live
        </span>
      </div>

      {/* Token cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
        {filteredTokens.map((token) => (
          <div
            key={token.address}
            onClick={() => setSelectedToken(token)}
            className={`group cursor-pointer rounded-xl border bg-surface p-4 transition-all hover:border-accent/40 hover:bg-surface-hover ${
              selectedToken?.address === token.address
                ? "border-accent/60 ring-1 ring-accent/20"
                : "border-border"
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              {token.image ? (
                <TokenImage src={token.image} alt={token.name || token.symbol || "token"} symbol={token.symbol} complete={token.complete} />
              ) : (
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${token.complete ? "bg-accent/10 text-accent" : "bg-warning/10 text-warning"}`}>
                  {token.symbol ? token.symbol.slice(0, 2).toUpperCase() : token.complete ? "G" : "B"}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    {token.name ? (
                      <>
                        <p className="text-sm font-bold text-text-primary group-hover:text-accent transition-colors truncate">
                          {token.name}
                        </p>
                        <p className="text-[10px] text-text-muted font-mono">
                          {token.symbol ? `$${token.symbol}` : ""} {shortenAddress(token.address)}
                        </p>
                      </>
                    ) : (
                      <p className="font-mono text-sm font-bold text-text-primary group-hover:text-accent transition-colors">
                        {shortenAddress(token.address)}
                      </p>
                    )}
                  </div>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      token.complete
                        ? "bg-accent/15 text-accent"
                        : "bg-warning/15 text-warning"
                    }`}
                  >
                    {token.complete ? "GRADUATED" : "BONDING"}
                  </span>
                </div>

                {/* Progress bar */}
                {!token.complete && (
                  <div className="mt-2">
                    <div className="flex justify-between text-[10px] text-text-muted mb-1">
                      <span>bonding curve</span>
                      <span>{token.progressPercent}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-background">
                      <div
                        className="h-full rounded-full bg-accent transition-all"
                        style={{ width: `${Math.min(token.progressPercent, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="mt-3 flex items-center gap-4 border-t border-border pt-3 text-[11px] text-text-muted">
              <span>{token.marketCapSol} SOL mcap</span>
              <span>{token.realSolReserves.toFixed(2)} SOL liq</span>
              <a
                href={`https://pump.fun/coin/${token.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-accent hover:underline"
              >
                view ↗
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
