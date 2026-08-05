import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { buildDashboardSummary } from "@/server/services/dashboard.service";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const summary = await buildDashboardSummary(user.id);
  return NextResponse.json({ ok: true, summary });
}
