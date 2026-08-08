import { prisma } from "@/lib/db";
import { SpotifyProvider } from "@/lib/providers/spotify";
import { getValidSpotifyAccessToken } from "./spotify-token.service";

type PlaylistTrackItem = NonNullable<Awaited<ReturnType<SpotifyProvider["getPlaylistItems"]>>>[number];

async function fetchAllRecentlyPlayed(provider: SpotifyProvider, accessToken: string, pageSize = 50) {
  const items: Awaited<ReturnType<SpotifyProvider["getRecentlyPlayedPage"]>> = [];
  let before: number | undefined;

  for (let page = 0; page < 20; page += 1) {
    const batch = await provider.getRecentlyPlayedPage(accessToken, pageSize, before);
    if (batch.length === 0) break;

    items.push(...batch);

    const oldestPlayedAt = batch.reduce((min, item) => {
      const playedAtMs = new Date(item.playedAt).getTime();
      return Number.isFinite(playedAtMs) && playedAtMs < min ? playedAtMs : min;
    }, Number.POSITIVE_INFINITY);

    if (batch.length < pageSize || !Number.isFinite(oldestPlayedAt)) break;
    before = oldestPlayedAt - 1;
  }

  return items;
}

async function syncPlaylistTracks(
  userId: string,
  providerRowId: string,
  playlistId: string,
  playlistTracks: Awaited<ReturnType<SpotifyProvider["getPlaylistItems"]>>
) {
  const provider = new SpotifyProvider();
  const uniqueArtistIds = [
    ...new Set(
      (playlistTracks ?? []).flatMap((item: PlaylistTrackItem) => item.artists.map((artist: PlaylistTrackItem["artists"][number]) => artist.id))
    ),
  ] as string[];
  const artistDetailsMap = new Map<string, { id: string; name: string; genres?: string[]; images?: { url: string }[]; popularity?: number }>();

  if (uniqueArtistIds.length > 0) {
    const accessToken = await getValidSpotifyAccessToken(userId);
    const artistDetails = await provider.getArtistsByIds?.(accessToken, uniqueArtistIds) ?? [];
    for (const artist of artistDetails) {
      artistDetailsMap.set(artist.id, artist);
    }
  }

  const playlist = await prisma.playlist.findFirst({
    where: { id: playlistId },
  });
  if (!playlist) return;

  await prisma.playlistTrack.deleteMany({ where: { playlistId } });

  for (const item of playlistTracks ?? []) {
    const album = item.album
      ? await prisma.album.upsert({
          where: {
            providerId_providerAlbumId: {
              providerId: providerRowId,
              providerAlbumId: item.album.id,
            },
          },
          create: {
            providerId: providerRowId,
            providerAlbumId: item.album.id,
            name: item.album.name,
            imageUrl: item.album.imageUrl ?? null,
            releaseDate: item.album.releaseDate ? new Date(item.album.releaseDate) : null,
            totalTracks: item.album.totalTracks ?? null,
          },
          update: {
            name: item.album.name,
            imageUrl: item.album.imageUrl ?? null,
            releaseDate: item.album.releaseDate ? new Date(item.album.releaseDate) : null,
            totalTracks: item.album.totalTracks ?? null,
          },
        })
      : null;

    const track = await prisma.track.upsert({
      where: {
        providerId_providerTrackId: {
          providerId: providerRowId,
          providerTrackId: item.trackId,
        },
      },
      create: {
        providerId: providerRowId,
        providerTrackId: item.trackId,
        name: item.trackName,
        durationMs: item.durationMs,
        explicit: item.explicit,
        popularity: item.popularity ?? null,
        albumId: album?.id ?? null,
      },
      update: {
        name: item.trackName,
        durationMs: item.durationMs,
        explicit: item.explicit,
        popularity: item.popularity ?? null,
        albumId: album?.id ?? null,
      },
    });

    for (const artistItem of item.artists) {
      const artistMeta = artistDetailsMap.get(artistItem.id) ?? artistItem;
      const artist = await prisma.artist.upsert({
        where: {
          providerId_providerArtistId: {
            providerId: providerRowId,
            providerArtistId: artistItem.id,
          },
        },
        create: {
          providerId: providerRowId,
          providerArtistId: artistItem.id,
          name: artistItem.name,
          imageUrl: artistMeta.images?.[0]?.url ?? artistItem.imageUrl ?? null,
          popularity: artistMeta.popularity ?? artistItem.popularity ?? null,
          genresCached: artistMeta.genres ?? artistItem.genres ?? [],
        },
        update: {
          name: artistItem.name,
          imageUrl: artistMeta.images?.[0]?.url ?? artistItem.imageUrl ?? null,
          popularity: artistMeta.popularity ?? artistItem.popularity ?? null,
          genresCached: artistMeta.genres ?? artistItem.genres ?? [],
        },
      });

      await prisma.trackArtist.upsert({
        where: {
          trackId_artistId: {
            trackId: track.id,
            artistId: artist.id,
          },
        },
        create: {
          trackId: track.id,
          artistId: artist.id,
        },
        update: {},
      });
    }

    await prisma.playlistTrack.upsert({
      where: {
        playlistId_trackId: {
          playlistId,
          trackId: track.id,
        },
      },
      create: {
        playlistId,
        trackId: track.id,
      },
      update: {},
    });
  }
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfWeek(date: Date) {
  const next = startOfDay(date);
  const day = next.getDay();
  const diff = (day + 6) % 7;
  next.setDate(next.getDate() - diff);
  return next;
}

function startOfMonth(date: Date) {
  const next = startOfDay(date);
  next.setDate(1);
  return next;
}

export async function syncUserRecentlyPlayed(userId: string) {
  const accessToken = await getValidSpotifyAccessToken(userId);
  const provider = new SpotifyProvider();
  const recentItems = await fetchAllRecentlyPlayed(provider, accessToken);

  const providerRow = await prisma.provider.upsert({
    where: { key: "spotify" },
    create: { key: "spotify", name: "Spotify" },
    update: { name: "Spotify" },
  });

  const inserted: Array<{ playedAt: string; trackId: string }> = [];
  const uniqueArtistIds = [...new Set(recentItems.flatMap((item) => (item.track.artists ?? []).map((artist) => artist.id)))];
  const artistDetailsMap = new Map<string, { id: string; name: string; genres?: string[]; images?: { url: string }[]; popularity?: number }>();

  if (uniqueArtistIds.length > 0) {
    const artistDetails = await provider.getArtistsByIds?.(accessToken, uniqueArtistIds) ?? [];
    for (const artist of artistDetails) {
      artistDetailsMap.set(artist.id, artist);
    }
  }

  for (const item of recentItems) {
    const album = item.track.album
      ? await prisma.album.upsert({
          where: {
            providerId_providerAlbumId: {
              providerId: providerRow.id,
              providerAlbumId: item.track.album.id,
            },
          },
          create: {
            providerId: providerRow.id,
            providerAlbumId: item.track.album.id,
            name: item.track.album.name,
            imageUrl: item.track.album.images?.[0]?.url ?? null,
            releaseDate: item.track.album.release_date ? new Date(item.track.album.release_date) : null,
            totalTracks: item.track.album.total_tracks ?? null,
          },
          update: {
            name: item.track.album.name,
            imageUrl: item.track.album.images?.[0]?.url ?? null,
            releaseDate: item.track.album.release_date ? new Date(item.track.album.release_date) : null,
            totalTracks: item.track.album.total_tracks ?? null,
          },
        })
      : null;

    const track = await prisma.track.upsert({
      where: {
        providerId_providerTrackId: {
          providerId: providerRow.id,
          providerTrackId: item.track.id,
        },
      },
      create: {
        providerId: providerRow.id,
        providerTrackId: item.track.id,
        name: item.track.name,
        durationMs: item.track.duration_ms,
        explicit: item.track.explicit,
        popularity: item.track.popularity ?? null,
        releaseDate: item.track.album?.release_date ? new Date(item.track.album.release_date) : null,
        albumId: album?.id ?? null,
      },
      update: {
        name: item.track.name,
        durationMs: item.track.duration_ms,
        explicit: item.track.explicit,
        popularity: item.track.popularity ?? null,
        releaseDate: item.track.album?.release_date ? new Date(item.track.album.release_date) : null,
        albumId: album?.id ?? null,
      },
    });

    const primaryArtist = item.track.artists[0];
    let artistId: string | null = null;

    for (const artistItem of item.track.artists ?? []) {
      const artistMeta = artistDetailsMap.get(artistItem.id) ?? artistItem;
      const artist = await prisma.artist.upsert({
        where: {
          providerId_providerArtistId: {
            providerId: providerRow.id,
            providerArtistId: artistItem.id,
          },
        },
        create: {
          providerId: providerRow.id,
          providerArtistId: artistItem.id,
          name: artistItem.name,
          imageUrl: artistMeta.images?.[0]?.url ?? artistItem.images?.[0]?.url ?? null,
          popularity: artistMeta.popularity ?? artistItem.popularity ?? null,
          genresCached: artistMeta.genres ?? artistItem.genres ?? [],
        },
        update: {
          name: artistItem.name,
          imageUrl: artistMeta.images?.[0]?.url ?? artistItem.images?.[0]?.url ?? null,
          popularity: artistMeta.popularity ?? artistItem.popularity ?? null,
          genresCached: artistMeta.genres ?? artistItem.genres ?? [],
        },
      });

      await prisma.trackArtist.upsert({
        where: {
          trackId_artistId: {
            trackId: track.id,
            artistId: artist.id,
          },
        },
        create: {
          trackId: track.id,
          artistId: artist.id,
        },
        update: {},
      });

      if (!artistId && artistItem.id === primaryArtist?.id) {
        artistId = artist.id;
      }
    }

    const playedAt = new Date(item.playedAt);
    const existing = await prisma.listeningHistory.findFirst({
      where: {
        userId,
        trackId: track.id,
        playedAt,
      },
    });

    if (existing) continue;

    await prisma.listeningHistory.create({
      data: {
        userId,
        providerId: providerRow.id,
        trackId: track.id,
        artistId,
        albumId: album?.id ?? null,
        playedAt,
        playedDurationMs: item.track.duration_ms,
        source: "recently_played",
        isUniquePlay: true,
      },
    });

    inserted.push({ playedAt: item.playedAt, trackId: track.id });
  }

  if (provider.getCurrentUserPlaylists) {
    let offset = 0;
    const pageSize = 50;
    for (let page = 0; page < 10; page += 1) {
      const playlists = await provider.getCurrentUserPlaylists(accessToken, pageSize, offset);
      if (playlists.length === 0) break;

      for (const playlist of playlists) {
        const playlistRecord = await prisma.playlist.upsert({
          where: {
            providerId_providerPlaylistId: {
              providerId: providerRow.id,
              providerPlaylistId: playlist.id,
            },
          },
          create: {
            providerId: providerRow.id,
            providerPlaylistId: playlist.id,
            userId,
            name: playlist.name,
            description: playlist.description ?? null,
            imageUrl: playlist.imageUrl ?? null,
            ownerName: playlist.ownerName ?? null,
            isPublic: playlist.isPublic ?? false,
            tracksCount: playlist.tracksCount ?? null,
          },
          update: {
            userId,
            name: playlist.name,
            description: playlist.description ?? null,
            imageUrl: playlist.imageUrl ?? null,
            ownerName: playlist.ownerName ?? null,
            isPublic: playlist.isPublic ?? false,
            tracksCount: playlist.tracksCount ?? null,
          },
        });

        if (provider.getPlaylistItems) {
          const accessTokenForTracks = accessToken;
          let trackOffset = 0;
          const trackPageSize = 100;
          const collected: NonNullable<Awaited<ReturnType<SpotifyProvider["getPlaylistItems"]>>> = [];

          for (let trackPage = 0; trackPage < 20; trackPage += 1) {
            const tracks = await provider.getPlaylistItems(accessTokenForTracks, playlist.id, trackPageSize, trackOffset);
            if (tracks.length === 0) break;
            collected.push(...tracks);
            if (tracks.length < trackPageSize) break;
            trackOffset += trackPageSize;
          }

          await syncPlaylistTracks(userId, providerRow.id, playlistRecord.id, collected);
        }
      }

      if (playlists.length < pageSize) break;
      offset += pageSize;
    }
  }

  const now = new Date();
  await prisma.listeningSession.create({
    data: {
      userId,
      startedAt: startOfDay(now),
      endedAt: now,
      durationMs: 0,
      trackCount: inserted.length,
      dayBucket: startOfDay(now),
      weekBucket: startOfWeek(now),
      monthBucket: startOfMonth(now),
    },
  });

  return { insertedCount: inserted.length };
}
