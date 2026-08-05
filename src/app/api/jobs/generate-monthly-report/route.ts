import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { generateMonthlyReport } from "@/server/services/report.service";

export async function POST() {
  const secret = process.env.JOB_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "JOB_SECRET is not configured" }, { status: 500 });
  }

  const requestHeaders = headers();
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

  const reports = [];
  for (const user of users) {
    reports.push(await generateMonthlyReport(user.id));
  }

  return NextResponse.json({ ok: true, reports });
}
