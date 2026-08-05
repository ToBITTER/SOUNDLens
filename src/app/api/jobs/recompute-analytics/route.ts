import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { recomputeAnalyticsSnapshot } from "@/server/services/analytics.service";

export async function POST() {
  const secret = process.env.JOB_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "JOB_SECRET is not configured" }, { status: 500 });
  }

  const requestHeaders = await headers();
  const providedSecret =
    requestHeaders.get("x-job-secret") ??
    requestHeaders.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (providedSecret !== secret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    select: { id: true },
    where: { deletedAt: null },
  });

  const snapshots = [];
  for (const user of users) {
    snapshots.push(await recomputeAnalyticsSnapshot(user.id));
  }

  return NextResponse.json({ ok: true, snapshots });
}
