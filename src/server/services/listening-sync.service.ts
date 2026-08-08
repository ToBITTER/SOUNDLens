import { prisma } from "@/lib/db";
import { SpotifyProvider } from "@/lib/providers/spotify";
import { decryptText } from "@/lib/auth/crypto";
import { getValidSpotifyAccessToken } from "./spotify-token.service";

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
  const recentItems = await provider.getRecentlyPlayed(accessToken, 50);

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
    const dedupeKey = {
      userId_trackId_playedAt: {
        userId,
        trackId: track.id,
        playedAt,
      },
    };

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

  const now = new Date();
  await prisma.listeningSession.createMany({
    data: [
      {
        userId,
        startedAt: startOfDay(now),
        endedAt: now,
        durationMs: 0,
        trackCount: inserted.length,
        dayBucket: startOfDay(now),
        weekBucket: startOfWeek(now),
        monthBucket: startOfMonth(now),
      },
    ],
  });

  return { insertedCount: inserted.length };
}
