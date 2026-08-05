import { prisma } from "@/lib/db";

function startOfWeek(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  const day = next.getDay();
  const diff = (day + 6) % 7;
  next.setDate(next.getDate() - diff);
  return next;
}

function startOfMonth(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  next.setDate(1);
  return next;
}

export async function generateWeeklyReport(userId: string) {
  const periodEnd = new Date();
  const periodStart = startOfWeek(periodEnd);
  const summary = await prisma.listeningHistory.aggregate({
    where: { userId, playedAt: { gte: periodStart, lte: periodEnd } },
    _sum: { playedDurationMs: true },
    _count: true,
  });

  return prisma.report.upsert({
    where: {
      userId_reportType_periodStart: {
        userId,
        reportType: "weekly",
        periodStart,
      },
    },
    create: {
      userId,
      reportType: "weekly",
      periodStart,
      periodEnd,
      title: "Weekly Listening Report",
      summaryJson: {
        totalMinutes: Math.round((summary._sum.playedDurationMs ?? 0) / 60000),
        totalPlays: summary._count,
      },
      status: "success",
      generatedAt: new Date(),
    },
    update: {
      periodEnd,
      summaryJson: {
        totalMinutes: Math.round((summary._sum.playedDurationMs ?? 0) / 60000),
        totalPlays: summary._count,
      },
      status: "success",
      generatedAt: new Date(),
    },
  });
}

export async function generateMonthlyReport(userId: string) {
  const periodEnd = new Date();
  const periodStart = startOfMonth(periodEnd);
  const summary = await prisma.listeningHistory.aggregate({
    where: { userId, playedAt: { gte: periodStart, lte: periodEnd } },
    _sum: { playedDurationMs: true },
    _count: true,
  });

  return prisma.report.upsert({
    where: {
      userId_reportType_periodStart: {
        userId,
        reportType: "monthly",
        periodStart,
      },
    },
    create: {
      userId,
      reportType: "monthly",
      periodStart,
      periodEnd,
      title: "Monthly Listening Recap",
      summaryJson: {
        totalMinutes: Math.round((summary._sum.playedDurationMs ?? 0) / 60000),
        totalPlays: summary._count,
      },
      status: "success",
      generatedAt: new Date(),
    },
    update: {
      periodEnd,
      summaryJson: {
        totalMinutes: Math.round((summary._sum.playedDurationMs ?? 0) / 60000),
        totalPlays: summary._count,
      },
      status: "success",
      generatedAt: new Date(),
    },
  });
}
