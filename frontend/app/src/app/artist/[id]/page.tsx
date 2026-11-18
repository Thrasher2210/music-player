'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Play, Shuffle, Users, Music2 } from 'lucide-react';
import {
  Container,
  Box,
  Flex,
  Stack,
  Heading,
  Text,
  Badge,
  Button,
  IconButton,
  TrackRow,
  MediaShelf,
  MediaCard,
  Skeleton,
  EmptyState,
} from '@mp/dying';
import { usePlayerStore, toTrackData } from '@/stores/playerStore';
import { type ArtistDetails, type Track } from '@mp/player-core';

export default function ArtistPage() {
  const params = useParams();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const rawId = params?.id as string | undefined;
  const artistId = rawId ? decodeURIComponent(rawId) : '';

  const [artist, setArtist] = useState<ArtistDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    getArtist,
    currentTrack,
    playbackState,
    playTrack,
    setQueue,
    togglePlay,
  } = usePlayerStore();

  const isPlaying = playbackState === 'playing';

  useEffect(() => {
    if (!artistId) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    getArtist(artistId)
      .then((data) => {
        if (isMounted) {
          setArtist(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err?.message || 'Failed to load artist details');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [artistId, getArtist]);

  const handlePlayAll = (shuffle = false) => {
    if (!artist || artist.topSongs.length === 0) return;

    const songs = [...artist.topSongs];
    if (shuffle) {
      for (let i = songs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [songs[i], songs[j]] = [songs[j], songs[i]];
      }
    }

    setQueue(songs, 0);
    playTrack(songs[0]);
  };

  const handleTrackSelect = (track: Track, index: number) => {
    if (!artist) return;
    setQueue(artist.topSongs, index);
    playTrack(track);
  };

  if (isLoading) {
    return (
      <Container size="xl" className="py-8 px-4 sm:px-6">
        <Box className="relative h-72 sm:h-80 md:h-96 rounded-3xl overflow-hidden border border-border-subtle bg-surface mb-8">
          <Skeleton className="w-full h-full" />
        </Box>
        <Stack gap="4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </Stack>
      </Container>
    );
  }

  if (error || !artist) {
    return (
      <Container size="xl" className="py-16 px-4">
        <EmptyState
          icon={<Music2 size={36} className="text-text-tertiary" />}
          title="Artist Not Found"
          description={error || "We couldn't load the details for this artist."}
          actionSlot={
            <Button variant="secondary" onClick={() => router.push('/')}>
              Return Home
            </Button>
          }
        />
      </Container>
    );
  }

  const heroImage = artist.bannerUrl || artist.avatarUrl || '';

  return (
    <Container size="xl" className="py-6 px-4 sm:px-6 pb-24">
      {/* Artist Hero Header */}
      <Box className="relative h-64 sm:h-80 md:h-96 rounded-3xl overflow-hidden border border-border-subtle bg-surface mb-10 shadow-2xl">
        {heroImage && (
          <img
            src={heroImage}
            alt={artist.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 md:p-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <Stack gap="2" className="max-w-2xl">
            <Flex align="center" gap="2">
              <Badge variant="glass" className="border-white/20 text-white/90">
                ARTIST
              </Badge>
              {artist.subscribers && (
                <Flex align="center" gap="1" className="text-xs text-white/70">
                  <Users size={13} />
                  <span>{artist.subscribers} subscribers</span>
                </Flex>
              )}
            </Flex>

            <Heading level={1} className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight">
              {artist.name}
            </Heading>

            {artist.description && (
              <Text size="sm" className="text-white/80 line-clamp-2 max-w-xl text-xs sm:text-sm mt-1">
                {artist.description}
              </Text>
            )}
          </Stack>

          <Flex align="center" gap="3" className="shrink-0">
            <Button
              variant="primary"
              size="lg"
              className="rounded-full shadow-xl shadow-white/10"
              onClick={() => handlePlayAll(false)}
            >
              <Play size={18} className="fill-current mr-2" />
              Play All
            </Button>
            <IconButton
              aria-label="Shuffle play"
              variant="secondary"
              size="md"
              className="rounded-full"
              icon={<Shuffle size={18} />}
              onClick={() => handlePlayAll(true)}
            />
          </Flex>
        </div>
      </Box>

      {/* Top Songs */}
      {artist.topSongs.length > 0 && (
        <Box className="mb-12">
          <Flex align="center" justify="between" className="mb-4">
            <Heading level={3} className="text-xl sm:text-2xl font-bold text-text-primary">
              Top Songs
            </Heading>
          </Flex>

          <Stack gap="1">
            {artist.topSongs.map((track, idx) => {
              const isTrackActive =
                currentTrack?.videoId === track.videoId || currentTrack?.id === track.id;

              return (
                <TrackRow
                  key={track.videoId || track.id || idx}
                  index={idx}
                  track={toTrackData(track)}
                  isActive={isTrackActive}
                  isPlaying={isTrackActive && isPlaying}
                  onSelect={() => handleTrackSelect(track, idx)}
                  onPlay={() => {
                    if (isTrackActive) {
                      togglePlay();
                    } else {
                      handleTrackSelect(track, idx);
                    }
                  }}
                  onPause={() => togglePlay()}
                  onAlbumClick={(_album, albumId) => {
                    if (albumId) {
                      startTransition(() => router.push(`/album/${albumId}`));
                    }
                  }}
                />
              );
            })}
          </Stack>
        </Box>
      )}

      {/* Discography / Albums */}
      {artist.albums.length > 0 && (
        <Box className="mb-12">
          <MediaShelf title="Albums">
            {artist.albums.map((item) => (
              <MediaCard
                key={item.id}
                title={item.title}
                subtitle={item.subtitle}
                imageUrl={item.thumbnail}
                onClick={() => {
                  const targetId = item.browseId || item.id;
                  startTransition(() => router.push(`/album/${targetId}`));
                }}
              />
            ))}
          </MediaShelf>
        </Box>
      )}

      {/* Singles & EPs */}
      {artist.singles.length > 0 && (
        <Box className="mb-12">
          <MediaShelf title="Singles & EPs">
            {artist.singles.map((item) => (
              <MediaCard
                key={item.id}
                title={item.title}
                subtitle={item.subtitle}
                imageUrl={item.thumbnail}
                onClick={() => {
                  const targetId = item.browseId || item.id;
                  startTransition(() => router.push(`/album/${targetId}`));
                }}
              />
            ))}
          </MediaShelf>
        </Box>
      )}

      {/* Related Artists */}
      {artist.relatedArtists.length > 0 && (
        <Box className="mb-12">
          <MediaShelf title="Fans Might Also Like">
            {artist.relatedArtists.map((item) => (
              <MediaCard
                key={item.id}
                title={item.title}
                subtitle={item.subtitle}
                imageUrl={item.thumbnail}
                onClick={() => {
                  const targetId = item.browseId || item.id;
                  startTransition(() => router.push(`/artist/${targetId}`));
                }}
              />
            ))}
          </MediaShelf>
        </Box>
      )}
    </Container>
  );
}
