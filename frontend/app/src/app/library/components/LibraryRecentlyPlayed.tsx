'use client';

import React, { useMemo } from 'react';
import { History } from 'lucide-react';
import { Box, Heading, Stack, TrackRow, EmptyState } from '@mp/dying';
import { type Track } from '@mp/player-core';
import { usePlayerStore, toTrackData } from '@/stores/playerStore';
import { toRecentlyPlayed } from '@/stores/library/recentlyPlayed';
import { type PlayHistoryItem } from '@/stores/libraryStore';

export interface LibraryRecentlyPlayedProps {
  history: PlayHistoryItem[];
}

export const LibraryRecentlyPlayed: React.FC<LibraryRecentlyPlayedProps> = ({ history }) => {
  const { currentTrack, playbackState, playTrack, setQueue, togglePlay } = usePlayerStore();
  const tracks = useMemo(() => toRecentlyPlayed(history), [history]);
  const isPlaying = playbackState === 'playing';

  const isCurrent = (track: Track) =>
    currentTrack?.videoId === track.videoId || currentTrack?.id === track.id;

  const handleSelect = (track: Track, index: number) => {
    if (isCurrent(track)) {
      togglePlay();
      return;
    }
    setQueue(tracks, index, false);
    playTrack(track);
  };

  return (
    <Box className="mb-12">
      <Heading level={2} className="text-xl sm:text-2xl font-bold text-text-primary mb-4">
        Recently Played
      </Heading>

      {tracks.length === 0 ? (
        <EmptyState
          icon={<History size={32} />}
          title="Nothing Played Yet"
          description="Songs you listen to for at least 30 seconds show up here."
        />
      ) : (
        <Stack gap="1">
          {tracks.map((track, idx) => {
            const active = isCurrent(track);
            return (
              <TrackRow
                key={track.videoId}
                index={idx}
                track={toTrackData(track)}
                isActive={active}
                isPlaying={active && isPlaying}
                onSelect={() => handleSelect(track, idx)}
                onPlay={() => handleSelect(track, idx)}
                onPause={() => togglePlay()}
              />
            );
          })}
        </Stack>
      )}
    </Box>
  );
};
