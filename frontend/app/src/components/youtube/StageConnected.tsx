'use client';

import React from 'react';
import { RefreshCw, CheckCircle2, ListMusic, Heart } from 'lucide-react';
import {
  DialogFooter,
  Button,
  Avatar,
  Card,
  Stack,
  Flex,
  Box,
  Text,
} from '@mp/dying';
import { type YouTubeAccount } from '@/stores/youtubeAuthStore';
import { type Track } from '@mp/player-core';

export interface StageConnectedProps {
  youtubeAccount: YouTubeAccount | null;
  syncedLikedTracks: Track[];
  syncedPlaylists: any[];
  isSyncing: boolean;
  isChecking: boolean;
  onSync: () => void;
  onCheckStatus: () => void;
}

export const StageConnected: React.FC<StageConnectedProps> = ({
  youtubeAccount,
  syncedLikedTracks,
  syncedPlaylists,
  isSyncing,
  isChecking,
  onSync,
  onCheckStatus,
}) => {
  const accountInitial = (youtubeAccount?.name || 'Y')[0]?.toUpperCase();

  return (
    <Stack gap="4" className="py-2">
      <Card variant="glass" className="p-4 border-border-subtle">
        <Flex align="center" gap="4">
          <Avatar
            src={youtubeAccount?.avatar}
            fallback={accountInitial}
            size="lg"
          />
          <Stack gap="1">
            <Text size="base" weight="semibold" className="text-text-primary">
              {youtubeAccount?.name || 'YouTube Music Account'}
            </Text>
            <Text size="xs" variant="secondary">
              {youtubeAccount?.handle || 'Active Google Session'}
            </Text>
            <Flex align="center" gap="1" className="text-emerald-400 mt-1">
              <CheckCircle2 size={14} />
              <Text size="xs" className="text-emerald-400 font-medium">
                Ready to sync library
              </Text>
            </Flex>
          </Stack>
        </Flex>
      </Card>

      <Flex gap="3" className="w-full">
        <Card variant="default" className="p-3 flex-1 border-border-subtle bg-surface-active/20">
          <Flex align="center" gap="3">
            <Box className="p-2 rounded-lg bg-rose-500/15 text-rose-400">
              <Heart size={16} className="fill-current" />
            </Box>
            <Stack gap="1">
              <Text size="xs" variant="secondary">Liked Songs</Text>
              <Text size="sm" weight="semibold" className="text-text-primary">
                {syncedLikedTracks.length} synced
              </Text>
            </Stack>
          </Flex>
        </Card>

        <Card variant="default" className="p-3 flex-1 border-border-subtle bg-surface-active/20">
          <Flex align="center" gap="3">
            <Box className="p-2 rounded-lg bg-sky-500/15 text-sky-400">
              <ListMusic size={16} />
            </Box>
            <Stack gap="1">
              <Text size="xs" variant="secondary">Playlists</Text>
              <Text size="sm" weight="semibold" className="text-text-primary">
                {syncedPlaylists.length} synced
              </Text>
            </Stack>
          </Flex>
        </Card>
      </Flex>

      <DialogFooter className="pt-2 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={onCheckStatus}
          isLoading={isChecking}
          size="sm"
          leftIcon={<RefreshCw size={14} />}
        >
          Refresh Status
        </Button>
        <Button
          variant="primary"
          onClick={onSync}
          isLoading={isSyncing}
          loadingText="Syncing..."
          leftIcon={<RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />}
        >
          Sync Liked Songs & Playlists
        </Button>
      </DialogFooter>
    </Stack>
  );
};
