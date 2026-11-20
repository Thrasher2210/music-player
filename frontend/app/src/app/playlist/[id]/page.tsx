'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Heart, ListMusic, Clock } from 'lucide-react';
import {
  Container,
  Box,
  Flex,
  Stack,
  Button,
  TrackRow,
  Skeleton,
  EmptyState,
} from '@mp/dying';
import { usePlayerStore, toTrackData } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { type Track } from '@mp/player-core';
import { PlaylistHeader } from '../components/PlaylistHeader';
import { loadPlaylistData } from '../utils/loadPlaylistData';

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

  const { fetchLibrary, fetchPlaylistTracks } = useLibraryStore();

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

    loadPlaylistData(playlistId, getPlaylist, fetchLibrary, fetchPlaylistTracks)
      .then((data) => {
        if (isMounted) {
          setTitle(data.title);
          setDescription(data.description);
          setAuthor(data.author);
          setCoverUrl(data.coverUrl);
          setTracks(data.tracks);
          setIsLoading(false);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setError(err?.message || 'Failed to load playlist');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [playlistId, getPlaylist, fetchLibrary, fetchPlaylistTracks]);

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
    const isCurrent = currentTrack && (currentTrack.videoId === track.videoId || currentTrack.id === track.id);
    if (isCurrent) {
      togglePlay();
      return;
    }
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
      <PlaylistHeader
        title={title}
        description={description}
        author={author}
        coverUrl={coverUrl}
        isLikedPlaylist={isLikedPlaylist}
        trackCount={tracks.length}
        isThisPlaylistPlaying={isThisPlaylistPlaying}
        onPlayAll={handlePlayAll}
      />

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
          <Flex
            align="center"
            justify="between"
            className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary border-b border-border-subtle mb-2"
          >
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
