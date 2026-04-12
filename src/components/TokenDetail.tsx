"use client";

import { useEffect, useState, useRef, useCallback } from "react";

interface TokenDetailProps {
  token: {
    address: string;
    name: string;
    symbol: string;
    image: string;
    realSolReserves: number;
    tokenTotalSupply: string;
    complete: boolean;
    marketCapSol: number;
    progressPercent: number;
  };
  onClose: () => void;
}

interface ChartPoint {
  pct: number;   // bonding curve % (x-axis)
  sol: number;   // SOL mcap value (y-axis)
}

export default function TokenDetail({ token, onClose }: TokenDetailProps) {
  const [liveData, setLiveData] = useState<{
    marketCap: number;
    progressPercent: number;
    isGraduated: boolean;
  } | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch live bonding curve data
  useEffect(() => {
    let cancelled = false;
    async function fetchDetail() {
      try {
        const res = await fetch(`/api/tokens/${token.address}`);
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        if (!cancelled) {
          setLiveData({
            marketCap: data.marketCap ?? token.marketCapSol,
            progressPercent: data.progressPercent ?? token.progressPercent,
            isGraduated: data.isGraduated ?? token.complete,
          });
        }
      } catch {
        if (!cancelled) {
          setLiveData({
            marketCap: token.marketCapSol,
            progressPercent: token.progressPercent,
            isGraduated: token.complete,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchDetail();
    return () => { cancelled = true; };
  }, [token]);

  // Build bonding curve chart data (pump.fun uses x*y=k variant)
  // More points for smoother curve
  useEffect(() => {
    const points: ChartPoint[] = [];
    const progress = liveData?.progressPercent ?? token.progressPercent;
    const mcap = liveData?.marketCap ?? token.marketCapSol;
    const steps = 50;
    for (let i = 0; i <= steps; i++) {
      const pct = (i / steps) * Math.max(progress, 1);
      // Bonding curve pricing: price increases super-linearly with supply sold
      const sol = progress > 0 ? mcap * (pct / progress) ** 1.8 : 0;
      points.push({ pct, sol: Math.round(sol * 1000) / 1000 });
    }
    // Also project the full curve to 100% (dimmed)
    if (progress < 100) {
      for (let i = 1; i <= 20; i++) {
        const pct = progress + (i / 20) * (100 - progress);
        const sol = mcap * (pct / progress) ** 1.8;
        points.push({ pct, sol: Math.round(sol * 1000) / 1000 });
      }
    }
    setChartData(points);
  }, [liveData, token]);

  const mcap = liveData?.marketCap ?? token.marketCapSol;
  const progress = liveData?.progressPercent ?? token.progressPercent;
  const graduated = liveData?.isGraduated ?? token.complete;
  const chartMax = Math.max(...chartData.map((p) => p.sol), 0.01);

  /* ---- Chart geometry (pixel coords in viewBox) ---- */
  const W = 600;
  const H = 220;
  const PAD = { top: 16, right: 16, bottom: 28, left: 52 };
  const cw = W - PAD.left - PAD.right;
  const ch = H - PAD.top - PAD.bottom;

  const xScale = (pct: number) =>
    PAD.left + (pct / Math.max(...chartData.map((p) => p.pct), 1)) * cw;
  const yScale = (sol: number) =>
    PAD.top + ch - (sol / chartMax) * ch;

  // Split data into realized (up to progress%) and projected (beyond)
  const realized = chartData.filter((p) => p.pct <= progress + 0.01);
  const projected = chartData.filter((p) => p.pct >= progress - 0.01);

  // Build smooth path using SVG cubic bezier (monotone approximation)
  const buildPath = (pts: ChartPoint[]) => {
    if (pts.length < 2) return "";
    const coords = pts.map((p) => ({ x: xScale(p.pct), y: yScale(p.sol) }));
    let d = `M ${coords[0].x},${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      const cpx = (prev.x + curr.x) / 2;
      d += ` C ${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
    }
    return d;
  };

  // Area path (closed back to baseline)
  const buildArea = (pts: ChartPoint[]) => {
    if (pts.length < 2) return "";
    const coords = pts.map((p) => ({ x: xScale(p.pct), y: yScale(p.sol) }));
    const baseline = PAD.top + ch;
    let d = `M ${coords[0].x},${baseline}`;
    d += ` L ${coords[0].x},${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      const cpx = (prev.x + curr.x) / 2;
      d += ` C ${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
    }
    d += ` L ${coords[coords.length - 1].x},${baseline} Z`;
    return d;
  };

  // Hover state
  const chartRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = chartRef.current;
      if (!svg || chartData.length === 0) return;
      const rect = svg.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * W;
      // Find closest point
      let closest = 0;
      let minDist = Infinity;
      for (let i = 0; i < chartData.length; i++) {
        const px = xScale(chartData[i].pct);
        const dist = Math.abs(px - mouseX);
        if (dist < minDist) {
          minDist = dist;
          closest = i;
        }
      }
      setHoverIdx(closest);
    },
    [chartData]
  );

  const hoverPoint = hoverIdx !== null ? chartData[hoverIdx] : null;

  // Y-axis tick values
  const yTicks = [0, chartMax * 0.25, chartMax * 0.5, chartMax * 0.75, chartMax];
  // X-axis ticks
  const maxPct = Math.max(...chartData.map((p) => p.pct), 1);
  const xTicks = [0, Math.round(maxPct * 0.25), Math.round(maxPct * 0.5), Math.round(maxPct * 0.75), Math.round(maxPct)];

  // Current price dot position
  const currentX = realized.length > 0 ? xScale(realized[realized.length - 1].pct) : 0;
  const currentY = realized.length > 0 ? yScale(realized[realized.length - 1].sol) : 0;

  return (
    <div className="rounded-xl border border-accent/30 bg-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-surface-hover/30">
        <div className="flex items-center gap-3 min-w-0">
          {token.image ? (
            <img
              src={token.image}
              alt={token.name || token.symbol}
              className="h-10 w-10 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${graduated ? "bg-accent/10 text-accent" : "bg-warning/10 text-warning"}`}>
              {token.symbol ? token.symbol.slice(0, 2).toUpperCase() : "??"}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-text-primary truncate">
                {token.name || token.symbol || token.address.slice(0, 8)}
              </h3>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${graduated ? "bg-accent/15 text-accent" : "bg-warning/15 text-warning"}`}>
                {graduated ? "GRADUATED" : "BONDING"}
              </span>
            </div>
            <p className="text-[10px] text-text-muted font-mono">
              {token.symbol ? `$${token.symbol}` : ""} {token.address.slice(0, 6)}...{token.address.slice(-4)}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-md border border-border p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors flex-shrink-0"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
        {[
          { label: "market cap", value: `${mcap} SOL` },
          { label: "liquidity", value: `${token.realSolReserves.toFixed(2)} SOL` },
          { label: "supply", value: token.tokenTotalSupply },
          { label: "progress", value: `${progress}%` },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface px-4 py-3">
            <p className="text-[9px] font-medium text-text-muted uppercase tracking-wide">{stat.label}</p>
            <p className="text-sm font-bold text-text-primary mt-0.5">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Bonding curve progress */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-medium text-text-muted uppercase tracking-wide">bonding curve</span>
          <span className="text-[10px] font-bold text-accent">{progress}% / 100%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-background">
          <div
            className={`h-full rounded-full transition-all ${graduated ? "bg-accent" : "bg-warning"}`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <p className="text-[9px] text-text-muted mt-1">
          {graduated
            ? "this token has graduated from the bonding curve and is now on raydium"
            : `${(85 - token.realSolReserves).toFixed(1)} SOL remaining until graduation (~85 SOL target)`}
        </p>
      </div>

      {/* Price chart */}
      <div className="px-4 pt-2 pb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-medium text-text-muted uppercase tracking-wide">
            bonding curve chart
          </span>
          <div className="flex items-center gap-3">
            {hoverPoint && (
              <span className="text-[10px] font-mono text-text-secondary">
                {hoverPoint.sol.toFixed(2)} SOL @ {hoverPoint.pct.toFixed(0)}%
              </span>
            )}
            {loading && (
              <span className="text-[9px] text-text-muted animate-pulse">loading...</span>
            )}
          </div>
        </div>
        <div className="relative w-full rounded-lg border border-border bg-background/50 overflow-hidden">
          <svg
            ref={chartRef}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto"
            style={{ minHeight: 180 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoverIdx(null)}
          >
            {/* Grid lines */}
            {yTicks.map((val, i) => {
              const y = yScale(val);
              return (
                <g key={`y-${i}`}>
                  <line
                    x1={PAD.left}
                    y1={y}
                    x2={W - PAD.right}
                    y2={y}
                    stroke="#ffffff"
                    strokeOpacity={0.06}
                    strokeWidth={1}
                    strokeDasharray={i === 0 ? "none" : "4 3"}
                  />
                  <text
                    x={PAD.left - 6}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-current text-text-muted"
                    fontSize={9}
                    fontFamily="monospace"
                  >
                    {val >= 10 ? val.toFixed(0) : val.toFixed(1)}
                  </text>
                </g>
              );
            })}

            {/* X-axis ticks */}
            {xTicks.map((pct, i) => {
              const x = xScale(pct);
              return (
                <g key={`x-${i}`}>
                  <line
                    x1={x}
                    y1={PAD.top}
                    x2={x}
                    y2={PAD.top + ch}
                    stroke="#ffffff"
                    strokeOpacity={0.04}
                    strokeWidth={1}
                  />
                  <text
                    x={x}
                    y={H - 6}
                    textAnchor="middle"
                    className="fill-current text-text-muted"
                    fontSize={9}
                    fontFamily="monospace"
                  >
                    {pct}%
                  </text>
                </g>
              );
            })}

            {/* Gradient defs */}
            <defs>
              <linearGradient id={`areaGrad-${token.address}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4ade80" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#4ade80" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id={`projGrad-${token.address}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4ade80" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#4ade80" stopOpacity={0.01} />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Projected area + line (dimmed, dashed) */}
            {projected.length > 1 && progress < 100 && (
              <>
                <path d={buildArea(projected)} fill={`url(#projGrad-${token.address})`} />
                <path
                  d={buildPath(projected)}
                  fill="none"
                  stroke="#4ade80"
                  strokeOpacity={0.2}
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                />
              </>
            )}

            {/* Realized area fill */}
            {realized.length > 1 && (
              <path d={buildArea(realized)} fill={`url(#areaGrad-${token.address})`} />
            )}

            {/* Realized curve line */}
            {realized.length > 1 && (
              <path
                d={buildPath(realized)}
                fill="none"
                stroke="#4ade80"
                strokeWidth={2.5}
                strokeLinecap="round"
              />
            )}

            {/* Current price dot with glow */}
            {realized.length > 0 && (
              <g filter="url(#glow)">
                <circle cx={currentX} cy={currentY} r={5} fill="#4ade80" fillOpacity={0.3} />
                <circle cx={currentX} cy={currentY} r={3} fill="#4ade80" />
              </g>
            )}

            {/* Current price horizontal dashed line */}
            {realized.length > 0 && (
              <line
                x1={PAD.left}
                y1={currentY}
                x2={currentX}
                y2={currentY}
                stroke="#4ade80"
                strokeOpacity={0.15}
                strokeWidth={1}
                strokeDasharray="3 3"
              />
            )}

            {/* Hover crosshair + tooltip */}
            {hoverPoint && hoverIdx !== null && (
              <>
                {/* Vertical line */}
                <line
                  x1={xScale(hoverPoint.pct)}
                  y1={PAD.top}
                  x2={xScale(hoverPoint.pct)}
                  y2={PAD.top + ch}
                  stroke="#ffffff"
                  strokeOpacity={0.15}
                  strokeWidth={1}
                  strokeDasharray="3 2"
                />
                {/* Horizontal line */}
                <line
                  x1={PAD.left}
                  y1={yScale(hoverPoint.sol)}
                  x2={W - PAD.right}
                  y2={yScale(hoverPoint.sol)}
                  stroke="#ffffff"
                  strokeOpacity={0.1}
                  strokeWidth={1}
                  strokeDasharray="3 2"
                />
                {/* Hover dot */}
                <circle
                  cx={xScale(hoverPoint.pct)}
                  cy={yScale(hoverPoint.sol)}
                  r={4}
                  fill={hoverPoint.pct <= progress ? "#4ade80" : "#4ade80"}
                  fillOpacity={hoverPoint.pct <= progress ? 1 : 0.4}
                  stroke="#0e0f14"
                  strokeWidth={2}
                />
                {/* Tooltip background */}
                <rect
                  x={Math.min(xScale(hoverPoint.pct) - 52, W - PAD.right - 104)}
                  y={Math.max(yScale(hoverPoint.sol) - 36, PAD.top)}
                  width={104}
                  height={26}
                  rx={4}
                  fill="#1a1b23"
                  stroke="#2a2b35"
                  strokeWidth={1}
                />
                <text
                  x={Math.min(xScale(hoverPoint.pct), W - PAD.right - 52)}
                  y={Math.max(yScale(hoverPoint.sol) - 18, PAD.top + 14)}
                  textAnchor="middle"
                  className="fill-current text-text-primary"
                  fontSize={10}
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {hoverPoint.sol.toFixed(2)} SOL · {hoverPoint.pct.toFixed(0)}%
                </text>
              </>
            )}

            {/* Y-axis label */}
            <text
              x={12}
              y={PAD.top + ch / 2}
              textAnchor="middle"
              transform={`rotate(-90, 12, ${PAD.top + ch / 2})`}
              className="fill-current text-text-muted"
              fontSize={9}
            >
              SOL
            </text>

            {/* X-axis label */}
            <text
              x={PAD.left + cw / 2}
              y={H - 0}
              textAnchor="middle"
              className="fill-current text-text-muted"
              fontSize={9}
            >
              bonding curve progress
            </text>
          </svg>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="h-0.5 w-3 rounded bg-accent" />
              <span className="text-[9px] text-text-muted">realized</span>
            </div>
            {progress < 100 && (
              <div className="flex items-center gap-1">
                <div className="h-0.5 w-3 rounded bg-accent/20" style={{ backgroundImage: "repeating-linear-gradient(90deg, #4ade8033, #4ade8033 3px, transparent 3px, transparent 6px)" }} />
                <span className="text-[9px] text-text-muted">projected</span>
              </div>
            )}
          </div>
          <span className="text-[9px] text-text-muted">hover to inspect</span>
        </div>
      </div>

      {/* Action links */}
      <div className="flex items-center gap-2 border-t border-border px-4 py-3">
        <a
          href={`https://pump.fun/coin/${token.address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 rounded-md bg-accent/10 px-3 py-2 text-center text-[10px] font-bold text-accent transition-colors hover:bg-accent/20"
        >
          view on pump.fun
        </a>
        <a
          href={`https://solscan.io/token/${token.address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 rounded-md border border-border px-3 py-2 text-center text-[10px] font-medium text-text-muted transition-colors hover:text-text-secondary hover:bg-surface-hover"
        >
          solscan
        </a>
        <a
          href={`https://birdeye.so/token/${token.address}?chain=solana`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 rounded-md border border-border px-3 py-2 text-center text-[10px] font-medium text-text-muted transition-colors hover:text-text-secondary hover:bg-surface-hover"
        >
          birdeye
        </a>
      </div>
    </div>
  );
}
