import { NextResponse } from "next/server";
import { SpotifyProvider } from "@/lib/providers/spotify";
import { createCodeChallenge, createCodeVerifier } from "@/lib/auth/pkce";

export async function GET(request: Request) {
  const provider = new SpotifyProvider();
  const state = crypto.randomUUID();
  const codeVerifier = createCodeVerifier();
  const codeChallenge = createCodeChallenge(codeVerifier);
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI?.trim();

  if (!redirectUri) {
    return NextResponse.json(
      {
        ok: false,
        error: "SPOTIFY_REDIRECT_URI is not configured",
      },
      { status: 500 }
    );
  }

  const url = provider.getAuthUrl(state, codeChallenge, redirectUri);

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
  response.cookies.set("soundlens_spotify_redirect_uri", redirectUri, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}
