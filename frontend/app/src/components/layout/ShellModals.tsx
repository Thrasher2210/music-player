'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CreatePlaylistDialog } from '../CreatePlaylistDialog';
import { AddToPlaylistModal } from '../AddToPlaylistModal';
import { AccountModal } from '../AccountModal';
import { PlaybackOptionsModal } from '../PlaybackOptionsModal';
import { type Track } from '../../stores/playerStore';

export interface ShellModalsProps {
  isCreatePlaylistOpen: boolean;
  setIsCreatePlaylistOpen: (open: boolean) => void;
  isAddToPlaylistOpen: boolean;
  setIsAddToPlaylistOpen: (open: boolean) => void;
  trackToAddToPlaylist: Track | null;
  setTrackToAddToPlaylist: (track: Track | null) => void;
  isAccountModalOpen: boolean;
  setIsAccountModalOpen: (open: boolean) => void;
  isPlaybackOptionsOpen: boolean;
  setIsPlaybackOptionsOpen: (open: boolean) => void;
}

export function ShellModals({
  isCreatePlaylistOpen,
  setIsCreatePlaylistOpen,
  isAddToPlaylistOpen,
  setIsAddToPlaylistOpen,
  trackToAddToPlaylist,
  setTrackToAddToPlaylist,
  isAccountModalOpen,
  setIsAccountModalOpen,
  isPlaybackOptionsOpen,
  setIsPlaybackOptionsOpen,
}: ShellModalsProps) {
  const router = useRouter();

  return (
    <>
      <CreatePlaylistDialog
        open={isCreatePlaylistOpen}
        onOpenChange={setIsCreatePlaylistOpen}
        onPlaylistCreated={(pl: any) => {
          setIsCreatePlaylistOpen(false);
          router.push(`/playlist/${pl.id}`);
        }}
      />

      <AddToPlaylistModal
        open={isAddToPlaylistOpen}
        onOpenChange={(open) => {
          setIsAddToPlaylistOpen(open);
          if (!open) setTrackToAddToPlaylist(null);
        }}
        track={trackToAddToPlaylist}
        onCreateNewPlaylist={() => {
          setIsAddToPlaylistOpen(false);
          setIsCreatePlaylistOpen(true);
        }}
      />

      <AccountModal
        open={isAccountModalOpen}
        onOpenChange={setIsAccountModalOpen}
      />

      <PlaybackOptionsModal
        open={isPlaybackOptionsOpen}
        onOpenChange={setIsPlaybackOptionsOpen}
      />
    </>
  );
}
