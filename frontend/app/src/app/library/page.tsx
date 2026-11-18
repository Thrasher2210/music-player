'use client';

import React, { useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, ListMusic, Plus, Play } from 'lucide-react';
import {
  Container,
  Box,
  Flex,
  Stack,
  Heading,
  Text,
  PageHeader,
  Button,
  IconButton,
  Card,
  EmptyState,
} from '@mp/dying';
import { useLibraryStore } from '@/stores/libraryStore';
import { usePlayerStore } from '@/stores/playerStore';

export default function LibraryPage() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const { likedTracks, playlists, fetchLibrary } = useLibraryStore();
  const { playTrack, setQueue } = usePlayerStore();

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  const handlePlayLiked = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (likedTracks.length === 0) return;
    setQueue(likedTracks, 0);
    playTrack(likedTracks[0]);
  };

  return (
    <Container size="xl" className="py-6 px-4 sm:px-6 pb-24">
      <PageHeader
        title="Library"
        kicker="Your Music"
        actionSlot={
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full"
            onClick={() => {
              // Trigger modal or prompt for new playlist
              const name = window.prompt('Playlist name:');
              if (name) {
                useLibraryStore.getState().createPlaylist(name);
              }
            }}
          >
            <Plus size={16} className="mr-1.5" />
            New Playlist
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {/* Liked Music Card */}
        <Card
          className="group relative overflow-hidden rounded-3xl border border-border-subtle bg-gradient-to-br from-rose-900/40 via-purple-900/20 to-surface cursor-pointer select-none transition-all duration-300 shadow-xl hover:shadow-2xl hover:border-border-muted p-6"
          onClick={() => startTransition(() => router.push('/playlist/liked'))}
        >
          <Flex direction="col" justify="between" className="h-44 sm:h-48">
            <Flex align="center" justify="between">
              <Box className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-500/30">
                <Heart size={24} className="text-white fill-white" />
              </Box>

              {likedTracks.length > 0 && (
                <IconButton
                  aria-label="Play liked songs"
                  variant="primary"
                  size="md"
                  className="rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  icon={<Play size={18} className="fill-current ml-0.5" />}
                  onClick={handlePlayLiked}
                />
              )}
            </Flex>

            <Stack gap="1">
              <Heading level={3} className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Liked Music
              </Heading>
              <Text size="sm" className="text-white/70">
                Auto playlist • {likedTracks.length} {likedTracks.length === 1 ? 'song' : 'songs'}
              </Text>
            </Stack>
          </Flex>
        </Card>
      </div>

      {/* User Playlists */}
      <Box className="mb-12">
        <Heading level={2} className="text-xl sm:text-2xl font-bold text-text-primary mb-4">
          Playlists
        </Heading>

        {playlists.length === 0 ? (
          <EmptyState
            icon={<ListMusic size={32} />}
            title="No Playlists Yet"
            description="Create custom playlists to organize your favorite songs."
            actionSlot={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const name = window.prompt('Playlist name:');
                  if (name) {
                    useLibraryStore.getState().createPlaylist(name);
                  }
                }}
              >
                <Plus size={16} className="mr-1.5" />
                Create Playlist
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {playlists.map((playlist) => (
              <Card
                key={playlist.id}
                className="group p-4 rounded-2xl border border-border-subtle bg-surface hover:bg-surface-hover/80 transition-all cursor-pointer shadow-md"
                onClick={() => startTransition(() => router.push(`/playlist/${playlist.id}`))}
              >
                <Box className="aspect-square w-full rounded-xl bg-surface-active/60 border border-border-subtle flex items-center justify-center mb-3">
                  <ListMusic size={32} className="text-text-tertiary" />
                </Box>
                <Heading level={4} className="text-sm font-semibold text-text-primary truncate">
                  {playlist.name}
                </Heading>
                <Text size="xs" className="text-text-secondary mt-0.5">
                  Playlist {playlist.trackCount ? `• ${playlist.trackCount} songs` : ''}
                </Text>
              </Card>
            ))}
          </div>
        )}
      </Box>
    </Container>
  );
}
