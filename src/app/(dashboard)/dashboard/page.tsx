import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { buildDashboardSummary } from "@/server/services/dashboard.service";
import { buildAnalyticsOverview } from "@/server/services/analytics.service";
import Link from "next/link";
import type { DashboardTopItem, RecentlyPlayedItem } from "@/server/services/dashboard.service";

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

  const insightBlocks = [
    { label: "Listening Streak", value: `${dashboard.metrics.listeningStreakDays} days` },
    { label: "Current Session", value: formatMinutes(dashboard.metrics.currentListeningSessionMinutes) },
    { label: "Avg / Day", value: formatMinutes(dashboard.metrics.averageListeningPerDay) },
    { label: "Music Discovery", value: `${dashboard.metrics.musicDiscoveryCount}` },
  ];

  const chartMax = Math.max(...analytics.charts.listeningTrend.map((item) => item.minutes), 1);
  const hourMax = Math.max(...analytics.charts.heatmapHour.map((item) => item.minutes), 1);
  const weekdayMax = Math.max(...analytics.charts.heatmapWeekday.map((item) => item.minutes), 1);
  const genreMax = Math.max(...analytics.charts.genreDistribution.map((item) => item.percent), 1);

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

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {insightBlocks.map((item) => (
            <article
              key={item.label}
              className="rounded-3xl border border-emerald-400/15 bg-emerald-400/8 p-5 shadow-xl"
            >
              <p className="text-sm text-white/55">{item.label}</p>
              <p className="mt-3 text-2xl font-semibold text-white">{item.value}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
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
                <p>
                  Connected since: <span className="font-medium text-white">{user.connectedSince.toLocaleDateString()}</span>
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

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-xl">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">Listening trend</p>
            <h2 className="mt-2 text-2xl font-semibold">Daily listening trend</h2>
            <div className="mt-6 flex items-end gap-2 overflow-x-auto pb-2">
              {analytics.charts.listeningTrend.length === 0 ? (
                <p className="text-sm text-white/55">No trend data yet. Sync will build this over time.</p>
              ) : (
                analytics.charts.listeningTrend.map((point) => (
                  <div key={point.day} className="flex min-w-[32px] flex-1 flex-col items-center gap-2">
                    <div
                      className="w-full rounded-t-2xl bg-emerald-400/80 transition-all"
                      style={{ height: `${Math.max((point.minutes / chartMax) * 180, 8)}px` }}
                    />
                    <span className="text-[10px] text-white/45">{point.day.slice(8)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-xl">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">Heatmaps</p>
            <h2 className="mt-2 text-2xl font-semibold">Hourly and weekday activity</h2>
            <div className="mt-6 space-y-6">
              <div>
                <p className="mb-3 text-sm text-white/60">By hour</p>
                <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-12">
                  {analytics.charts.heatmapHour.map((hour) => (
                    <div
                      key={hour.hour}
                      className="flex aspect-square items-center justify-center rounded-xl border border-white/10 text-[11px] text-white/70"
                      style={{
                        backgroundColor: `rgba(16, 185, 129, ${0.12 + (hour.minutes / hourMax) * 0.8})`,
                      }}
                      title={`${hour.hour}:00 - ${hour.minutes} min`}
                    >
                      {hour.hour}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-3 text-sm text-white/60">By weekday</p>
                <div className="grid grid-cols-7 gap-2">
                  {analytics.charts.heatmapWeekday.map((day) => (
                    <div
                      key={day.day}
                      className="flex flex-col items-center gap-2 rounded-xl border border-white/10 p-3 text-[11px] text-white/70"
                      style={{
                        backgroundColor: `rgba(16, 185, 129, ${0.12 + (day.minutes / weekdayMax) * 0.8})`,
                      }}
                      title={`${day.day} - ${day.minutes} min`}
                    >
                      <span>{day.day}</span>
                      <span>{day.minutes}m</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-xl">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">Genre distribution</p>
            <h2 className="mt-2 text-2xl font-semibold">Estimated genre mix</h2>
            <div className="mt-5 space-y-3">
              {analytics.charts.genreDistribution.length === 0 ? (
                <p className="text-sm text-white/55">No genre data yet.</p>
              ) : (
                analytics.charts.genreDistribution.map((genre) => (
                  <div key={genre.genre} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white">{genre.genre}</span>
                      <span className="text-white/60">{genre.percent}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-lime-300"
                        style={{ width: `${Math.max((genre.percent / genreMax) * 100, 8)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-xl">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">Playlist analytics</p>
            <h2 className="mt-2 text-2xl font-semibold">Your playlist intelligence</h2>
            <div className="mt-5 rounded-3xl border border-white/10 bg-black/20 p-5 text-sm text-white/70">
              <p className="font-medium text-white">Average popularity: N/A</p>
              <p className="mt-2">Genre mix: Coming from playlist track metadata</p>
              <p className="mt-2">Top artists: Will appear once playlist sync lands</p>
              <p className="mt-2">Explicit songs: Computed from synced track rows</p>
              <p className="mt-2">Average release year: Computed from playlist tracks</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-xl">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">Notifications</p>
            <h2 className="mt-2 text-2xl font-semibold">Milestones and alerts</h2>
            <div className="mt-5 space-y-3 text-sm text-white/70">
              <p>Weekly email: Ready to be generated</p>
              <p>Monthly recap email: Ready to be generated</p>
              <p>Listening milestones: Trackable once notification rules are added</p>
              <p>New record: Compare against prior snapshots</p>
              <p>Longest streak: Derived from listening history</p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-xl">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">Reports</p>
            <h2 className="mt-2 text-2xl font-semibold">Report history</h2>
            <div className="mt-5 space-y-3 text-sm text-white/70">
              <p>Weekly report: Coming from `/api/reports`</p>
              <p>Monthly report: Coming from `/api/reports`</p>
              <p>Generated on schedule by backend jobs</p>
              <p>Can be expanded into a history panel next</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-xl">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">Top tracks</p>
            <h2 className="mt-2 text-2xl font-semibold">Most played songs</h2>
            <div className="mt-5 space-y-3">
              {dashboard.topTracks.length === 0 ? (
                <p className="text-sm text-white/55">No track data yet. Run sync to populate this section.</p>
              ) : (
                dashboard.topTracks.map((track: DashboardTopItem, index: number) => (
                  <div key={track.id || index} className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                    <div>
                      <p className="font-medium text-white">{track.name}</p>
                      <p className="text-sm text-white/55">Rank #{index + 1}</p>
                    </div>
                    <span className="text-sm text-white/70">{formatMinutes(track.minutes)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-xl">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">Top artists</p>
            <h2 className="mt-2 text-2xl font-semibold">Most played artists</h2>
            <div className="mt-5 space-y-3">
              {dashboard.topArtists.length === 0 ? (
                <p className="text-sm text-white/55">No artist data yet. Run sync to populate this section.</p>
              ) : (
                dashboard.topArtists.map((artist: DashboardTopItem, index: number) => (
                  <div key={artist.id || index} className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                    <div>
                      <p className="font-medium text-white">{artist.name}</p>
                      <p className="text-sm text-white/55">Rank #{index + 1}</p>
                    </div>
                    <span className="text-sm text-white/70">{formatMinutes(artist.minutes)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-xl">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">Reports</p>
            <h2 className="mt-2 text-2xl font-semibold">Monthly recap preview</h2>
            <div className="mt-4 rounded-3xl border border-white/10 bg-black/20 p-5 text-sm text-white/70">
              <p className="font-medium text-white">Top artist: {dashboard.topArtists[0]?.name ?? "N/A"}</p>
              <p className="mt-2">Top song: {dashboard.topTracks[0]?.name ?? "N/A"}</p>
              <p className="mt-2">Hours listened this month: {formatMinutes(dashboard.metrics.monthListeningTimeMinutes)}</p>
              <p className="mt-2">Most active day: {analytics.latestSnapshot?.metricsJson && typeof analytics.latestSnapshot.metricsJson === "object" ? String((analytics.latestSnapshot.metricsJson as Record<string, unknown>).activeDay ?? "N/A") : "N/A"}</p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-xl">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">Profile</p>
            <h2 className="mt-2 text-2xl font-semibold">Your account</h2>
            <div className="mt-4 space-y-3 text-sm text-white/70">
              <p>Spotify name: <span className="font-medium text-white">{user.displayName}</span></p>
              <p>Country: <span className="font-medium text-white">{user.country ?? "N/A"}</span></p>
              <p>Spotify plan: <span className="font-medium text-white">{user.productType ?? "N/A"}</span></p>
              <p>Connected since: <span className="font-medium text-white">{user.connectedSince.toLocaleDateString()}</span></p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
