'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Play, Pause, Shuffle, Heart, ListMusic, Clock } from 'lucide-react';
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
  Skeleton,
  EmptyState,
} from '@mp/dying';
import { usePlayerStore, toTrackData } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { type Track } from '@mp/player-core';

export default function PlaylistPage() {
  const params = useParams();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const rawId = params?.id as string | undefined;
  const playlistId = rawId ? decodeURIComponent(rawId) : '';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState<string | undefined>();
  const [author, setAuthor] = useState<string | undefined>();
  const [coverUrl, setCoverUrl] = useState<string | undefined>();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    getPlaylist,
    currentTrack,
    playbackState,
    playTrack,
    setQueue,
    play,
    pause,
    togglePlay,
  } = usePlayerStore();

  const {
    likedTracks,
    fetchLibrary,
    fetchPlaylistTracks,
    playlists,
  } = useLibraryStore();

  const isPlaylistActive = Boolean(
    currentTrack && tracks.some((t) => (t.videoId || t.id) === (currentTrack.videoId || currentTrack.id))
  );
  const isPlaying = playbackState === 'playing';
  const isThisPlaylistPlaying = isPlaylistActive && isPlaying;

  useEffect(() => {
    if (!playlistId) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const loadData = async () => {
      try {
        if (playlistId === 'liked') {
          await fetchLibrary();
          if (isMounted) {
            setTitle('Liked Music');
            setDescription('Auto playlist of tracks you have liked');
            setAuthor('You');
            setTracks(likedTracks);
            setIsLoading(false);
          }
          return;
        }

        if (playlistId.startsWith('VL') || playlistId.startsWith('PL')) {
          const remote = await getPlaylist(playlistId);
          if (isMounted) {
            setTitle(remote.title);
            setDescription(remote.description);
            setAuthor(remote.author);
            setCoverUrl(remote.coverUrl);
            setTracks(remote.tracks);
            setIsLoading(false);
          }
          return;
        }

        // Custom local/backend playlist
        const pTracks = await fetchPlaylistTracks(playlistId);
        const meta = playlists.find((p) => p.id === playlistId);
        if (isMounted) {
          setTitle(meta?.name || 'Playlist');
          setAuthor('You');
          setTracks(pTracks);
          setIsLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Failed to load playlist');
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [playlistId, fetchLibrary, fetchPlaylistTracks, getPlaylist, likedTracks, playlists]);

  const handlePlayAll = (shuffle = false) => {
    if (tracks.length === 0) return;

    if (isThisPlaylistPlaying && !shuffle) {
      pause();
      return;
    }

    if (isPlaylistActive && playbackState === 'paused' && !shuffle) {
      play();
      return;
    }

    const playlistTracks = [...tracks];
    if (shuffle) {
      for (let i = playlistTracks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [playlistTracks[i], playlistTracks[j]] = [playlistTracks[j], playlistTracks[i]];
      }
    }

    setQueue(playlistTracks, 0, false);
    playTrack(playlistTracks[0]);
  };

  const handleTrackSelect = (track: Track, index: number) => {
    setQueue(tracks, index, false);
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

  if (error) {
    return (
      <Container size="xl" className="py-16 px-4">
        <EmptyState
          icon={<ListMusic size={36} className="text-text-tertiary" />}
          title="Playlist Not Found"
          description={error}
          actionSlot={
            <Button variant="secondary" onClick={() => router.push('/')}>
              Return Home
            </Button>
          }
        />
      </Container>
    );
  }

  const isLikedPlaylist = playlistId === 'liked';

  return (
    <Container size="xl" className="py-6 px-4 sm:px-6 pb-24">
      {/* Playlist Header */}
      <Flex
        gap="6"
        className="flex-col sm:flex-row items-center sm:items-end mb-10 pb-8 border-b border-border-subtle"
      >
        {/* Cover Art / Icon */}
        <Box className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 rounded-2xl overflow-hidden border border-border-subtle bg-surface shrink-0 shadow-2xl flex items-center justify-center">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : isLikedPlaylist ? (
            <Box className="w-full h-full bg-gradient-to-tr from-rose-600 via-pink-600 to-amber-500 flex items-center justify-center">
              <Heart size={64} className="text-white fill-white shadow-xl" />
            </Box>
          ) : (
            <Flex align="center" justify="center" className="w-full h-full text-text-tertiary">
              <ListMusic size={48} />
            </Flex>
          )}
        </Box>

        {/* Playlist Meta */}
        <Stack gap="3" className="min-w-0 flex-1 text-center sm:text-left">
          <Badge variant="glass" className="w-fit self-center sm:self-start">
            PLAYLIST
          </Badge>

          <Heading level={1} className="text-2xl sm:text-4xl md:text-5xl font-black text-text-primary tracking-tight">
            {title}
          </Heading>

          {description && (
            <Text size="sm" className="text-text-secondary max-w-2xl">
              {description}
            </Text>
          )}

          <Flex align="center" gap="2" className="justify-center sm:justify-start text-sm text-text-secondary flex-wrap">
            {author && <span className="font-medium text-text-primary">{author}</span>}
            <span>• {tracks.length} songs</span>
          </Flex>

          {tracks.length > 0 && (
            <Flex align="center" gap="3" className="pt-2 justify-center sm:justify-start">
              <Button
                variant="primary"
                size="lg"
                className="rounded-full shadow-lg shadow-white/10"
                onClick={() => handlePlayAll(false)}
              >
                {isThisPlaylistPlaying ? (
                  <>
                    <Pause size={18} className="fill-current mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play size={18} className="fill-current mr-2" />
                    Play All
                  </>
                )}
              </Button>
              <IconButton
                aria-label="Shuffle playlist"
                variant="secondary"
                size="md"
                className="rounded-full"
                icon={<Shuffle size={18} />}
                onClick={() => handlePlayAll(true)}
              />
            </Flex>
          )}
        </Stack>
      </Flex>

      {/* Tracklist */}
      {tracks.length === 0 ? (
        <EmptyState
          icon={isLikedPlaylist ? <Heart size={32} /> : <ListMusic size={32} />}
          title={isLikedPlaylist ? 'No Liked Songs Yet' : 'Empty Playlist'}
          description={
            isLikedPlaylist
              ? 'Heart any song in the player or list to build your collection.'
              : 'Add songs from search or quick picks to start listening.'
          }
          actionSlot={
            <Button variant="secondary" onClick={() => router.push('/')}>
              Explore Music
            </Button>
          }
        />
      ) : (
        <Box>
          <Flex align="center" justify="between" className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary border-b border-border-subtle mb-2">
            <span># Title</span>
            <Flex align="center" gap="1">
              <Clock size={13} />
              <span className="sr-only">Duration</span>
            </Flex>
          </Flex>

          <Stack gap="1">
            {tracks.map((track, idx) => {
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
                  onArtistClick={(_artist, artistId) => {
                    if (artistId) {
                      startTransition(() => router.push(`/artist/${artistId}`));
                    }
                  }}
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
    </Container>
  );
}
