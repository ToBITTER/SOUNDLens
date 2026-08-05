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
  exchangeCode(code: string, codeVerifier?: string): Promise<OAuthTokenSet>;
  refreshAccessToken(refreshToken: string): Promise<OAuthTokenSet>;
  getProfile(accessToken: string): Promise<MusicProfile>;
  getRecentlyPlayed(accessToken: string, limit?: number): Promise<SpotifyRecentlyPlayedItem[]>;
  getCurrentUserPlaylists?(accessToken: string, limit?: number): Promise<unknown>;
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
