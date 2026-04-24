import Link from "next/link";
import CACopyButton from "@/components/CACopyButton";

/* ── SVG icon components ── */
function IconRaid() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}
function IconChat() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}
function IconLeaderboard() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h4v11H3zM10 3h4v18h-4zM17 7h4v14h-4z" />
    </svg>
  );
}
function IconToken() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}
function IconX() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
function IconHub() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

const FEATURES = [
  {
    icon: <IconRaid />,
    title: "Tweet Raids",
    desc: "Coordinate your community to engage with key tweets. Set targets for likes, retweets, and replies — track progress in real time.",
  },
  {
    icon: <IconChat />,
    title: "Community Chat",
    desc: "One live chat room per community. Discuss alpha, plan strategy, and rally together without leaving SAFEMOON.",
  },
  {
    icon: <IconLeaderboard />,
    title: "Leaderboard",
    desc: "Rank members by engagement score. See who's putting in the most work and reward your top raiders.",
  },
  {
    icon: <IconToken />,
    title: "Community Tracker",
    desc: "Track the highest performing communities with real market data — market cap, holders, volume, and bonding curve progress.",
  },
  {
    icon: <IconX />,
    title: "Sign In with X",
    desc: "One-click login with your X account. No wallet needed. One identity across every community.",
  },
  {
    icon: <IconHub />,
    title: "Multi-Community Hub",
    desc: "Join multiple communities from one dashboard. Switch between them instantly — no more juggling Telegram groups and Discord servers.",
  },
];

