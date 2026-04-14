"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// Free lofi/chill radio streams (royalty-free)
const STATIONS = [
  { name: "Lofi Hip Hop", url: "https://stream.zeno.fm/0r0xa792kwzuv" },
  { name: "Chillhop", url: "https://stream.zeno.fm/fyn8eh3h5f8uv" },
  { name: "Jazz Vibes", url: "https://stream.zeno.fm/f3wvbbqmdg8uv" },
];

export default function MusicPlayer() {
  const [playing, setPlaying] = useState(false);
  const [stationIdx, setStationIdx] = useState(0);
  const [volume, setVolume] = useState(0.4);
  const [expanded, setExpanded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const station = STATIONS[stationIdx];

  // Create / update audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = volume;
    }
    audioRef.current.src = station.url;
    if (playing) {
      audioRef.current.play().catch(() => setPlaying(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationIdx]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
    }
  }, [playing]);

  const nextStation = useCallback(() => {
    setStationIdx((i) => (i + 1) % STATIONS.length);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Expanded panel */}
      {expanded && (
        <div className="mb-2 w-56 rounded-xl border border-border bg-surface/95 backdrop-blur-md shadow-lg p-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Station name */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-text-primary truncate">{station.name}</span>
            <button
              onClick={nextStation}
              className="text-[10px] text-accent hover:text-accent-hover font-medium transition-colors"
            >
              next →
            </button>
          </div>

          {/* Playback indicator */}
          {playing && (
            <div className="flex items-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-1 bg-accent rounded-full animate-pulse"
                  style={{
                    height: `${8 + Math.random() * 10}px`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: `${0.5 + Math.random() * 0.5}s`,
                  }}
                />
              ))}
              <span className="ml-1.5 text-[9px] text-accent font-medium">LIVE</span>
            </div>
          )}

          {/* Volume slider */}
          <div className="flex items-center gap-2">
            <svg className="h-3 w-3 text-text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 6l-4 4H4v4h4l4 4V6z" />
            </svg>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="flex-1 h-1 rounded-full appearance-none bg-border accent-accent cursor-pointer"
            />
          </div>

          {/* All stations */}
          <div className="mt-2 space-y-1">
            {STATIONS.map((s, i) => (
              <button
                key={s.name}
                onClick={() => setStationIdx(i)}
                className={`w-full text-left rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
                  i === stationIdx
                    ? "bg-accent/15 text-accent"
                    : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Floating button */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface/95 backdrop-blur-md shadow-lg text-text-secondary hover:text-accent hover:border-accent transition-all"
          title="Music player"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        </button>
        <button
          onClick={togglePlay}
          className={`flex h-10 w-10 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition-all ${
            playing
              ? "border-accent bg-accent/15 text-accent"
              : "border-border bg-surface/95 text-text-secondary hover:text-accent hover:border-accent"
          }`}
          title={playing ? "Pause" : "Play"}
        >
          {playing ? (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
