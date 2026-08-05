import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    profile: {
      id: user.id,
      spotifyUserId: user.spotifyUserId,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      country: user.country,
      productType: user.productType,
      connectedSince: user.connectedSince,
      lastLoginAt: user.lastLoginAt,
    },
  });
}
