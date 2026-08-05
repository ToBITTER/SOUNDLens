import { prisma } from "@/lib/db";

function minutes(ms: number) {
  return Math.round(ms / 60000);
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

function startOfYear(date: Date) {
  const next = startOfDay(date);
  next.setMonth(0, 1);
  return next;
}

export async function buildAnalyticsOverview(userId: string) {
  const now = new Date();
  const [daily, weekly, monthly, yearly, recentSnapshot] = await Promise.all([
    prisma.listeningHistory.aggregate({
      where: { userId, playedAt: { gte: startOfDay(now) } },
      _sum: { playedDurationMs: true },
      _count: true,
    }),
    prisma.listeningHistory.aggregate({
      where: { userId, playedAt: { gte: startOfWeek(now) } },
      _sum: { playedDurationMs: true },
      _count: true,
    }),
    prisma.listeningHistory.aggregate({
      where: { userId, playedAt: { gte: startOfMonth(now) } },
      _sum: { playedDurationMs: true },
      _count: true,
    }),
    prisma.listeningHistory.aggregate({
      where: { userId, playedAt: { gte: startOfYear(now) } },
      _sum: { playedDurationMs: true },
      _count: true,
    }),
    prisma.analyticsSnapshot.findFirst({
      where: { userId, periodType: "monthly" },
      orderBy: { periodStart: "desc" },
    }),
  ]);

  return {
    current: {
      todayListeningMinutes: minutes(daily._sum.playedDurationMs ?? 0),
      weekListeningMinutes: minutes(weekly._sum.playedDurationMs ?? 0),
      monthListeningMinutes: minutes(monthly._sum.playedDurationMs ?? 0),
      yearListeningMinutes: minutes(yearly._sum.playedDurationMs ?? 0),
      todayPlays: daily._count,
      weekPlays: weekly._count,
      monthPlays: monthly._count,
      yearPlays: yearly._count,
    },
    latestSnapshot: recentSnapshot,
  };
}

export async function recomputeAnalyticsSnapshot(userId: string) {
  const now = new Date();
  const periodStart = startOfMonth(now);
  const periodEnd = now;

  const [durationSummary, topTracks, topArtists, listeningRows] = await Promise.all([
    prisma.listeningHistory.aggregate({
      where: { userId, playedAt: { gte: periodStart, lte: periodEnd } },
      _sum: { playedDurationMs: true },
      _count: true,
    }),
    prisma.listeningHistory.groupBy({
      by: ["trackId"],
      where: { userId, playedAt: { gte: periodStart, lte: periodEnd } },
      _sum: { playedDurationMs: true },
      orderBy: { _sum: { playedDurationMs: "desc" } },
      take: 10,
    }),
    prisma.listeningHistory.groupBy({
      by: ["artistId"],
      where: { userId, playedAt: { gte: periodStart, lte: periodEnd } },
      _sum: { playedDurationMs: true },
      orderBy: { _sum: { playedDurationMs: "desc" } },
      take: 10,
    }),
    prisma.listeningHistory.findMany({
      where: { userId, playedAt: { gte: periodStart, lte: periodEnd } },
      select: { playedAt: true, playedDurationMs: true },
    }),
  ]);

  const totalMinutes = minutes(durationSummary._sum.playedDurationMs ?? 0);
  const dayBuckets = new Map<string, number>();
  const hourBuckets = new Map<number, number>();

  for (const row of listeningRows) {
    const dayKey = row.playedAt.toDateString();
    const hourKey = row.playedAt.getHours();
    dayBuckets.set(dayKey, (dayBuckets.get(dayKey) ?? 0) + row.playedDurationMs);
    hourBuckets.set(hourKey, (hourBuckets.get(hourKey) ?? 0) + row.playedDurationMs);
  }

  const daysActive = dayBuckets.size || 1;
  const topDayEntry = [...dayBuckets.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
  const topHourEntry = [...hourBuckets.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

  const metrics = {
    totalMinutes,
    totalPlays: durationSummary._count,
    averageMinutesPerDay: Math.round(totalMinutes / daysActive),
    topTracks,
    topArtists,
    activeDay: topDayEntry?.[0] ?? null,
    activeHour: topHourEntry?.[0] ?? null,
  };

  const insights = {
    generatedAt: now.toISOString(),
    summary: "Snapshot recomputed from listening history.",
  };

  return prisma.analyticsSnapshot.upsert({
    where: {
      userId_periodType_periodStart: {
        userId,
        periodType: "monthly",
        periodStart,
      },
    },
    create: {
      userId,
      periodType: "monthly",
      periodStart,
      periodEnd,
      metricsJson: metrics,
      insightsJson: insights,
    },
    update: {
      periodEnd,
      metricsJson: metrics,
      insightsJson: insights,
    },
  });
}
