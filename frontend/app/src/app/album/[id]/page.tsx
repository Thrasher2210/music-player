'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Play, Disc3, Clock } from 'lucide-react';
import {
  Container,
  Box,
  Flex,
  Stack,
  Heading,
  Badge,
  Button,
  TrackRow,
  Skeleton,
  EmptyState,
} from '@mp/dying';
import { usePlayerStore, toTrackData } from '@/stores/playerStore';
import { type AlbumDetails, type Track } from '@mp/player-core';

export default function AlbumPage() {
  const params = useParams();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const rawId = params?.id as string | undefined;
  const albumId = rawId ? decodeURIComponent(rawId) : '';

  const [album, setAlbum] = useState<AlbumDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    getAlbum,
    currentTrack,
    playbackState,
    playTrack,
    setQueue,
    togglePlay,
  } = usePlayerStore();

  const isPlaying = playbackState === 'playing';

  useEffect(() => {
    if (!albumId) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    getAlbum(albumId)
      .then((data) => {
        if (isMounted) {
          setAlbum(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err?.message || 'Failed to load album');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [albumId, getAlbum]);

  const handlePlayAlbum = () => {
    if (!album || album.tracks.length === 0) return;
    setQueue(album.tracks, 0);
    playTrack(album.tracks[0]);
  };

  const handleTrackSelect = (track: Track, index: number) => {
    if (!album) return;
    setQueue(album.tracks, index);
    playTrack(track);
  };

  if (isLoading) {
    return (
      <Container size="xl" className="py-8 px-4 sm:px-6">
        <Flex gap="6" className="flex-col sm:flex-row items-center sm:items-end mb-8">
          <Skeleton className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl shrink-0" />
          <Stack gap="3" className="w-full">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-10 w-72" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-10 w-32" />
          </Stack>
        </Flex>
        <Stack gap="3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </Stack>
      </Container>
    );
  }

  if (error || !album) {
    return (
      <Container size="xl" className="py-16 px-4">
        <EmptyState
          icon={<Disc3 size={36} className="text-text-tertiary" />}
          title="Album Not Found"
          description={error || "We couldn't locate this album."}
          actionSlot={
            <Button variant="secondary" onClick={() => router.push('/')}>
              Return Home
            </Button>
          }
        />
      </Container>
    );
  }

  return (
    <Container size="xl" className="py-6 px-4 sm:px-6 pb-24">
      {/* Album Header */}
      <Flex
        gap="6"
        className="flex-col sm:flex-row items-center sm:items-end mb-10 pb-8 border-b border-border-subtle"
      >
        {/* Cover Art */}
        <Box className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 rounded-2xl overflow-hidden border border-border-subtle bg-surface shrink-0 shadow-2xl">
          {album.coverUrl ? (
            <img
              src={album.coverUrl}
              alt={album.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <Flex align="center" justify="center" className="w-full h-full text-text-tertiary">
              <Disc3 size={48} />
            </Flex>
          )}
        </Box>

        {/* Album Meta */}
        <Stack gap="3" className="min-w-0 flex-1 text-center sm:text-left">
          <Badge variant="glass" className="w-fit self-center sm:self-start">
            ALBUM
          </Badge>

          <Heading level={1} className="text-2xl sm:text-4xl md:text-5xl font-black text-text-primary tracking-tight">
            {album.title}
          </Heading>

          <Flex align="center" gap="2" className="justify-center sm:justify-start text-sm text-text-secondary flex-wrap">
            {album.artistBrowseId ? (
              <span
                onClick={() => startTransition(() => router.push(`/artist/${album.artistBrowseId}`))}
                className="font-medium text-text-primary hover:underline cursor-pointer"
              >
                {album.artist}
              </span>
            ) : (
              <span className="font-medium text-text-primary">{album.artist}</span>
            )}
            {album.year && <span>• {album.year}</span>}
            <span>• {album.tracks.length} songs</span>
          </Flex>

          <Box className="pt-2">
            <Button
              variant="primary"
              size="lg"
              className="rounded-full shadow-lg shadow-white/10"
              onClick={handlePlayAlbum}
            >
              <Play size={18} className="fill-current mr-2" />
              Play Album
            </Button>
          </Box>
        </Stack>
      </Flex>

      {/* Tracklist */}
      <Box>
        <Flex align="center" justify="between" className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary border-b border-border-subtle mb-2">
          <span># Title</span>
          <Flex align="center" gap="1">
            <Clock size={13} />
            <span className="sr-only">Duration</span>
          </Flex>
        </Flex>

        <Stack gap="1">
          {album.tracks.map((track, idx) => {
            const isTrackActive =
              currentTrack?.videoId === track.videoId || currentTrack?.id === track.id;

            return (
              <TrackRow
                key={track.videoId || track.id || idx}
                index={idx}
                track={toTrackData(track)}
                isActive={isTrackActive}
                isPlaying={isTrackActive && isPlaying}
                showAlbum={false}
                onSelect={() => handleTrackSelect(track, idx)}
                onPlay={() => {
                  if (isTrackActive) {
                    togglePlay();
                  } else {
                    handleTrackSelect(track, idx);
                  }
                }}
                onPause={() => togglePlay()}
                onArtistClick={(_artist, artistId) => {
                  const target = artistId || album.artistBrowseId;
                  if (target) {
                    startTransition(() => router.push(`/artist/${target}`));
                  }
                }}
              />
            );
          })}
        </Stack>
      </Box>
    </Container>
  );
}