/* ── Stats fetcher (server component) ── */
async function getStats() {
  try {
    const base = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
    const res = await fetch(`${base}/api/stats`, {
        next: { revalidate: 60 },
      });
    if (!res.ok) return null;
    return res.json() as Promise<{
      communities: number;
      raids: number;
      engagements: number;
      messages: number;
      users: number;
    }>;
  } catch {
    return null;
  }
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default async function LandingPage() {
  const stats = await getStats();

  return (
    <div className="flex min-h-screen flex-col animate-page-in">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-base font-extrabold text-accent tracking-[0.08em] uppercase">SAFEMOON</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-text-secondary md:flex">
            <a href="#features" className="transition-colors hover:text-text-primary">Features</a>
            <a href="#how" className="transition-colors hover:text-text-primary">How it works</a>
          </nav>
          <Link
            href="/app"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-background transition-colors hover:bg-accent-hover"
          >
            Launch App
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Animated gradient mesh background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/4 h-[800px] w-[800px] rounded-full bg-accent/[0.07] blur-[120px] animate-[drift_20s_ease-in-out_infinite]" />
          <div className="absolute -top-1/4 -right-1/4 h-[600px] w-[600px] rounded-full bg-secondary/[0.05] blur-[100px] animate-[drift_25s_ease-in-out_infinite_reverse]" />
          <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-accent/[0.04] blur-[80px] animate-[drift_18s_ease-in-out_infinite_2s]" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />

        <div className="relative mx-auto max-w-5xl px-6 pt-20 pb-16 text-center md:pt-28 md:pb-20">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            the home base for the safemoon mission
          </p>

          {/* Hero wordmark */}
          <div className="mb-6">
            <span className="text-5xl font-extrabold tracking-tight md:text-7xl bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
              SAFEMOON
            </span>
          </div>

          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight md:text-6xl">
            Join your community.{" "}
            <span className="bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">Coordinate raids.</span>{" "}
            Climb the leaderboard.
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-base text-text-secondary leading-relaxed md:text-lg">
            Track the highest performing communities, rally your raiders, and
            rise through the ranks — all from one screen.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <Link
              href="/app"
              className="group relative rounded-lg bg-accent px-7 py-3 text-sm font-bold text-background shadow-lg shadow-accent/20 transition-all hover:bg-accent-hover hover:shadow-xl hover:shadow-accent/30 hover:-translate-y-0.5"
            >
              <span className="absolute inset-0 rounded-lg bg-accent/50 blur-md opacity-0 transition-opacity group-hover:opacity-100" />
              <span className="relative">Launch App</span>
            </Link>
            <a
              href="#features"
              className="rounded-lg border border-border px-6 py-3 text-sm font-medium text-text-secondary transition-colors hover:border-accent/40 hover:text-accent"
            >
              See Features
            </a>
          </div>

          {/* Contract address */}
          <div className="mt-6 flex items-center justify-center">
            <CACopyButton address="5HrSQ2F679YsKpYwmZDDxhVD9kbPNyn6UV3QPDbjbrrr" />
          </div>

        </div>

        {/* ── Live Stats ── */}
        {stats && (
          <div className="relative border-y border-border bg-surface/50 backdrop-blur-sm">
            <div className="mx-auto grid max-w-4xl grid-cols-2 gap-4 px-6 py-5 md:grid-cols-4">
              {[
                { value: fmtNum(stats.communities), label: "communities" },
                { value: fmtNum(stats.raids), label: "raids launched" },
                { value: fmtNum(stats.engagements), label: "engagements" },
                { value: fmtNum(stats.users), label: "users" },
              ].map((s) => (
                <div key={s.label} className="group text-center">
                  <p className="text-xl font-extrabold text-accent md:text-2xl drop-shadow-[0_0_8px_var(--color-accent-glow)] transition-all group-hover:drop-shadow-[0_0_16px_var(--color-accent-glow)]">
                    {s.value}
                  </p>
                  <p className="mt-0.5 text-[10px] text-text-muted uppercase tracking-wide">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Features ── */}
      <section id="features" className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 py-20 md:py-24">
          <div className="text-center mb-12">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-accent">Features</p>
            <h2 className="text-2xl font-extrabold md:text-3xl">
              Everything your community needs
            </h2>
            <p className="mt-3 text-sm text-text-secondary max-w-md mx-auto">
              Raids, chat, leaderboards, and community tracking — all in one place.
              No more juggling five different apps.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group relative rounded-xl border border-border bg-surface p-5 transition-all hover:border-accent/30 hover:bg-surface-hover"
              >
                <div className="absolute inset-0 rounded-xl bg-accent/[0.03] opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent mb-3 transition-all group-hover:bg-accent/15 group-hover:shadow-[0_0_12px_var(--color-accent-glow)]">
                    {f.icon}
                  </div>
                  <h3 className="text-sm font-bold text-text-primary mb-1.5">{f.title}</h3>
                  <p className="text-xs leading-relaxed text-text-muted">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how" className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 py-20 md:py-24">
          <div className="text-center mb-12">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-accent">How It Works</p>
            <h2 className="text-2xl font-extrabold md:text-3xl">
              Up and running in 60 seconds
            </h2>
            <p className="mt-3 text-sm text-text-secondary max-w-md mx-auto">
              Getting started is simple. No complicated setup, no wallet required.
            </p>
          </div>

          <div className="relative grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-12 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gradient-to-r from-accent/30 via-accent/15 to-accent/30" />
            {[
              { step: "01", title: "Sign in with X", desc: "Connect your X account with one click. No wallet needed — your identity follows you everywhere." },
              { step: "02", title: "Find your community", desc: "Search by token ticker or contract address. Browse trending communities or discover new ones." },
              { step: "03", title: "Raid & rise", desc: "Join coordinated tweet raids, engage with targets, and climb the leaderboard as you contribute." },
            ].map((s) => (
              <div key={s.step} className="group relative rounded-xl border border-border bg-surface p-6 transition-colors hover:border-accent/20">
                <div className="flex items-center gap-3 mb-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-xs font-extrabold text-accent ring-1 ring-accent/20 transition-all group-hover:bg-accent/20 group-hover:shadow-[0_0_12px_var(--color-accent-glow)]">
                    {s.step}
                  </span>
                  <h3 className="text-base font-bold text-text-primary">{s.title}</h3>
                </div>
                <p className="text-xs text-text-muted leading-relaxed pl-11">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative flex-1 flex items-center overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-accent/[0.06] blur-[100px]" />
        </div>
        <div className="relative mx-auto max-w-5xl px-6 py-20 text-center md:py-24">
          <div className="mb-6">
            <span className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
              SAFEMOON
            </span>
          </div>
          <h2 className="text-2xl font-extrabold md:text-3xl">
            Ready to rally your community?
          </h2>
          <p className="mx-auto mt-4 max-w-sm text-sm text-text-secondary leading-relaxed">
            Sign in with X and start coordinating with your community.
            It takes less than a minute.
          </p>
          <div className="mt-8">
            <Link
              href="/app"
              className="group relative inline-block rounded-lg bg-accent px-8 py-3 text-sm font-bold text-background shadow-lg shadow-accent/20 transition-all hover:bg-accent-hover hover:shadow-xl hover:shadow-accent/30 hover:-translate-y-0.5"
            >
              <span className="absolute inset-0 rounded-lg bg-accent/50 blur-md opacity-0 transition-opacity group-hover:opacity-100" />
              <span className="relative">Launch App</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-text-muted">
              SAFEMOON
            </div>
            <div className="flex items-center gap-5 text-[11px] text-text-muted">
              <a href="https://x.com/Safemoonrrr" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 transition-colors hover:text-accent">
                <IconX />
                <span>@Safemoonrrr</span>
              </a>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border/50 text-center">
            <p className="text-[10px] text-text-muted/60">&copy; {new Date().getFullYear()} SAFEMOON. Built for the mission, by the mission.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
