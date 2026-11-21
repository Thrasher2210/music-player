import type { Track } from '@mp/player-core';

export type TrackMenuItemId =
  | 'play-next'
  | 'add-to-queue'
  | 'add-to-playlist'
  | 'toggle-like'
  | 'remove-from-playlist';

export interface TrackMenuItem {
  id: TrackMenuItemId;
  label: string;
  onSelect: () => void;
  destructive?: boolean;
}

export interface TrackMenuActions {
  playNext: (track: Track) => void;
  addToQueue: (track: Track) => void;
  addToPlaylist: (track: Track) => void;
  toggleLike: (track: Track) => void;
  /** Only set where the track belongs to a playlist the user can edit. */
  removeFromPlaylist?: (track: Track) => void;
}

export function buildTrackMenuItems(
  track: Track,
  isLiked: boolean,
  actions: TrackMenuActions
): TrackMenuItem[] {
  const items: TrackMenuItem[] = [
    { id: 'play-next', label: 'Play next', onSelect: () => actions.playNext(track) },
    { id: 'add-to-queue', label: 'Add to queue', onSelect: () => actions.addToQueue(track) },
    {
      id: 'add-to-playlist',
      label: 'Add to playlist',
      onSelect: () => actions.addToPlaylist(track),
    },
    {
      id: 'toggle-like',
      label: isLiked ? 'Unlike' : 'Like',
      onSelect: () => actions.toggleLike(track),
    },
  ];

  const { removeFromPlaylist } = actions;
  if (removeFromPlaylist) {
    items.push({
      id: 'remove-from-playlist',
      label: 'Remove from this playlist',
      destructive: true,
      onSelect: () => removeFromPlaylist(track),
    });
  }

  return items;
}
