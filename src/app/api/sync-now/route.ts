import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { syncUserRecentlyPlayed } from "@/server/services/listening-sync.service";
import { recomputeAnalyticsSnapshot } from "@/server/services/analytics.service";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const syncResult = await syncUserRecentlyPlayed(user.id);
  const snapshot = await recomputeAnalyticsSnapshot(user.id);

  return NextResponse.json({
    ok: true,
    syncResult,
    snapshot,
  });
}
