'use client';

import React from 'react';
import { Play, Pause, Shuffle, Heart, Share2, ListMusic } from 'lucide-react';
import {
  Box,
  Flex,
  Stack,
  Heading,
  Text,
  Badge,
  Button,
  IconButton,
} from '@mp/dying';

export interface PlaylistHeaderProps {
  title: string;
  description?: string;
  author?: string;
  coverUrl?: string;
  isLikedPlaylist: boolean;
  trackCount: number;
  isThisPlaylistPlaying: boolean;
  onPlayAll: (shuffle?: boolean) => void;
}

export function PlaylistHeader({
  title,
  description,
  author,
  coverUrl,
  isLikedPlaylist,
  trackCount,
  isThisPlaylistPlaying,
  onPlayAll,
}: PlaylistHeaderProps) {
  const [imgError, setImgError] = React.useState(false);

  React.useEffect(() => {
    setImgError(false);
  }, [coverUrl]);

  return (
    <Flex
      gap="6"
      className="flex-col sm:flex-row items-center sm:items-end mb-10 pb-8 border-b border-border-subtle"
    >
      {/* Cover Art / Icon */}
      <Box className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 rounded-2xl overflow-hidden border border-border-subtle bg-surface shrink-0 shadow-2xl flex items-center justify-center">
        {coverUrl && !imgError ? (
          <img
            src={coverUrl}
            alt={title}
            onError={() => setImgError(true)}
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

        <Heading
          level={1}
          className="text-2xl sm:text-4xl md:text-5xl font-black text-text-primary tracking-tight"
        >
          {title}
        </Heading>

        {description && (
          <Text size="sm" className="text-text-secondary max-w-2xl">
            {description}
          </Text>
        )}

        <Flex
          align="center"
          gap="2"
          className="justify-center sm:justify-start text-sm text-text-secondary flex-wrap"
        >
          {author && <span className="font-medium text-text-primary">{author}</span>}
          <span>• {trackCount} songs</span>
        </Flex>

        {trackCount > 0 && (
          <Flex
            align="center"
            gap="3"
            className="pt-3 justify-center sm:justify-start flex-wrap"
          >
            <Button
              variant="primary"
              size="lg"
              className="rounded-full font-bold px-7 shadow-xl shadow-white/10 hover:scale-105 active:scale-95 transition-all"
              leftIcon={
                isThisPlaylistPlaying ? (
                  <Pause size={18} className="fill-current" />
                ) : (
                  <Play size={18} className="fill-current ml-0.5" />
                )
              }
              onClick={() => onPlayAll(false)}
            >
              {isThisPlaylistPlaying ? 'Pause' : 'Play all'}
            </Button>
            <Button
              variant="glass"
              size="lg"
              className="rounded-full font-semibold px-5 hover:scale-105 active:scale-95 transition-all"
              leftIcon={<Shuffle size={18} />}
              onClick={() => onPlayAll(true)}
            >
              Shuffle
            </Button>
            <IconButton
              aria-label="Share playlist"
              variant="glass"
              shape="circle"
              size="lg"
              icon={<Share2 size={19} />}
              onClick={() => {
                if (typeof window !== 'undefined') {
                  navigator.clipboard.writeText(window.location.href);
                }
              }}
            />
          </Flex>
        )}
      </Stack>
    </Flex>
  );
}
