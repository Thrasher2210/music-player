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
  Input,
  FormField,
  Stack,
  Flex,
} from '@mp/dying';
import { useLibraryStore, type Playlist } from '../stores/libraryStore';

export interface CreatePlaylistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlaylistCreated?: (playlist: Playlist) => void;
}

export const CreatePlaylistDialog: React.FC<CreatePlaylistDialogProps> = ({
  open,
  onOpenChange,
  onPlaylistCreated,
}) => {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { createPlaylist } = useLibraryStore();

  const handleClose = () => {
    setName('');
    setError(null);
    setIsSubmitting(false);
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Playlist name is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const created = await createPlaylist(trimmed);
      if (created) {
        onPlaylistCreated?.(created);
        handleClose();
      } else {
        setError('Failed to create playlist. Make sure you are signed in.');
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-surface/95 backdrop-blur-xl border border-border-subtle p-6 rounded-2xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-text-primary">
            New playlist
          </DialogTitle>
          <DialogDescription className="text-sm text-text-secondary">
            Create a custom playlist to save and organize your favorite songs.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Stack gap="4" className="py-4">
            <FormField
              label="Title"
              errorMessage={error ?? undefined}
              required
            >
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="My playlist #1"
                autoFocus
                disabled={isSubmitting}
                className="w-full bg-surface-subtle border-border-subtle focus:bg-surface text-text-primary text-sm rounded-lg"
              />
            </FormField>
          </Stack>

          <DialogFooter>
            <Flex justify="end" gap="3" className="w-full">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={handleClose}
                disabled={isSubmitting}
                className="text-text-secondary hover:text-text-primary"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSubmitting}
                disabled={!name.trim() || isSubmitting}
              >
                Create
              </Button>
            </Flex>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
