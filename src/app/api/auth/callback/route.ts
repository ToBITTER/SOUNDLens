import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { SpotifyProvider } from "@/lib/providers/spotify";
import { encryptText } from "@/lib/auth/crypto";
import { createSession } from "@/lib/auth/session-store";
import { syncUserRecentlyPlayed } from "@/server/services/listening-sync.service";
import { recomputeAnalyticsSnapshot } from "@/server/services/analytics.service";

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

  if (!storedState || storedState !== state) {
    return NextResponse.json({ ok: false, error: "Invalid OAuth state" }, { status: 400 });
  }

  const provider = new SpotifyProvider();
  const tokenSet = await provider.exchangeCode(code, codeVerifier, redirectUri);
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
  response.cookies.set("soundlens_oauth_state", "", { expires: new Date(0), path: "/" });
  response.cookies.set("soundlens_pkce_verifier", "", { expires: new Date(0), path: "/" });
  response.cookies.set("soundlens_spotify_redirect_uri", "", { expires: new Date(0), path: "/" });
  return response;
}
