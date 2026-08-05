import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(29,185,84,0.22),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-8 shadow-2xl backdrop-blur sm:p-10">
          <p className="text-sm uppercase tracking-[0.35em] text-emerald-400">SoundLens</p>
          <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-tight sm:text-6xl">
            Your Spotify Wrapped. Every day.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-white/72">
            A premium Spotify analytics platform with daily insights, weekly reports, monthly recaps,
            and a backend built for clean growth.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link className="rounded-full bg-emerald-500 px-6 py-3 text-center font-medium text-black" href="/dashboard">
              Open Dashboard
            </Link>
            <Link className="rounded-full border border-white/15 px-6 py-3 text-center font-medium" href="/api/auth/login">
              Sign in with Spotify
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
