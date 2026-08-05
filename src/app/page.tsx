import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-12 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">SoundLens</p>
          <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-tight">
            Your Spotify Wrapped. Every day.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/70">
            Production-ready Spotify analytics with daily insights, weekly reports, monthly recaps,
            and a backend designed to scale cleanly.
          </p>
          <div className="mt-8 flex gap-4">
            <Link className="rounded-full bg-emerald-500 px-6 py-3 font-medium text-black" href="/dashboard">
              Open Dashboard
            </Link>
            <Link className="rounded-full border border-white/15 px-6 py-3 font-medium" href="/api/auth/login">
              Sign in with Spotify
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
