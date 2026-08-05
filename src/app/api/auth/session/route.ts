import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: true, authenticated: false, user: null });
  }

  return NextResponse.json({
    ok: true,
    authenticated: true,
    user: {
      id: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      country: user.country,
      productType: user.productType,
      connectedSince: user.connectedSince,
    },
  });
}
