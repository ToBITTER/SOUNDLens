import { prisma } from "@/lib/db";

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

export async function buildDashboardSummary(userId: string) {
  const [today, week, month, recentPlays, topTracks, topArtists] = await Promise.all([
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
  ]);

  return {
    metrics: {
      todayListeningTimeMinutes: minutes(today._sum.playedDurationMs ?? 0),
      weekListeningTimeMinutes: minutes(week._sum.playedDurationMs ?? 0),
      monthListeningTimeMinutes: minutes(month._sum.playedDurationMs ?? 0),
    },
    recentlyPlayed: recentPlays.map<RecentlyPlayedItem>((play) => ({
      id: play.id,
      trackName: play.track.name,
      playedAt: play.playedAt,
      playedDurationMs: play.playedDurationMs,
    })),
    topTracks,
    topArtists,
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
