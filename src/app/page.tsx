import Link from "next/link";

const featureCards = [
  {
    label: "Daily pulse",
    text: "See how much you’ve listened, when you hit your peak hours, and what your week feels like.",
  },
  {
    label: "Mood map",
    text: "Track your most active listening window and learn what starts your vibe every day.",
  },
  {
    label: "Genre drift",
    text: "Understand what your ears are leaning toward, from Afrobeat and R&B to indie and ambient throws.",
  },
];

const statPills = [
  { label: "Daily listening", value: "2.8h" },
  { label: "Top genre", value: "Afrobeats" },
  { label: "Best hour", value: "9PM" },
  { label: "This month", value: "+26%" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(29,185,84,0.22),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.2),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-8 shadow-[0_40px_120px_rgba(0,0,0,0.35)] backdrop-blur-sm sm:p-10">
          <div className="absolute -left-16 top-10 h-44 w-44 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute right-6 top-8 h-40 w-40 rounded-full bg-fuchsia-500/15 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-emerald-400">SoundLens</p>
              <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-tight sm:text-6xl">
                Your Spotify Wrapped. Every day.
              </h1>
              <p className="mt-5 max-w-2xl text-lg text-white/72">
                A premium music intelligence dashboard for your listening habits, deep listening trends,
                monthly recaps, and the artists driving your vibe.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link className="rounded-full bg-emerald-500 px-6 py-3 text-center font-medium text-black shadow-[0_20px_40px_rgba(16,185,129,0.35)] transition hover:-translate-y-0.5" href="/dashboard">
                  Open Dashboard
                </Link>
                <Link className="rounded-full border border-white/15 px-6 py-3 text-center font-medium transition hover:border-emerald-300/40 hover:bg-white/5" href="/api/auth/login">
                  Sign in with Spotify
                </Link>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl">
              <div className="rounded-[1.4rem] border border-white/8 bg-[linear-gradient(180deg,rgba(16,185,129,0.14),rgba(15,23,42,0.82))] p-4">
                <p className="text-[11px] uppercase tracking-[0.3em] text-emerald-200/75">Listening pulse</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {statPills.map((stat) => (
                    <div key={stat.label} className="rounded-[1rem] border border-white/10 bg-black/20 p-3">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-white/50">{stat.label}</p>
                      <p className="mt-2 text-lg font-semibold text-white">{stat.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {featureCards.map((card, index) => (
            <div
              key={card.label}
              className="rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.22)] transition duration-300 hover:-translate-y-1 hover:border-emerald-300/25"
              style={{ animationDelay: `${index * 120}ms` }}
            >
              <p className="text-[11px] uppercase tracking-[0.32em] text-emerald-300/80">{card.label}</p>
              <p className="mt-4 text-base leading-7 text-white/70">{card.text}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
