import { prisma } from "@/lib/db";
import { decryptText, encryptText } from "@/lib/auth/crypto";
import { SpotifyProvider } from "@/lib/providers/spotify";

export async function getValidSpotifyAccessToken(userId: string) {
  const token = await prisma.spotifyToken.findUnique({
    where: { userId },
  });

  if (!token) {
    throw new Error("Spotify token not found");
  }

  if (token.expiresAt > new Date()) {
    return decryptText(token.accessTokenEncrypted);
  }

  const provider = new SpotifyProvider();
  const refreshed = await provider.refreshAccessToken(decryptText(token.refreshTokenEncrypted));

  await prisma.spotifyToken.update({
    where: { userId },
    data: {
      accessTokenEncrypted: encryptText(refreshed.accessToken),
      refreshTokenEncrypted: encryptText(refreshed.refreshToken),
      expiresAt: refreshed.expiresAt,
      scope: refreshed.scope,
      tokenType: refreshed.tokenType,
    },
  });

  return refreshed.accessToken;
}
