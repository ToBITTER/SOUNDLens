import { prisma } from "@/lib/db";

function toMinutes(ms: number) {
  return Math.round(ms / 60000);
}

export async function buildPlaylistAnalytics(userId: string, playlistId: string) {
  const playlist = await prisma.playlist.findFirst({
    where: { id: playlistId, OR: [{ userId }, { userId: null }] },
    include: {
      playlistTracks: {
        include: {
          track: true,
        },
      },
    },
  });

  if (!playlist) return null;

  const totalSongs = playlist.playlistTracks.length;
  const totalDuration = playlist.playlistTracks.reduce((sum, row) => sum + row.track.durationMs, 0);
  const explicitSongs = playlist.playlistTracks.filter((row) => row.track.explicit).length;
  const averageReleaseYear =
    playlist.playlistTracks.length === 0
      ? null
      : Math.round(
          playlist.playlistTracks.reduce((sum, row) => {
            const year = row.track.releaseDate?.getFullYear() ?? new Date().getFullYear();
            return sum + year;
          }, 0) / playlist.playlistTracks.length
        );

  return {
    playlist: {
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      imageUrl: playlist.imageUrl,
      ownerName: playlist.ownerName,
      isPublic: playlist.isPublic,
      tracksCount: playlist.tracksCount ?? totalSongs,
    },
    analytics: {
      averagePopularity: null,
      genreMix: [],
      topArtists: [],
      totalDurationMinutes: toMinutes(totalDuration),
      numberOfSongs: totalSongs,
      explicitSongsPercent: totalSongs === 0 ? 0 : Math.round((explicitSongs / totalSongs) * 100),
      averageReleaseYear,
    },
  };
}
