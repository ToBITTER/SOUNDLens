import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { buildAnalyticsOverview } from "@/server/services/analytics.service";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const analytics = await buildAnalyticsOverview(user.id);
  return NextResponse.json({ ok: true, analytics });
}
