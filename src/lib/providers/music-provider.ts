export interface MusicProfile {
  providerUserId: string;
  displayName: string;
  avatarUrl?: string | null;
  country?: string | null;
  productType?: string | null;
  email?: string | null;
}

export interface OAuthTokenSet {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
  tokenType: string;
}

export interface MusicProvider {
  key: string;
  getAuthUrl(state: string, codeChallenge?: string): string;
  exchangeCode(code: string, codeVerifier?: string, redirectUri?: string): Promise<OAuthTokenSet>;
  refreshAccessToken(refreshToken: string): Promise<OAuthTokenSet>;
  getProfile(accessToken: string): Promise<MusicProfile>;
  getRecentlyPlayed(accessToken: string, limit?: number): Promise<SpotifyRecentlyPlayedItem[]>;
  getCurrentUserPlaylists?(accessToken: string, limit?: number): Promise<unknown>;
  search?(accessToken: string, query: string): Promise<MusicSearchResults>;
}

export interface SpotifyRecentlyPlayedItem {
  playedAt: string;
  track: {
    id: string;
    name: string;
    duration_ms: number;
    explicit: boolean;
    popularity?: number;
    album?: {
      id: string;
      name: string;
      images?: { url: string }[];
      release_date?: string;
      total_tracks?: number;
    };
    artists: Array<{
      id: string;
      name: string;
      genres?: string[];
      images?: { url: string }[];
      popularity?: number;
    }>;
  };
}

export interface MusicSearchResults {
  tracks: Array<{
    id: string;
    name: string;
    artistName: string;
    albumName?: string | null;
    imageUrl?: string | null;
    durationMs?: number;
  }>;
  artists: Array<{
    id: string;
    name: string;
    imageUrl?: string | null;
  }>;
  albums: Array<{
    id: string;
    name: string;
    imageUrl?: string | null;
  }>;
}
