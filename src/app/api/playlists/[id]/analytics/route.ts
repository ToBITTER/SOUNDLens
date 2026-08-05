import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { buildPlaylistAnalytics } from "@/server/services/playlist.service";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const analytics = await buildPlaylistAnalytics(user.id, id);

  if (!analytics) {
    return NextResponse.json({ ok: false, error: "Playlist not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, ...analytics });
}
