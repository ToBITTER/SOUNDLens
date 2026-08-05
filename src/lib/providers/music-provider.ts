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
}
