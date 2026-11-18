'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Stack,
  Flex,
  Box,
  Text,
  Badge,
} from '@mp/dying';
import { Plus, Check, ListMusic } from 'lucide-react';
import { useLibraryStore, type Playlist } from '../stores/libraryStore';
import { type Track } from '@mp/player-core';

export interface AddToPlaylistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  track: Track | null;
  onCreateNewPlaylist?: () => void;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
  open,
  onOpenChange,
  track,
  onCreateNewPlaylist,
}) => {
  const { playlists, addTracksToPlaylist } = useLibraryStore();
  const [addedPlaylistIds, setAddedPlaylistIds] = useState<Set<string>>(new Set());
  const [isSubmittingId, setIsSubmittingId] = useState<string | null>(null);

  const handleAddToPlaylist = async (playlist: Playlist) => {
    if (!track || isSubmittingId) return;
    setIsSubmittingId(playlist.id);
    try {
      const ok = await addTracksToPlaylist(playlist.id, [track]);
      if (ok) {
        setAddedPlaylistIds((prev) => new Set(prev).add(playlist.id));
      }
    } finally {
      setIsSubmittingId(null);
    }
  };

  const handleClose = () => {
    setAddedPlaylistIds(new Set());
    setIsSubmittingId(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-surface/95 backdrop-blur-xl border border-border-subtle p-6 rounded-2xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-text-primary">
            Add to playlist
          </DialogTitle>
          <DialogDescription className="text-sm text-text-secondary">
            {track ? (
              <span className="truncate block">
                Choose a playlist for <span className="font-semibold text-text-primary">"{track.title}"</span>
              </span>
            ) : (
              'Select a playlist to add this song.'
            )}
          </DialogDescription>
        </DialogHeader>

        <Stack gap="3" className="py-2">
          {/* Quick Action: Create New Playlist */}
          <Button
            variant="secondary"
            size="md"
            leftIcon={<Plus size={16} />}
            className="w-full justify-start text-sm font-semibold rounded-xl text-text-primary hover:bg-surface-active"
            onClick={() => {
              handleClose();
              onCreateNewPlaylist?.();
            }}
          >
            Create new playlist
          </Button>

          {/* Existing Playlists Rail */}
          <Box className="max-h-64 overflow-y-auto space-y-1 pr-1">
            {playlists.length === 0 ? (
              <Box className="py-6 text-center">
                <Text size="sm" className="text-text-tertiary">
                  No custom playlists yet. Create one above to get started!
                </Text>
              </Box>
            ) : (
              playlists.map((pl) => {
                const isAdded = addedPlaylistIds.has(pl.id);
                const isLoading = isSubmittingId === pl.id;

                return (
                  <Button
                    key={pl.id}
                    variant="ghost"
                    size="md"
                    disabled={isAdded || isLoading}
                    onClick={() => handleAddToPlaylist(pl)}
                    className="w-full justify-between items-center px-3 py-2.5 h-auto text-left rounded-xl transition-colors hover:bg-surface-hover"
                  >
                    <Flex align="center" gap="3" className="min-w-0 flex-1">
                      <Box className="h-9 w-9 rounded-lg bg-surface-subtle flex items-center justify-center shrink-0 border border-border-subtle text-text-secondary">
                        <ListMusic size={18} />
                      </Box>
                      <Stack gap="0" className="min-w-0 flex-1">
                        <Text size="sm" weight="medium" className="truncate text-text-primary">
                          {pl.name}
                        </Text>
                        <Text size="xs" className="text-text-tertiary truncate">
                          {typeof pl.trackCount === 'number'
                            ? `${pl.trackCount} ${pl.trackCount === 1 ? 'song' : 'songs'}`
                            : 'Playlist'}
                        </Text>
                      </Stack>
                    </Flex>

                    {isAdded ? (
                      <Badge variant="accent" size="sm" className="bg-emerald-500/20 text-emerald-400 shrink-0">
                        <Check size={12} className="mr-1 inline" /> Added
                      </Badge>
                    ) : isLoading ? (
                      <Badge variant="neutral" size="sm" className="shrink-0">
                        Adding...
                      </Badge>
                    ) : (
                      <Plus size={16} className="text-text-tertiary shrink-0" />
                    )}
                  </Button>
                );
              })
            )}
          </Box>
        </Stack>

        <DialogFooter>
          <Flex justify="end" className="w-full">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-text-secondary hover:text-text-primary"
            >
              Done
            </Button>
          </Flex>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
