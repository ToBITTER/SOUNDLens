import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { buildDashboardSummary } from "@/server/services/dashboard.service";
import { buildAnalyticsOverview } from "@/server/services/analytics.service";
import type { RecentlyPlayedItem } from "@/server/services/dashboard.service";
import Link from "next/link";

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours}h ${remainder}m`;
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const [dashboard, analytics] = await Promise.all([
    buildDashboardSummary(user.id),
    buildAnalyticsOverview(user.id),
  ]);

  const cards = [
    { label: "Today", value: formatMinutes(dashboard.metrics.todayListeningTimeMinutes) },
    { label: "This Week", value: formatMinutes(dashboard.metrics.weekListeningTimeMinutes) },
    { label: "This Month", value: formatMinutes(dashboard.metrics.monthListeningTimeMinutes) },
    { label: "This Year", value: formatMinutes(analytics.current.yearListeningMinutes) },
  ];

  return (
    <main className="min-h-screen px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-emerald-400">SoundLens dashboard</p>
              <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
                Welcome back, {user.displayName}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-white/65 sm:text-base">
                Daily listening intelligence, built from your Spotify activity and updated automatically in the backend.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/75">
              Connected since{" "}
              <span className="font-medium text-white">
                {user.connectedSince.toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <form action="/api/sync-now" method="post">
              <button
                type="submit"
                className="rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-medium text-black transition hover:bg-emerald-400"
              >
                Sync Now
              </button>
            </form>
            <Link
              href="/api/dashboard"
              className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/5"
            >
              Refresh Data
            </Link>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <article
              key={card.label}
              className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/8 to-white/4 p-5 shadow-xl"
            >
              <p className="text-sm text-white/55">{card.label}</p>
              <p className="mt-3 text-3xl font-semibold text-white">{card.value}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">Recently played</p>
                <h2 className="mt-2 text-2xl font-semibold">Your latest listens</h2>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              {dashboard.recentlyPlayed.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-white/60">
                  <p className="font-medium text-white">No listening history yet.</p>
                  <p className="mt-2">
                    Click <span className="text-emerald-400">Sync Now</span> above to pull your latest Spotify plays into the dashboard.
                  </p>
                  <p className="mt-2 text-white/45">
                    If your Spotify account has not played anything recently, the section will stay empty until there is data.
                  </p>
                </div>
              ) : (
                dashboard.recentlyPlayed.map((item: RecentlyPlayedItem) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/20 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-white">{item.trackName}</p>
                      <p className="text-sm text-white/55">
                        Played {new Date(item.playedAt).toLocaleString()}
                      </p>
                    </div>
                    <span className="text-sm text-white/70">
                      {formatMinutes(Math.round(item.playedDurationMs / 60000))}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-xl">
              <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">Highlights</p>
              <div className="mt-4 space-y-4 text-sm text-white/72">
                <p>
                  Most active hour:{" "}
                  <span className="font-medium text-white">
                    {analytics.latestSnapshot?.metricsJson && typeof analytics.latestSnapshot.metricsJson === "object"
                      ? String((analytics.latestSnapshot.metricsJson as Record<string, unknown>).activeHour ?? "N/A")
                      : "N/A"}
                  </span>
                </p>
                <p>
                  Snapshot status:{" "}
                  <span className="font-medium text-white">
                    {analytics.latestSnapshot ? "Available" : "Waiting for first recompute"}
                  </span>
                </p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-emerald-400/20 bg-emerald-400/10 p-6 shadow-xl">
              <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Next sync</p>
              <p className="mt-3 text-lg font-medium text-white">
                Spotify sync, analytics recompute, and reports are ready to be triggered by backend jobs.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
