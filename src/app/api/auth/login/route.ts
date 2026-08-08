import { NextResponse } from "next/server";
import crypto from "crypto";
import { SpotifyProvider } from "@/lib/providers/spotify";
import { createCodeChallenge, createCodeVerifier } from "@/lib/auth/pkce";

function signState(payload: Record<string, string>) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not configured");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export async function GET(request: Request) {
  const provider = new SpotifyProvider();
  const codeVerifier = createCodeVerifier();
  const codeChallenge = createCodeChallenge(codeVerifier);
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI?.trim();
  const isProduction = process.env.NODE_ENV === "production";
  const cookieOptions: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: "none" | "lax" | "strict";
    path: string;
  } = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  };

  if (!redirectUri) {
    return NextResponse.json(
      {
        ok: false,
        error: "SPOTIFY_REDIRECT_URI is not configured",
      },
      { status: 500 }
    );
  }

  const state = signState({
    nonce: crypto.randomUUID(),
    codeVerifier,
    redirectUri,
  });
  const url = provider.getAuthUrl(state, codeChallenge, redirectUri);

  const response = NextResponse.redirect(url);
  response.cookies.set("soundlens_oauth_state", state, {
    ...cookieOptions,
    maxAge: 60 * 10,
  });

  return response;
}
