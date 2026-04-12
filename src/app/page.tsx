import Image from "next/image";

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
    desc: "One live chat room per community. Discuss alpha, plan strategy, and rally together without leaving PumpChat.",
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
    const res = await fetch(`${base}/api/stats`, { cache: "no-store" });
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
          <a href="/" className="flex items-center gap-2 text-lg font-bold text-accent tracking-tight">
            <Image src="/logo.png" alt="PumpChat" width={28} height={28} className="rounded-md" />
            PumpChat
          </a>
          <nav className="hidden items-center gap-6 text-sm text-text-secondary md:flex">
            <a href="#features" className="transition-colors hover:text-text-primary">features</a>
            <a href="#how" className="transition-colors hover:text-text-primary">how it works</a>
          </nav>
          <a
            href="/app"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-background transition-colors hover:bg-accent-hover"
          >
            launch app
          </a>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/[0.04] via-transparent to-transparent" />
        <div className="relative mx-auto max-w-5xl px-6 pt-24 pb-16 text-center md:pt-32 md:pb-20">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            the home base for memecoin communities
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight md:text-6xl">
            Join your community.{" "}
            <span className="text-accent">Coordinate raids.</span>{" "}
            Climb the leaderboard.
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-base text-text-secondary leading-relaxed md:text-lg">
            Track the highest performing communities, rally your raiders, and
            rise through the ranks — all from one screen.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <a
              href="/app"
              className="rounded-lg bg-accent px-7 py-3 text-sm font-bold text-background shadow-lg shadow-accent/20 transition-all hover:bg-accent-hover hover:shadow-xl hover:shadow-accent/30 hover:-translate-y-0.5"
            >
              launch app
            </a>
            <a
              href="#features"
              className="rounded-lg border border-border px-6 py-3 text-sm font-medium text-text-secondary transition-colors hover:border-accent/40 hover:text-accent"
            >
              see features
            </a>
          </div>
        </div>

        {/* ── Live Stats ── */}
        {stats && (
          <div className="border-y border-border bg-surface/50">
            <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
              {[
                { value: fmtNum(stats.communities), label: "communities" },
                { value: fmtNum(stats.raids), label: "raids launched" },
                { value: fmtNum(stats.engagements), label: "engagements" },
                { value: fmtNum(stats.users), label: "users" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-xl font-extrabold text-accent md:text-2xl">{s.value}</p>
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
                className="group rounded-xl border border-border bg-surface p-5 transition-all hover:border-accent/30 hover:bg-surface-hover"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent mb-3 transition-colors group-hover:bg-accent/15">
                  {f.icon}
                </div>
                <h3 className="text-sm font-bold text-text-primary mb-1.5">{f.title}</h3>
                <p className="text-xs leading-relaxed text-text-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how" className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 py-20 md:py-24">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-extrabold md:text-3xl">
              Up and running in 60 seconds
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { step: "01", title: "Sign in", desc: "Log in with your X account. That's it — no wallet, no setup." },
              { step: "02", title: "Find your community", desc: "Browse active communities or discover new ones through the live token feed." },
              { step: "03", title: "Raid & rise", desc: "Join tweet raids, coordinate with your community, and climb the leaderboard." },
            ].map((s) => (
              <div key={s.step} className="relative rounded-xl border border-border bg-surface p-6 transition-colors hover:border-accent/20">
                <span className="text-4xl font-extrabold text-accent/15 leading-none">{s.step}</span>
                <h3 className="mt-3 text-base font-bold text-text-primary">{s.title}</h3>
                <p className="mt-2 text-xs text-text-muted leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="flex-1 flex items-center">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center md:py-24">
          <h2 className="text-2xl font-extrabold md:text-3xl">
            Ready to rally your community?
          </h2>
          <p className="mx-auto mt-4 max-w-sm text-sm text-text-secondary leading-relaxed">
            Sign in with X and start coordinating with your community.
            It takes less than a minute.
          </p>
          <div className="mt-8">
            <a
              href="/app"
              className="inline-block rounded-lg bg-accent px-8 py-3 text-sm font-bold text-background shadow-lg shadow-accent/20 transition-all hover:bg-accent-hover hover:shadow-xl hover:shadow-accent/30 hover:-translate-y-0.5"
            >
              launch app
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <span className="text-[11px] text-text-muted font-medium">PumpChat</span>
          <div className="flex gap-4 text-[11px] text-text-muted">
            <a href="#" className="transition-colors hover:text-text-secondary">docs</a>
            <a href="#" className="transition-colors hover:text-text-secondary">X</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
