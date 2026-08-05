import { NextResponse } from "next/server";
import { SpotifyProvider } from "@/lib/providers/spotify";
import { createCodeChallenge, createCodeVerifier } from "@/lib/auth/pkce";

export async function GET() {
  const provider = new SpotifyProvider();
  const state = crypto.randomUUID();
  const codeVerifier = createCodeVerifier();
  const codeChallenge = createCodeChallenge(codeVerifier);
  const url = provider.getAuthUrl(state, codeChallenge);

  const response = NextResponse.redirect(url);
  response.cookies.set("soundlens_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
  response.cookies.set("soundlens_pkce_verifier", codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}
