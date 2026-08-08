import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { SpotifyProvider } from "@/lib/providers/spotify";
import { encryptText } from "@/lib/auth/crypto";
import { createSession } from "@/lib/auth/session-store";
import { syncUserRecentlyPlayed } from "@/server/services/listening-sync.service";
import { recomputeAnalyticsSnapshot } from "@/server/services/analytics.service";
import crypto from "crypto";

function verifyState(rawState: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not configured");

  const [body, signature] = rawState.split(".");
  if (!body || !signature) return null;

  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  if (expected !== signature) return null;

  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      nonce: string;
      codeVerifier: string;
      redirectUri: string;
    };
  } catch {
    return null;
  }
}

function getAppOrigin(url: URL) {
  return (
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    new URL(process.env.SPOTIFY_REDIRECT_URI ?? url.origin).origin
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/?auth_error=${encodeURIComponent(error)}`, getAppOrigin(url)));
  }

  if (!code || !state) {
    return NextResponse.json({ ok: false, error: "Missing OAuth parameters" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get("soundlens_oauth_state")?.value;
  const codeVerifier = cookieStore.get("soundlens_pkce_verifier")?.value;
  const redirectUri = cookieStore.get("soundlens_spotify_redirect_uri")?.value;
  const parsedState = verifyState(state);

  if (!storedState || storedState !== state) {
    if (!parsedState) {
      return NextResponse.json({ ok: false, error: "Invalid OAuth state" }, { status: 400 });
    }
  }

  const resolvedCodeVerifier = parsedState?.codeVerifier ?? codeVerifier;
  const resolvedRedirectUri = parsedState?.redirectUri ?? redirectUri;

  if (!resolvedCodeVerifier || !resolvedRedirectUri) {
    return NextResponse.json({ ok: false, error: "Invalid OAuth state" }, { status: 400 });
  }

  const provider = new SpotifyProvider();
  const tokenSet = await provider.exchangeCode(code, resolvedCodeVerifier, resolvedRedirectUri);
  const profile = await provider.getProfile(tokenSet.accessToken);

  const providerRow = await prisma.provider.upsert({
    where: { key: "spotify" },
    create: { key: "spotify", name: "Spotify" },
    update: { name: "Spotify" },
  });

  const user = await prisma.user.upsert({
    where: { spotifyUserId: profile.providerUserId },
    create: {
      spotifyUserId: profile.providerUserId,
      email: profile.email,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      country: profile.country,
      productType: profile.productType,
      connectedSince: new Date(),
      lastLoginAt: new Date(),
    },
    update: {
      email: profile.email,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      country: profile.country,
      productType: profile.productType,
      lastLoginAt: new Date(),
      deletedAt: null,
    },
  });

  await prisma.userProvider.upsert({
    where: { userId_providerId: { userId: user.id, providerId: providerRow.id } },
    create: {
      userId: user.id,
      providerId: providerRow.id,
      providerUserId: profile.providerUserId,
      connectedAt: new Date(),
    },
    update: {
      providerUserId: profile.providerUserId,
      disconnectedAt: null,
    },
  });

  await prisma.spotifyToken.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      accessTokenEncrypted: encryptText(tokenSet.accessToken),
      refreshTokenEncrypted: encryptText(tokenSet.refreshToken),
      expiresAt: tokenSet.expiresAt,
      scope: tokenSet.scope,
      tokenType: tokenSet.tokenType,
    },
    update: {
      accessTokenEncrypted: encryptText(tokenSet.accessToken),
      refreshTokenEncrypted: encryptText(tokenSet.refreshToken),
      expiresAt: tokenSet.expiresAt,
      scope: tokenSet.scope,
      tokenType: tokenSet.tokenType,
    },
  });

  await createSession(user.id);
  await syncUserRecentlyPlayed(user.id);
  await recomputeAnalyticsSnapshot(user.id);

  const response = NextResponse.redirect(new URL("/dashboard", getAppOrigin(url)));
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
  response.cookies.set("soundlens_oauth_state", "", { ...cookieOptions, expires: new Date(0) });
  response.cookies.set("soundlens_pkce_verifier", "", { ...cookieOptions, expires: new Date(0) });
  response.cookies.set("soundlens_spotify_redirect_uri", "", { ...cookieOptions, expires: new Date(0) });
  return response;
}
