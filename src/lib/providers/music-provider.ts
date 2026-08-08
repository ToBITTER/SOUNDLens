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
  getTopItems?(
    accessToken: string,
    type: "artists" | "tracks",
    timeRange?: "short_term" | "medium_term" | "long_term",
    limit?: number
  ): Promise<Array<{
    id: string;
    name: string;
    imageUrl?: string | null;
    popularity?: number | null;
    artistName?: string;
    albumName?: string | null;
    durationMs?: number;
  }>>;
  getCurrentlyPlaying?(
    accessToken: string
  ): Promise<{
    isPlaying: boolean;
    itemType: string | null;
    trackName?: string | null;
    artistName?: string | null;
    albumName?: string | null;
    progressMs?: number | null;
    durationMs?: number | null;
  } | null>;
  getCurrentUserPlaylists?(
    accessToken: string,
    limit?: number,
    offset?: number
  ): Promise<Array<{
    id: string;
    name: string;
    description?: string | null;
    imageUrl?: string | null;
    ownerName?: string | null;
    isPublic?: boolean;
    tracksCount?: number | null;
  }>>;
  getPlaylistItems?(
    accessToken: string,
    playlistId: string,
    limit?: number,
    offset?: number
  ): Promise<Array<{
    trackId: string;
    trackName: string;
    durationMs: number;
    explicit: boolean;
    popularity?: number | null;
    album?: {
      id: string;
      name: string;
      imageUrl?: string | null;
      releaseDate?: string | null;
      totalTracks?: number | null;
    } | null;
    artists: Array<{
      id: string;
      name: string;
      genres?: string[];
      imageUrl?: string | null;
      popularity?: number | null;
    }>;
  }>>;
  getArtistsByIds?(accessToken: string, artistIds: string[]): Promise<Array<{
    id: string;
    name: string;
    genres?: string[];
    images?: { url: string }[];
    popularity?: number;
  }>>;
  getSavedTracksCount?(accessToken: string): Promise<number>;
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
