'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Play } from 'lucide-react';
import {
  Flex,
  Text,
  Heading,
  Button,
  Stack,
  QuickPicksGrid,
  QuickPicksColumn,
  QuickPickRow,
  type TrackData,
} from '@mp/dying';
import { type Track } from '../../stores/playerStore';
import { useTrackMenu } from '../track-menu/useTrackMenu';

export interface HomeQuickPicksProps {
  quickPicks: Track[];
  currentTrack: Track | null;
  isCurrentlyPlaying: boolean;
  getTrackDataWithLiked: (track: Track) => TrackData;
  onPlayTrack: (track: Track) => void;
  onPause: () => void;
  onAddToQueue: (track: Track) => void;
}

export function HomeQuickPicks({
  quickPicks,
  currentTrack,
  isCurrentlyPlaying,
  getTrackDataWithLiked,
  onPlayTrack,
  onPause,
  onAddToQueue,
}: HomeQuickPicksProps) {
  const router = useRouter();
  const renderTrackMenu = useTrackMenu();

  // Split quickPicks into 4 columns of up to 4 tracks each
  const quickPickClusters = useMemo(() => {
    const clusters: Track[][] = [];
    const clusterSize = 4;
    for (let i = 0; i < quickPicks.length && clusters.length < 4; i += clusterSize) {
      clusters.push(quickPicks.slice(i, i + clusterSize));
    }
    return clusters;
  }, [quickPicks]);

  if (quickPicks.length === 0) return null;

  return (
    <Stack gap="4">
      <Flex justify="between" align="end">
        <Stack gap="1">
          <Text variant="kicker" size="xs">
            START RADIO FROM A SONG
          </Text>
          <Heading level={2} size="h2" className="tracking-tight">
            Quick picks
          </Heading>
        </Stack>

        <Button
          variant="secondary"
          size="sm"
          className="rounded-full text-xs font-semibold px-4 hover:scale-105 active:scale-95 transition-all shadow-sm"
          leftIcon={<Play size={12} className="fill-current" />}
          onClick={() => {
            if (quickPicks[0]) {
              onPlayTrack(quickPicks[0]);
            }
          }}
        >
          Play all
        </Button>
      </Flex>

      <QuickPicksGrid columns={4}>
        {quickPickClusters.map((cluster, colIdx) => (
          <QuickPicksColumn key={colIdx}>
            {cluster.map((track) => {
              const trackKey = track.id || track.videoId;
              const isActive = (currentTrack?.id || currentTrack?.videoId) === trackKey;
              return (
                <QuickPickRow
                  key={trackKey}
                  track={getTrackDataWithLiked(track)}
                  isActive={isActive}
                  isPlaying={isActive && isCurrentlyPlaying}
                  onPlay={() => onPlayTrack(track)}
                  onPause={onPause}
                  onSelect={() => onPlayTrack(track)}
                  onQueue={() => onAddToQueue(track)}
                  actions={renderTrackMenu(track)}
                  onArtistClick={(_artist, artistId) => {
                    if (artistId) {
                      router.push(`/artist/${artistId}`);
                    }
                  }}
                  onAlbumClick={(_album, albumId) => {
                    if (albumId) {
                      router.push(`/album/${albumId}`);
                    }
                  }}
                />
              );
            })}
          </QuickPicksColumn>
        ))}
      </QuickPicksGrid>
    </Stack>
  );
}
