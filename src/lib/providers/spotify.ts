import type {
  MusicProfile,
  MusicProvider,
  MusicSearchResults,
  OAuthTokenSet,
  SpotifyRecentlyPlayedItem,
} from "./music-provider";

const SPOTIFY_AUTHORIZE_URL = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_ME_URL = "https://api.spotify.com/v1/me";
const SPOTIFY_RECENTLY_PLAYED_URL = "https://api.spotify.com/v1/me/player/recently-played";
const SPOTIFY_PLAYLISTS_URL = "https://api.spotify.com/v1/me/playlists";
const SPOTIFY_SEARCH_URL = "https://api.spotify.com/v1/search";

export class SpotifyProvider implements MusicProvider {
  key = "spotify";

  getAuthUrl(state: string, codeChallenge?: string, redirectUri?: string) {
    const resolvedRedirectUri = redirectUri ?? process.env.SPOTIFY_REDIRECT_URI ?? "";
    const params = new URLSearchParams({
      client_id: process.env.SPOTIFY_CLIENT_ID ?? "",
      response_type: "code",
      redirect_uri: resolvedRedirectUri,
      scope: "user-read-private user-read-email user-read-recently-played playlist-read-private",
      state,
    });

    if (codeChallenge) {
      params.set("code_challenge_method", "S256");
      params.set("code_challenge", codeChallenge);
    }

    return `${SPOTIFY_AUTHORIZE_URL}?${params.toString()}`;
  }

  getPkceAuthUrl(state: string, codeChallenge: string, redirectUri?: string) {
    return this.getAuthUrl(state, codeChallenge, redirectUri);
  }

  async exchangeCode(code: string, codeVerifier?: string, redirectUri?: string): Promise<OAuthTokenSet> {
    const resolvedRedirectUri = redirectUri ?? process.env.SPOTIFY_REDIRECT_URI ?? "";
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: resolvedRedirectUri,
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

  async getRecentlyPlayed(accessToken: string, limit = 50): Promise<SpotifyRecentlyPlayedItem[]> {
    const url = new URL(SPOTIFY_RECENTLY_PLAYED_URL);
    url.searchParams.set("limit", String(limit));

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to load Spotify recently played tracks");
    }

    const data = await response.json();
    return (data.items ?? []).map((item: any) => ({
      playedAt: item.played_at,
      track: {
        id: item.track.id,
        name: item.track.name,
        duration_ms: item.track.duration_ms,
        explicit: item.track.explicit,
        popularity: item.track.popularity,
        album: item.track.album
          ? {
              id: item.track.album.id,
              name: item.track.album.name,
              images: item.track.album.images,
              release_date: item.track.album.release_date,
              total_tracks: item.track.album.total_tracks,
            }
          : undefined,
        artists: (item.track.artists ?? []).map((artist: any) => ({
          id: artist.id,
          name: artist.name,
          genres: artist.genres,
          images: artist.images,
          popularity: artist.popularity,
        })),
      },
    }));
  }

  async getRecentlyPlayedPage(accessToken: string, limit = 50, before?: number): Promise<SpotifyRecentlyPlayedItem[]> {
    const url = new URL(SPOTIFY_RECENTLY_PLAYED_URL);
    url.searchParams.set("limit", String(limit));
    if (before) {
      url.searchParams.set("before", String(before));
    }

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to load Spotify recently played tracks");
    }

    const data = await response.json();
    return (data.items ?? []).map((item: any) => ({
      playedAt: item.played_at,
      track: {
        id: item.track.id,
        name: item.track.name,
        duration_ms: item.track.duration_ms,
        explicit: item.track.explicit,
        popularity: item.track.popularity,
        album: item.track.album
          ? {
              id: item.track.album.id,
              name: item.track.album.name,
              images: item.track.album.images,
              release_date: item.track.album.release_date,
              total_tracks: item.track.album.total_tracks,
            }
          : undefined,
        artists: (item.track.artists ?? []).map((artist: any) => ({
          id: artist.id,
          name: artist.name,
          genres: artist.genres,
          images: artist.images,
          popularity: artist.popularity,
        })),
      },
    }));
  }

  async getCurrentUserPlaylists(accessToken: string, limit = 50, offset = 0) {
    const url = new URL(SPOTIFY_PLAYLISTS_URL);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to load Spotify playlists");
    }

    const data = await response.json();
    return (data.items ?? []).map((playlist: any) => ({
      id: playlist.id,
      name: playlist.name,
      description: playlist.description ?? null,
      imageUrl: playlist.images?.[0]?.url ?? null,
      ownerName: playlist.owner?.display_name ?? playlist.owner?.id ?? null,
      isPublic: playlist.public ?? false,
      tracksCount: playlist.tracks?.total ?? null,
    }));
  }

  async getArtistsByIds(accessToken: string, artistIds: string[]) {
    if (!artistIds.length) return [];

    const url = new URL("https://api.spotify.com/v1/artists");
    url.searchParams.set("ids", artistIds.slice(0, 50).join(","));

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return (data.artists ?? []).map((artist: any) => ({
      id: artist.id,
      name: artist.name,
      genres: Array.isArray(artist.genres) ? artist.genres : [],
      images: artist.images,
      popularity: artist.popularity,
    }));
  }

  async search(accessToken: string, query: string): Promise<MusicSearchResults> {
    const url = new URL(SPOTIFY_SEARCH_URL);
    url.searchParams.set("q", query);
    url.searchParams.set("type", "track,artist,album");
    url.searchParams.set("limit", "10");

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to search Spotify");
    }

    const data = await response.json();
    return {
      tracks: (data.tracks?.items ?? []).map((item: any) => ({
        id: item.id,
        name: item.name,
        artistName: item.artists?.[0]?.name ?? "Unknown artist",
        albumName: item.album?.name ?? null,
        imageUrl: item.album?.images?.[0]?.url ?? null,
        durationMs: item.duration_ms,
      })),
      artists: (data.artists?.items ?? []).map((item: any) => ({
        id: item.id,
        name: item.name,
        imageUrl: item.images?.[0]?.url ?? null,
      })),
      albums: (data.albums?.items ?? []).map((item: any) => ({
        id: item.id,
        name: item.name,
        imageUrl: item.images?.[0]?.url ?? null,
      })),
    };
  }
}
