'use client';

import React, { useCallback } from 'react';
import { Heart, ListEnd, ListPlus, ListStart, Trash2 } from 'lucide-react';
import { DropdownMenuItem } from '@mp/dying';
import type { Track } from '@mp/player-core';
import { usePlayerStore } from '../../stores/playerStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { useTrackActionsStore } from '../../stores/trackActionsStore';
import {
  buildTrackMenuItems,
  type TrackMenuActions,
  type TrackMenuItem,
  type TrackMenuItemId,
} from './buildTrackMenuItems';

const ITEM_ICONS: Record<TrackMenuItemId, React.ReactNode> = {
  'play-next': <ListStart size={16} />,
  'add-to-queue': <ListEnd size={16} />,
  'add-to-playlist': <ListPlus size={16} />,
  'toggle-like': <Heart size={16} />,
  'remove-from-playlist': <Trash2 size={16} />,
};

function TrackMenuItems({ items }: { items: TrackMenuItem[] }) {
  return (
    <>
      {items.map((item) => (
        <DropdownMenuItem
          key={item.id}
          icon={ITEM_ICONS[item.id]}
          destructive={item.destructive}
          onSelect={item.onSelect}
        >
          {item.label}
        </DropdownMenuItem>
      ))}
    </>
  );
}

export interface UseTrackMenuOptions {
  /** Playlist the tracks are listed in. Adds "Remove from this playlist" when it is a saved playlist. */
  playlistId?: string;
  onRemovedFromPlaylist?: (track: Track) => void;
}

/** Returns a function that renders the actions menu items for a track. */
export function useTrackMenu({ playlistId, onRemovedFromPlaylist }: UseTrackMenuOptions = {}) {
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const playNext = usePlayerStore((s) => s.playNext);
  const openAddToPlaylist = useTrackActionsStore((s) => s.openAddToPlaylist);
  const likedVideoIds = useLibraryStore((s) => s.likedVideoIds);
  const toggleLike = useLibraryStore((s) => s.toggleLike);
  const removeTrackFromPlaylist = useLibraryStore((s) => s.removeTrackFromPlaylist);

  return useCallback(
    (track: Track) => {
      const actions: TrackMenuActions = {
        playNext,
        addToQueue,
        addToPlaylist: openAddToPlaylist,
        toggleLike: (t) => void toggleLike(t),
        removeFromPlaylist: playlistId
          ? async (t) => {
              const removed = await removeTrackFromPlaylist(playlistId, t.videoId || t.id);
              if (removed) onRemovedFromPlaylist?.(t);
            }
          : undefined,
      };
      const isLiked = likedVideoIds.has(track.videoId || track.id);
      return <TrackMenuItems items={buildTrackMenuItems(track, isLiked, actions)} />;
    },
    [
      playNext,
      addToQueue,
      openAddToPlaylist,
      toggleLike,
      removeTrackFromPlaylist,
      likedVideoIds,
      playlistId,
      onRemovedFromPlaylist,
    ]
  );
}
