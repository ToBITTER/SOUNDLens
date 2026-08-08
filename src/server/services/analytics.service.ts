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

function startOfRollingYear(date: Date) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() - 1);
  return next;
}

export async function buildAnalyticsOverview(userId: string) {
  const now = new Date();
  const rollingYearStart = startOfRollingYear(now);
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
      where: { userId, playedAt: { gte: rollingYearStart } },
      _sum: { playedDurationMs: true },
      _count: true,
    }),
    prisma.analyticsSnapshot.findFirst({
      where: { userId, periodType: "monthly" },
      orderBy: { periodStart: "desc" },
    }),
  ]);

  const monthRows = await prisma.listeningHistory.findMany({
    where: { userId, playedAt: { gte: startOfMonth(now) } },
    include: {
      track: {
        include: {
          trackArtists: {
            include: {
              artist: true,
            },
          },
        },
      },
    },
  });

  const hourBuckets = Array.from({ length: 24 }, () => 0);
  const weekdayBuckets = Array.from({ length: 7 }, () => 0);
  const genreBuckets = new Map<string, number>();
  const dayTrend = new Map<string, number>();
  const artistBuckets = new Map<string, number>();

  for (const row of monthRows) {
    const playedMs = row.playedDurationMs;
    hourBuckets[row.playedAt.getHours()] += playedMs;
    weekdayBuckets[row.playedAt.getDay()] += playedMs;
    const dayKey = row.playedAt.toISOString().slice(0, 10);
    dayTrend.set(dayKey, (dayTrend.get(dayKey) ?? 0) + playedMs);

    const artists = row.track.trackArtists?.map((trackArtist) => trackArtist.artist) ?? [];
    if (artists.length === 0 && row.artistId) {
      const directArtist = await prisma.artist.findUnique({
        where: { id: row.artistId },
      });
      if (directArtist) {
        artists.push(directArtist);
      }
    }

    for (const artist of artists) {
      if (!artist) continue;
      artistBuckets.set(artist.name, (artistBuckets.get(artist.name) ?? 0) + playedMs);
      const genres = Array.isArray(artist.genresCached) ? artist.genresCached : [];
      for (const genre of genres) {
        if (typeof genre !== "string") continue;
        genreBuckets.set(genre, (genreBuckets.get(genre) ?? 0) + playedMs / Math.max(genres.length, 1));
      }
    }
  }

  const totalGenreDuration = [...genreBuckets.values()].reduce((sum, value) => sum + value, 0) || 1;
  const genreDistribution = [...genreBuckets.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([genre, value]) => ({
      genre,
      percent: Math.round((value / totalGenreDuration) * 100),
    }));

  const listeningTrend = [...dayTrend.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, value]) => ({
      day,
      minutes: minutes(value),
    }));

  const heatmapHour = hourBuckets.map((value, hour) => ({
    hour,
    minutes: minutes(value),
  }));

  const heatmapWeekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => ({
    day,
    minutes: minutes(weekdayBuckets[index]),
  }));

  const topDayEntry = [...dayTrend.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
  const topHourEntry = [...hourBuckets.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
  const daysInYear = Math.max(Math.ceil((now.getTime() - rollingYearStart.getTime()) / 86400000) + 1, 1);

  return {
    current: {
      todayListeningMinutes: minutes(daily._sum.playedDurationMs ?? 0),
      weekListeningMinutes: minutes(weekly._sum.playedDurationMs ?? 0),
      monthListeningMinutes: minutes(monthly._sum.playedDurationMs ?? 0),
      yearListeningMinutes: minutes(yearly._sum.playedDurationMs ?? 0),
      yearAverageMinutes: Math.max(
        0,
        Math.round((yearly._sum.playedDurationMs ?? 0) / 60000 / daysInYear)
      ),
      activeDay: topDayEntry ? new Date(topDayEntry[0]).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "N/A",
      activeHour: topHourEntry ? `${topHourEntry[0]}:00` : "N/A",
      todayPlays: daily._count,
      weekPlays: weekly._count,
      monthPlays: monthly._count,
      yearPlays: yearly._count,
    },
    latestSnapshot: recentSnapshot,
    charts: {
      listeningTrend,
      heatmapHour,
      heatmapWeekday,
      genreDistribution,
      topArtists: [...artistBuckets.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value]) => ({ name, minutes: minutes(value) })),
    },
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
