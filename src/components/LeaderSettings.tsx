"use client";

import { useState, useCallback } from "react";
import { usePrivySafe } from "@/hooks/usePrivySafe";
import type { Community } from "@/context/CommunityContext";

interface Props {
  community: Community;
  onSaved: () => void;
}

export default function LeaderSettings({ community, onSaved }: Props) {
  const { getAccessToken } = usePrivySafe();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [bannerUrl, setBannerUrl] = useState(community.bannerUrl ?? "");
  const [website, setWebsite] = useState(community.website ?? "");
  const [twitter, setTwitter] = useState(community.twitter ?? "");
  const [telegram, setTelegram] = useState(community.telegram ?? "");
  const [discord, setDiscord] = useState(community.discord ?? "");

  const save = useCallback(async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/communities/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ticker: community.ticker,
          bannerUrl,
          website,
          twitter,
          telegram,
          discord,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Save failed");
      } else {
        setSuccess("Settings saved!");
        onSaved();
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }, [community.ticker, bannerUrl, website, twitter, telegram, discord, getAccessToken, onSaved]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md border border-accent/30 bg-accent/10 px-2.5 py-1 text-[10px] font-bold text-accent transition-colors hover:bg-accent/20"
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Edit Community
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-accent/20 bg-surface overflow-hidden animate-fade-in">
      <div className="flex items-center justify-between border-b border-accent/10 px-3 py-2 bg-accent/5">
        <div className="flex items-center gap-1.5">
          <svg className="h-3.5 w-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 className="text-xs font-bold text-accent">Leader Settings</h3>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-text-muted hover:text-text-primary text-xs"
        >
          ✕
        </button>
      </div>

      <div className="p-3 space-y-2.5">
        {/* Banner URL */}
        <div>
          <label className="text-[10px] font-medium text-text-muted uppercase tracking-wider block mb-1">Banner Image URL</label>
          <input
            type="url"
            value={bannerUrl}
            onChange={(e) => setBannerUrl(e.target.value)}
            placeholder="https://example.com/banner.png"
            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
        </div>

        {/* Website */}
        <div>
          <label className="text-[10px] font-medium text-text-muted uppercase tracking-wider block mb-1">Website</label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://yourproject.com"
            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
        </div>

        {/* Twitter */}
        <div>
          <label className="text-[10px] font-medium text-text-muted uppercase tracking-wider block mb-1">Twitter / X Handle</label>
          <div className="flex items-center gap-1">
            <span className="text-xs text-text-muted">@</span>
            <input
              type="text"
              value={twitter}
              onChange={(e) => setTwitter(e.target.value.replace(/^@/, ""))}
              placeholder="handle"
              className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        {/* Telegram */}
        <div>
          <label className="text-[10px] font-medium text-text-muted uppercase tracking-wider block mb-1">Telegram</label>
          <input
            type="text"
            value={telegram}
            onChange={(e) => setTelegram(e.target.value)}
            placeholder="https://t.me/yourchannel or @handle"
            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
        </div>

        {/* Discord */}
        <div>
          <label className="text-[10px] font-medium text-text-muted uppercase tracking-wider block mb-1">Discord</label>
          <input
            type="url"
            value={discord}
            onChange={(e) => setDiscord(e.target.value)}
            placeholder="https://discord.gg/invite"
            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
        </div>

        {error && <p className="text-[10px] text-danger">{error}</p>}
        {success && <p className="text-[10px] text-accent">{success}</p>}

        <button
          onClick={save}
          disabled={saving}
          className="w-full rounded-lg bg-accent px-3 py-2 text-xs font-bold text-background transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
