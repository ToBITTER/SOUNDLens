import { prisma } from "@/lib/db";
import { SpotifyProvider } from "@/lib/providers/spotify";
import { getValidSpotifyAccessToken } from "./spotify-token.service";

function minutes(ms: number) {
  return Math.round(ms / 60000);
}

export type DashboardSummary = Awaited<ReturnType<typeof buildDashboardSummary>>;

export interface RecentlyPlayedItem {
  id: string;
  trackName: string;
  playedAt: Date;
  playedDurationMs: number;
}

export interface DashboardTopItem {
  id: string;
  name: string;
  minutes: number;
}

export async function buildDashboardSummary(userId: string) {
  const accessToken = await getValidSpotifyAccessToken(userId);
  const provider = new SpotifyProvider();

  const [today, week, month, recentPlays, topTracks, topArtists, monthlyTrackHistory, liveTopTracks, liveTopArtists, currentPlayback, savedTracksCount] = await Promise.all([
    prisma.listeningHistory.aggregate({
      where: { userId, playedAt: { gte: startOfDay(new Date()) } },
      _sum: { playedDurationMs: true },
    }),
    prisma.listeningHistory.aggregate({
      where: { userId, playedAt: { gte: startOfWeek(new Date()) } },
      _sum: { playedDurationMs: true },
    }),
    prisma.listeningHistory.aggregate({
      where: { userId, playedAt: { gte: startOfMonth(new Date()) } },
      _sum: { playedDurationMs: true },
    }),
    prisma.listeningHistory.findMany({
      where: { userId },
      orderBy: { playedAt: "desc" },
      take: 10,
      include: {
        track: true,
      },
    }),
    prisma.listeningHistory.groupBy({
      by: ["trackId"],
      where: { userId, playedAt: { gte: startOfMonth(new Date()) } },
      _sum: { playedDurationMs: true },
      orderBy: { _sum: { playedDurationMs: "desc" } },
      take: 5,
    }),
    prisma.listeningHistory.groupBy({
      by: ["artistId"],
      where: { userId, playedAt: { gte: startOfMonth(new Date()) } },
      _sum: { playedDurationMs: true },
      orderBy: { _sum: { playedDurationMs: "desc" } },
      take: 5,
    }),
    prisma.listeningHistory.findMany({
      where: { userId, playedAt: { gte: startOfMonth(new Date()) } },
      include: {
        track: true,
      },
    }),
    provider.getTopItems?.(accessToken, "tracks", "medium_term", 10) ?? Promise.resolve([]),
    provider.getTopItems?.(accessToken, "artists", "medium_term", 10) ?? Promise.resolve([]),
    provider.getCurrentlyPlaying?.(accessToken) ?? Promise.resolve(null),
    provider.getSavedTracksCount?.(accessToken) ?? Promise.resolve(0),
  ]);

  const monthlyTracks = monthlyTrackHistory.map((entry) => entry.track).filter(Boolean);
  const popularityValues = monthlyTracks
    .map((track) => track.popularity)
    .filter((value): value is number => typeof value === "number");
  const releaseYears = monthlyTracks
    .map((track) => track.releaseDate?.getFullYear())
    .filter((year): year is number => typeof year === "number");
  const explicitCount = monthlyTracks.filter((track) => track.explicit).length;

  const [trackEntities, artistEntities, latestSession] = await Promise.all([
    prisma.track.findMany({
      where: { id: { in: topTracks.map((item) => item.trackId).filter(Boolean) as string[] } },
      select: { id: true, name: true },
    }),
    prisma.artist.findMany({
      where: { id: { in: topArtists.map((item) => item.artistId).filter(Boolean) as string[] } },
      select: { id: true, name: true },
    }),
    prisma.listeningSession.findFirst({
      where: { userId },
      orderBy: { startedAt: "desc" },
    }),
  ]);

  return {
    metrics: {
      todayListeningTimeMinutes: minutes(today._sum.playedDurationMs ?? 0),
      weekListeningTimeMinutes: minutes(week._sum.playedDurationMs ?? 0),
      monthListeningTimeMinutes: minutes(month._sum.playedDurationMs ?? 0),
      averageListeningPerDay: minutes((month._sum.playedDurationMs ?? 0) / 30),
      listeningStreakDays: latestSession ? 1 : 0,
      currentListeningSessionMinutes: latestSession ? minutes(latestSession.durationMs) : 0,
      musicDiscoveryCount: savedTracksCount,
      newArtistsThisMonth: 0,
      averagePopularity:
        popularityValues.length > 0
          ? Math.round(popularityValues.reduce((sum, value) => sum + value, 0) / popularityValues.length)
          : 0,
      explicitPercent:
        monthlyTracks.length > 0 ? Math.round((explicitCount / monthlyTracks.length) * 100) : 0,
      averageReleaseYear:
        releaseYears.length > 0
          ? Math.round(releaseYears.reduce((sum, year) => sum + year, 0) / releaseYears.length)
          : 0,
      topArtistName: artistEntities[0]?.name ?? topArtists[0]?.artistId ?? "N/A",
    },
    recentlyPlayed: recentPlays.map<RecentlyPlayedItem>((play) => ({
      id: play.id,
      trackName: play.track.name,
      playedAt: play.playedAt,
      playedDurationMs: play.playedDurationMs,
    })),
    topTracks: topTracks.map<DashboardTopItem>((item) => ({
      id: item.trackId ?? "",
      name: trackEntities.find((track) => track.id === item.trackId)?.name ?? "Unknown track",
      minutes: minutes(item._sum.playedDurationMs ?? 0),
    })).slice(0, 5),
    topArtists: topArtists.map<DashboardTopItem>((item) => ({
      id: item.artistId ?? "",
      name: artistEntities.find((artist) => artist.id === item.artistId)?.name ?? "Unknown artist",
      minutes: minutes(item._sum.playedDurationMs ?? 0),
    })).slice(0, 5),
    liveTopTracks,
    liveTopArtists,
    currentPlayback,
    savedTracksCount,
    latestSession,
  };
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfWeek(date: Date) {
  const next = startOfDay(date);
  const day = next.getDay();
  const diff = (day + 6) % 7;
  next.setDate(next.getDate() - diff);
  return next;
}

function startOfMonth(date: Date) {
  const next = startOfDay(date);
  next.setDate(1);
  return next;
}
