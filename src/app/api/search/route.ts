import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { searchLibrary } from "@/server/services/search.service";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ ok: false, error: "Missing query" }, { status: 400 });
  }

  const results = await searchLibrary(user.id, q);
  return NextResponse.json({ ok: true, results });
}
