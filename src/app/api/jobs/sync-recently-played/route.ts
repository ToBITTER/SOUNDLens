import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { syncRecentlyPlayedJob } from "@/server/jobs/sync-recently-played";

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

  const result = await syncRecentlyPlayedJob();
  return NextResponse.json({ ok: true, result });
}
