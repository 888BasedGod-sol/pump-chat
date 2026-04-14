"use client";

export default function VoiceRoom({ ticker }: { ticker: string; communityName: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5">
          <svg className="h-3.5 w-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 01-14 0v-2m7 9v2m-3 0h6m-3-11a3 3 0 01-3-3V5a3 3 0 116 0v4a3 3 0 01-3 3z" />
          </svg>
          <h3 className="text-xs font-bold text-text-primary">Voice</h3>
        </div>
      </div>

      <div className="px-3 py-8 text-center space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
          <svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 01-14 0v-2m7 9v2m-3 0h6m-3-11a3 3 0 01-3-3V5a3 3 0 116 0v4a3 3 0 01-3 3z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-text-primary">Voice Chat</p>
          <p className="text-xs text-accent font-semibold mt-1">Coming Soon</p>
          <p className="text-[10px] text-text-muted mt-1">Talk live with the ${ticker} community</p>
        </div>
      </div>
    </div>
  );
}
