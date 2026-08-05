import type { MusicProfile, MusicProvider, OAuthTokenSet } from "./music-provider";

const SPOTIFY_AUTHORIZE_URL = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_ME_URL = "https://api.spotify.com/v1/me";

export class SpotifyProvider implements MusicProvider {
  key = "spotify";

  getAuthUrl(state: string, codeChallenge?: string) {
    const params = new URLSearchParams({
      client_id: process.env.SPOTIFY_CLIENT_ID ?? "",
      response_type: "code",
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI ?? "",
      scope: "user-read-private user-read-email user-read-recently-played playlist-read-private",
      state,
    });

    if (codeChallenge) {
      params.set("code_challenge_method", "S256");
      params.set("code_challenge", codeChallenge);
    }

    return `${SPOTIFY_AUTHORIZE_URL}?${params.toString()}`;
  }

  getPkceAuthUrl(state: string, codeChallenge: string) {
    return this.getAuthUrl(state, codeChallenge);
  }

  async exchangeCode(code: string, codeVerifier?: string): Promise<OAuthTokenSet> {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI ?? "",
      client_id: process.env.SPOTIFY_CLIENT_ID ?? "",
    });

    if (codeVerifier) body.set("code_verifier", codeVerifier);

    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID ?? ""}:${process.env.SPOTIFY_CLIENT_SECRET ?? ""}`
        ).toString("base64")}`,
      },
      body,
    });

    if (!response.ok) {
      throw new Error("Failed to exchange Spotify code");
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scope: data.scope,
      tokenType: data.token_type,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenSet> {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.SPOTIFY_CLIENT_ID ?? "",
    });

    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID ?? ""}:${process.env.SPOTIFY_CLIENT_SECRET ?? ""}`
        ).toString("base64")}`,
      },
      body,
    });

    if (!response.ok) {
      throw new Error("Failed to refresh Spotify token");
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scope: data.scope,
      tokenType: data.token_type,
    };
  }

  async getProfile(accessToken: string): Promise<MusicProfile> {
    const response = await fetch(SPOTIFY_ME_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to load Spotify profile");
    }

    const data = await response.json();
    return {
      providerUserId: data.id,
      displayName: data.display_name ?? "Spotify User",
      avatarUrl: data.images?.[0]?.url ?? null,
      country: data.country ?? null,
      productType: data.product ?? null,
      email: data.email ?? null,
    };
  }
}
