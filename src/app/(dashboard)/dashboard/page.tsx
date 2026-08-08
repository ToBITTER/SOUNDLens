import { RefreshButton } from "@/components/dashboard/refresh-button";
import { SyncNowButton } from "@/components/dashboard/sync-now-button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { buildAnalyticsOverview } from "@/server/services/analytics.service";
import { buildDashboardSummary } from "@/server/services/dashboard.service";
import type { DashboardTopItem, RecentlyPlayedItem } from "@/server/services/dashboard.service";
import { redirect } from "next/navigation";

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours}h ${remainder}m`;
}

function SectionShell({
  eyebrow,
  title,
  subtitle,
  children,
  className = "",
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-[2.25rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-6 ${className}`}
    >
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.42em] text-emerald-300/80">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">{title}</h2>
          {subtitle ? <p className="mt-2 max-w-2xl text-sm text-white/58">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(2,6,23,0.58))] px-4 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.25)]">
      <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-200/70">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  );
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
  ];

  const insightBlocks = [
    { label: "Streak", value: `${dashboard.metrics.listeningStreakDays} days` },
    { label: "Current vibe", value: formatMinutes(dashboard.metrics.currentListeningSessionMinutes) },
    { label: "Daily avg", value: formatMinutes(dashboard.metrics.averageListeningPerDay) },
    { label: "Discovery", value: `${dashboard.metrics.musicDiscoveryCount}` },
  ];
  const topArtistName = dashboard.topArtists[0]?.name ?? dashboard.metrics.topArtistName ?? "N/A";

  const chartMax = Math.max(...analytics.charts.listeningTrend.map((item) => item.minutes), 1);
  const hourMax = Math.max(...analytics.charts.heatmapHour.map((item) => item.minutes), 1);
  const weekdayMax = Math.max(...analytics.charts.heatmapWeekday.map((item) => item.minutes), 1);
  const genreMax = Math.max(...analytics.charts.genreDistribution.map((item) => item.percent), 1);

  return (
    <main className="min-h-screen px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.18),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.34)] backdrop-blur-xl sm:p-8">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-400/25 blur-3xl" />
          <div className="absolute right-1/4 top-10 h-52 w-52 rounded-full bg-fuchsia-500/15 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-cyan-400/12 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] uppercase tracking-[0.45em] text-emerald-300/80">SoundLens</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
                Hey {user.displayName}, your music is already telling on you.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/65 sm:text-base">
                Quick pulse on your listening, tiny bragging rights, and the occasional reminder that {topArtistName}
                might be winning the month again.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <SyncNowButton />
              <RefreshButton />
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card, index) => (
              <div key={card.label} className="animate-[float_7s_ease-in-out_infinite]" style={{ animationDelay: `${index * 180}ms` }}>
                <MetricPill label={card.label} value={card.value} />
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {insightBlocks.map((item, index) => (
            <div
              key={item.label}
              className="rounded-[1.8rem] border border-emerald-300/12 bg-[linear-gradient(180deg,rgba(16,185,129,0.12),rgba(15,23,42,0.72))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.24)] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300/25 hover:shadow-[0_28px_70px_rgba(16,185,129,0.12)] animate-[fadeUp_0.5s_ease-out_forwards]"
              style={{ animationDelay: `${index * 120}ms` }}
            >
              <p className="text-[11px] uppercase tracking-[0.32em] text-emerald-200/75">{item.label}</p>
              <p className="mt-3 text-2xl font-semibold text-white">{item.value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <SectionShell
            eyebrow="Recently played"
            title="What you’ve been feeding your ears"
            subtitle="A little scroll of the last listens, because your taste deserves receipts."
          >
            <div className="space-y-3">
              {dashboard.recentlyPlayed.length === 0 ? (
                <div className="rounded-[1.6rem] border border-dashed border-fuchsia-300/20 bg-[linear-gradient(180deg,rgba(17,24,39,0.85),rgba(15,23,42,0.55))] p-6 text-sm text-white/60">
                  <p className="font-medium text-white">Still quiet in here.</p>
                  <p className="mt-2">
                    Hit <span className="text-emerald-300">Sync Now</span> so we can go fetch your latest Spotify
                    plays.
                  </p>
                </div>
              ) : (
                dashboard.recentlyPlayed.map((item: RecentlyPlayedItem) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-[1.45rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(2,6,23,0.55))] px-4 py-3 transition hover:-translate-y-0.5 hover:border-fuchsia-300/25 hover:bg-black/25"
                  >
                    <div>
                      <p className="font-medium text-white">{item.trackName}</p>
                      <p className="text-sm text-white/50">{new Date(item.playedAt).toLocaleString()}</p>
                    </div>
                    <span className="text-sm text-white/70">
                      {formatMinutes(Math.round(item.playedDurationMs / 60000))}
                    </span>
                  </div>
                ))
              )}
            </div>
          </SectionShell>

          <div className="grid gap-6">
            <SectionShell eyebrow="Mood check" title="Tiny truths">
              <div className="grid gap-3 sm:grid-cols-2">
                <MetricPill label="Most active hour" value={analytics.current.activeHour ?? "N/A"} />
                <MetricPill label="Snapshot" value={analytics.latestSnapshot ? "Fresh" : "Waiting"} />
                <MetricPill label="Connected" value={user.connectedSince.toLocaleDateString()} />
                <MetricPill label="Plan" value={user.productType ?? "N/A"} />
                <MetricPill label="Saved tracks" value={`${dashboard.savedTracksCount ?? 0}`} />
                <MetricPill label="Now playing" value={dashboard.currentPlayback?.trackName ?? "Nothing"} />
              </div>
            </SectionShell>

            <SectionShell
              eyebrow="Next up"
              title="What the app is plotting"
              subtitle="The system is set up for hourly syncs, weekly reports, and monthly recaps."
            >
              <div className="space-y-3 text-sm text-white/66">
                <p>• Automatic syncs can refresh the dashboard with your latest listening.</p>
                <p>• Weekly and monthly reports are queued from the backend.</p>
                <p>• More fun stuff like milestones and shout-outs can land next.</p>
              </div>
            </SectionShell>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <SectionShell eyebrow="Trend line" title="Listening over time" subtitle="A smooth little pulse instead of a stiff business chart.">
            <div className="flex items-end gap-2 overflow-x-auto pb-2">
              {analytics.charts.listeningTrend.length === 0 ? (
                <p className="text-sm text-white/55">No trend data yet. Sync will grow this over time.</p>
              ) : (
                analytics.charts.listeningTrend.map((point) => (
                  <div key={point.day} className="flex min-w-[32px] flex-1 flex-col items-center gap-2">
                    <div
                      className="w-full rounded-t-2xl bg-gradient-to-t from-emerald-300 via-lime-300 to-fuchsia-300 transition-all"
                      style={{ height: `${Math.max((point.minutes / chartMax) * 180, 10)}px` }}
                    />
                    <span className="text-[10px] text-white/45">{point.day.slice(8)}</span>
                  </div>
                ))
              )}
            </div>
          </SectionShell>

          <SectionShell
            eyebrow="Heat"
            title="When you really listen"
            subtitle="Your music habits by hour and weekday, turned into an easy glance."
          >
            <div className="space-y-5">
              <div>
                <p className="mb-3 text-sm text-white/55">By hour</p>
                <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-12">
                  {analytics.charts.heatmapHour.map((hour) => (
                    <div
                      key={hour.hour}
                      className="flex aspect-square items-center justify-center rounded-xl border border-white/10 text-[11px] text-white/80 shadow-[0_12px_30px_rgba(0,0,0,0.12)] transition duration-300 hover:scale-[1.03]"
                      style={{ backgroundColor: `rgba(16, 185, 129, ${0.10 + (hour.minutes / hourMax) * 0.72})` }}
                      title={`${hour.hour}:00 - ${hour.minutes} min`}
                    >
                      {hour.hour}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-3 text-sm text-white/55">By weekday</p>
                <div className="grid grid-cols-7 gap-2">
                  {analytics.charts.heatmapWeekday.map((day) => (
                    <div
                      key={day.day}
                      className="flex flex-col items-center gap-2 rounded-xl border border-white/10 p-3 text-[11px] text-white/80 shadow-[0_12px_30px_rgba(0,0,0,0.12)] transition duration-300 hover:scale-[1.02]"
                      style={{ backgroundColor: `rgba(16, 185, 129, ${0.10 + (day.minutes / weekdayMax) * 0.72})` }}
                    >
                      <span>{day.day}</span>
                      <span>{day.minutes}m</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SectionShell>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <SectionShell
            eyebrow="Genre mix"
            title="What your ears are leaning toward"
            subtitle="Estimated from artist metadata, because Spotify won’t make it simple for us."
          >
            <div className="space-y-4">
              {analytics.charts.genreDistribution.length === 0 ? (
                <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-white/55">
                  No genre data yet. Sync a few listens and we’ll start mapping your sound.
                </div>
              ) : (
                analytics.charts.genreDistribution.map((genre) => (
                  <div key={genre.genre} className="space-y-2 rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white">{genre.genre}</span>
                      <span className="text-white/60">{genre.percent}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-lime-300 to-fuchsia-300"
                        style={{ width: `${Math.max((genre.percent / genreMax) * 100, 8)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionShell>

          <SectionShell eyebrow="Playlist vibe" title="What your playlists are saying">
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricPill label="Popularity" value={`${dashboard.metrics.averagePopularity}/100`} />
              <MetricPill label="Explicit %" value={`${dashboard.metrics.explicitPercent}%`} />
              <MetricPill label="Top artists" value={dashboard.metrics.topArtistName ?? "N/A"} />
              <MetricPill label="Saved music" value={`${dashboard.metrics.musicDiscoveryCount}`} />
            </div>
          </SectionShell>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <SectionShell
            eyebrow="Spotify top"
            title="Spotify's own rankings"
            subtitle="These are pulled from Spotify directly, not inferred from our sync history."
          >
            <div className="space-y-3">
              {(dashboard.liveTopTracks ?? []).length === 0 ? (
                <p className="text-sm text-white/55">No live top tracks yet. Reconnect with `user-top-read` enabled.</p>
              ) : (
                dashboard.liveTopTracks.map((track: any, index: number) => (
                  <div
                    key={track.id || index}
                    className="flex items-center justify-between rounded-[1.45rem] border border-white/8 bg-black/15 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-white">{track.name}</p>
                      <p className="text-sm text-white/50">{track.artistName ?? "Unknown artist"}</p>
                    </div>
                    <span className="text-sm text-white/70">Rank #{index + 1}</span>
                  </div>
                ))
              )}
            </div>
          </SectionShell>

          <SectionShell eyebrow="Playback" title="What’s happening right now" subtitle="If Spotify is playing, we can show it live.">
            <div className="rounded-[1.6rem] border border-white/8 bg-black/15 p-5 text-sm text-white/70">
              {dashboard.currentPlayback ? (
                <>
                  <p className="font-medium text-white">{dashboard.currentPlayback.trackName ?? "Unknown track"}</p>
                  <p className="mt-2">Artist: {dashboard.currentPlayback.artistName ?? "N/A"}</p>
                  <p className="mt-2">Album: {dashboard.currentPlayback.albumName ?? "N/A"}</p>
                  <p className="mt-2">Status: {dashboard.currentPlayback.isPlaying ? "Playing" : "Paused"}</p>
                </>
              ) : (
                <p>No active playback detected right now.</p>
              )}
            </div>
          </SectionShell>
        </section>

        <section className="grid gap-6">
          <SectionShell
            eyebrow="Playlists"
            title="Your actual playlist stack"
            subtitle="Real playlist contents, not a fake vibe label."
          >
            <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricPill label="Synced playlists" value={`${dashboard.playlists?.length ?? 0}`} />
              <MetricPill
                label="Total tracks"
                value={`${dashboard.playlists?.reduce((sum, playlist) => sum + (playlist.tracksCount || playlist.trackRowsCount), 0) ?? 0}`}
              />
              <MetricPill
                label="Total time"
                value={formatMinutes(dashboard.playlists?.reduce((sum, playlist) => sum + playlist.totalMinutes, 0) ?? 0)}
              />
              <MetricPill
                label="Explicit avg"
                value={`${Math.round((dashboard.playlists?.reduce((sum, playlist) => sum + playlist.explicitPercent, 0) ?? 0) / Math.max(dashboard.playlists?.length ?? 1, 1))}%`}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {(dashboard.playlists ?? []).length === 0 ? (
                <p className="text-sm text-white/55">No playlists synced yet. Run sync so we can read the real playlist contents.</p>
              ) : (
                dashboard.playlists.map((playlist: any) => (
                  <div
                    key={playlist.id}
                    className="rounded-[1.45rem] border border-white/8 bg-black/15 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.18)]"
                  >
                    <p className="text-lg font-semibold text-white">{playlist.name}</p>
                    <p className="mt-1 text-sm text-white/55">{playlist.description ?? "No description"}</p>
                    <p className="mt-3 text-sm text-emerald-300">{playlist.tracksCount || playlist.trackRowsCount} tracks</p>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-white/65">
                      <div className="rounded-xl border border-white/8 bg-white/[0.03] p-2">
                        <p className="uppercase tracking-[0.24em] text-white/40">Tracks</p>
                        <p className="mt-1 text-base text-white">{playlist.tracksCount || playlist.trackRowsCount}</p>
                      </div>
                      <div className="rounded-xl border border-white/8 bg-white/[0.03] p-2">
                        <p className="uppercase tracking-[0.24em] text-white/40">Length</p>
                        <p className="mt-1 text-base text-white">{playlist.totalMinutes > 0 ? formatMinutes(playlist.totalMinutes) : "Syncing"}</p>
                      </div>
                      <div className="rounded-xl border border-white/8 bg-white/[0.03] p-2">
                        <p className="uppercase tracking-[0.24em] text-white/40">Explicit</p>
                        <p className="mt-1 text-base text-white">{playlist.explicitPercent}%</p>
                      </div>
                    </div>
                    {playlist.imageUrl ? (
                      <div
                        className="mt-4 h-36 rounded-[1.2rem] bg-cover bg-center"
                        style={{ backgroundImage: `url(${playlist.imageUrl})` }}
                      />
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </SectionShell>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <SectionShell eyebrow="Top tracks" title="The songs that keep winning">
            <div className="space-y-3">
              {dashboard.topTracks.length === 0 ? (
                <p className="text-sm text-white/55">No track data yet. Run sync to populate this section.</p>
              ) : (
                dashboard.topTracks.map((track: DashboardTopItem, index: number) => (
                  <div
                    key={track.id || index}
                    className="flex items-center justify-between rounded-[1.45rem] border border-white/8 bg-black/15 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-white">{track.name}</p>
                      <p className="text-sm text-white/50">Rank #{index + 1}</p>
                    </div>
                    <span className="text-sm text-white/70">{formatMinutes(track.minutes)}</span>
                  </div>
                ))
              )}
            </div>
          </SectionShell>

          <SectionShell eyebrow="Top artists" title="The artists doing the most damage">
            <div className="space-y-3">
              {dashboard.topArtists.length === 0 ? (
                <p className="text-sm text-white/55">No artist data yet. Run sync to populate this section.</p>
              ) : (
                dashboard.topArtists.map((artist: DashboardTopItem, index: number) => (
                  <div
                    key={artist.id || index}
                    className="flex items-center justify-between rounded-[1.45rem] border border-white/8 bg-black/15 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-white">{artist.name}</p>
                      <p className="text-sm text-white/50">Rank #{index + 1}</p>
                    </div>
                    <span className="text-sm text-white/70">{formatMinutes(artist.minutes)}</span>
                  </div>
                ))
              )}
            </div>
          </SectionShell>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <SectionShell eyebrow="Reports" title="Monthly recap preview">
            <div className="rounded-[1.6rem] border border-white/8 bg-black/15 p-5 text-sm text-white/70">
              <p className="font-medium text-white">Top artist: {dashboard.topArtists[0]?.name ?? "N/A"}</p>
              <p className="mt-2">Top song: {dashboard.topTracks[0]?.name ?? "N/A"}</p>
              <p className="mt-2">Hours listened this month: {formatMinutes(dashboard.metrics.monthListeningTimeMinutes)}</p>
              <p className="mt-2">Most active day: {analytics.current.activeDay ?? "N/A"}</p>
            </div>
          </SectionShell>

          <SectionShell eyebrow="Profile" title="Your account">
            <div className="space-y-3 text-sm text-white/70">
              <p>
                Spotify name: <span className="font-medium text-white">{user.displayName}</span>
              </p>
              <p>
                Country: <span className="font-medium text-white">{user.country ?? "N/A"}</span>
              </p>
              <p>
                Spotify plan: <span className="font-medium text-white">{user.productType ?? "N/A"}</span>
              </p>
              <p>
                Connected since: <span className="font-medium text-white">{user.connectedSince.toLocaleDateString()}</span>
              </p>
            </div>
          </SectionShell>
        </section>
      </div>
    </main>
  );
}
