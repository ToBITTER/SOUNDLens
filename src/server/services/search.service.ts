import { getValidSpotifyAccessToken } from "./spotify-token.service";
import { SpotifyProvider } from "@/lib/providers/spotify";

export async function searchLibrary(userId: string, query: string) {
  const accessToken = await getValidSpotifyAccessToken(userId);
  const provider = new SpotifyProvider();
  return provider.search?.(accessToken, query) ?? { tracks: [], artists: [], albums: [] };
}
