'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Play, Youtube } from 'lucide-react';
import {
  Box,
  Flex,
  Stack,
  Heading,
  Text,
  IconButton,
  Card,
  Badge,
} from '@mp/dying';
import { type Track } from '@mp/player-core';
import { usePlayerStore } from '@/stores/playerStore';

export interface LibraryLikedCardsProps {
  likedTracks: Track[];
  syncedLikedTracks: Track[];
  isYouTubeAuthenticated: boolean;
  onOpenConnectModal: () => void;
}

export const LibraryLikedCards: React.FC<LibraryLikedCardsProps> = ({
  likedTracks,
  syncedLikedTracks,
  isYouTubeAuthenticated,
  onOpenConnectModal,
}) => {
  const router = useRouter();
  const { playTrack, setQueue } = usePlayerStore();

  const handlePlayLiked = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (likedTracks.length === 0) return;
    setQueue(likedTracks, 0);
    playTrack(likedTracks[0]);
  };

  const handlePlayYouTubeLiked = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (syncedLikedTracks.length === 0) return;
    setQueue(syncedLikedTracks, 0);
    playTrack(syncedLikedTracks[0]);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
      {/* Local Liked Music Card */}
      <Card
        className="group relative overflow-hidden rounded-3xl border border-border-subtle bg-gradient-to-br from-rose-900/40 via-purple-900/20 to-surface cursor-pointer select-none transition-all duration-300 shadow-xl hover:shadow-2xl hover:border-border-muted p-6"
        onClick={() => router.push('/playlist/liked')}
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
              Local collection • {likedTracks.length} {likedTracks.length === 1 ? 'song' : 'songs'}
            </Text>
          </Stack>
        </Flex>
      </Card>

      {/* Synced YouTube Liked Songs Card */}
      {isYouTubeAuthenticated && (
        <Card
          className="group relative overflow-hidden rounded-3xl border border-border-subtle bg-gradient-to-br from-red-950/40 via-zinc-900/50 to-surface cursor-pointer select-none transition-all duration-300 shadow-xl hover:shadow-2xl hover:border-border-muted p-6"
          onClick={onOpenConnectModal}
        >
          <Flex direction="col" justify="between" className="h-44 sm:h-48">
            <Flex align="center" justify="between">
              <Box className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-600 flex items-center justify-center shadow-lg shadow-red-600/30">
                <Youtube size={24} className="text-white" />
              </Box>

              {syncedLikedTracks.length > 0 && (
                <IconButton
                  aria-label="Play YouTube liked songs"
                  variant="primary"
                  size="md"
                  className="rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  icon={<Play size={18} className="fill-current ml-0.5" />}
                  onClick={handlePlayYouTubeLiked}
                />
              )}
            </Flex>

            <Stack gap="1">
              <Flex align="center" gap="2">
                <Heading level={3} className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  YouTube Liked Songs
                </Heading>
                <Badge variant="accent" size="xs">Synced</Badge>
              </Flex>
              <Text size="sm" className="text-white/70">
                YouTube Music • {syncedLikedTracks.length} {syncedLikedTracks.length === 1 ? 'song' : 'songs'}
              </Text>
            </Stack>
          </Flex>
        </Card>
      )}
    </div>
  );
};
