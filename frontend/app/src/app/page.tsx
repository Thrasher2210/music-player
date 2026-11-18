'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  AmbientAura,
  Flex,
  Box,
  Text,
  Heading,
  Button,
  Grid,
  Stack,
  Skeleton,
  QuickPicksGrid,
  QuickPicksColumn,
  QuickPickRow,
  MediaShelf,
  MediaCard,
  MoodChipBar,
  type MoodChipData,
  type TrackData,
} from '@mp/dying';
import { usePlayerStore, type Track } from '../stores/playerStore';
import { useLibraryStore } from '../stores/libraryStore';
import { type MediaShelfData } from '@mp/player-core';

export default function HomePage() {
  const router = useRouter();

  const {
    currentTrack,
    playbackState,
    playTrack,
    pause,
    setQueue,
    addToQueue,
    getHomeFeed,
    getNextRadio,
  } = usePlayerStore();

  const { isLiked } = useLibraryStore();

  const [moodChips, setMoodChips] = useState<MoodChipData[]>([]);
  const [activeMoodChipId, setActiveMoodChipId] = useState<string | null>(null);
  const [quickPicks, setQuickPicks] = useState<Track[]>([]);
  const [shelves, setShelves] = useState<MediaShelfData[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);

  // Load real YouTube Music live feed
  useEffect(() => {
    let isMounted = true;
    setIsLoadingFeed(true);

    getHomeFeed()
      .then((feed) => {
        if (!isMounted) return;
        if (feed.chips && feed.chips.length > 0) {
          setMoodChips(feed.chips);
        }
        setQuickPicks(feed.quickPicks || []);
        setShelves(feed.shelves || []);
      })
      .catch((err) => {
        console.error('Failed to load YouTube Music home feed:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingFeed(false);
      });

    return () => {
      isMounted = false;
    };
  }, [getHomeFeed]);

  const handleSelectMoodChip = async (chipId: string) => {
    const nextActive = activeMoodChipId === chipId ? null : chipId;
    setActiveMoodChipId(nextActive);
    setIsLoadingFeed(true);

    try {
      const feed = await getHomeFeed(nextActive || undefined);
      setQuickPicks(feed.quickPicks || []);
      setShelves(feed.shelves || []);
    } catch (err) {
      console.error('Failed to load mood feed:', err);
    } finally {
      setIsLoadingFeed(false);
    }
  };

  const handlePlayTrackWithRadio = async (track: Track) => {
    try {
      await playTrack(track);
      if (track.videoId) {
        const nextRadio = await getNextRadio(track.videoId);
        if (nextRadio && nextRadio.queue && nextRadio.queue.length > 0) {
          const radioQueue = [track, ...nextRadio.queue.filter((t) => t.videoId !== track.videoId)];
          setQueue(radioQueue, 0, false);
        }
      }
    } catch (err) {
      console.error('Playback error:', err);
    }
  };

  const getTrackDataWithLiked = useCallback(
    (t: Track): TrackData => ({
      id: t.id || t.videoId,
      title: t.title,
      artist: t.artist,
      artistId: t.artistId,
      album: t.album,
      albumId: t.albumId,
      duration: t.duration,
      thumbnailUrl: t.thumbnail,
      isLiked: isLiked(t.videoId || t.id),
    }),
    [isLiked]
  );

  // Split quickPicks into 4 columns of up to 4 tracks each
  const quickPickClusters = useMemo(() => {
    const clusters: Track[][] = [];
    const clusterSize = 4;
    for (let i = 0; i < quickPicks.length && clusters.length < 4; i += clusterSize) {
      clusters.push(quickPicks.slice(i, i + clusterSize));
    }
    return clusters;
  }, [quickPicks]);

  const isCurrentlyPlaying = playbackState === 'playing';

  return (
    <Box className="relative">
      <AmbientAura
        intensity={0.2}
        animated={isCurrentlyPlaying}
      />

      <Box className="relative z-10 p-6 md:p-8 max-w-7xl mx-auto space-y-10">
        {/* Mood Chips Strip */}
        {moodChips.length > 0 && (
          <Box className="select-none">
            <MoodChipBar
              chips={moodChips}
              activeId={activeMoodChipId}
              onSelectChip={(chip) => handleSelectMoodChip(chip.id)}
              showScrollButtons
            />
          </Box>
        )}

        {/* Loading Skeletons */}
        {isLoadingFeed && quickPicks.length === 0 && shelves.length === 0 && (
          <Stack gap="8">
            <Stack gap="3">
              <Skeleton className="h-6 w-48" />
              <Grid cols={4} gap="4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </Grid>
            </Stack>
            <Stack gap="3">
              <Skeleton className="h-6 w-36" />
              <Flex gap="4" className="overflow-hidden">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-44 w-44 rounded-2xl shrink-0" />
                ))}
              </Flex>
            </Stack>
          </Stack>
        )}

        {/* Quick Picks */}
        {quickPicks.length > 0 && (
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
                variant="ghost"
                size="sm"
                className="text-xs font-semibold rounded-full"
                onClick={() => {
                  if (quickPicks[0]) {
                    handlePlayTrackWithRadio(quickPicks[0]);
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
                        onPlay={() => handlePlayTrackWithRadio(track)}
                        onPause={pause}
                        onSelect={() => handlePlayTrackWithRadio(track)}
                        onQueue={() => addToQueue(track)}
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
        )}

        {/* Dynamic Shelves */}
        {shelves.map((shelf) => {
          if (!shelf.items || shelf.items.length === 0) return null;
          return (
            <Box key={shelf.id} className="space-y-4">
              <MediaShelf title={shelf.title}>
                {shelf.items.map((item: any) => (
                  <MediaCard
                    key={item.id}
                    title={item.title}
                    subtitle={item.subtitle}
                    imageUrl={item.thumbnail || item.imageUrl}
                    aspect="square"
                    onPlay={() => {
                      if (item.videoId) {
                        const trackItem: Track = {
                          id: item.videoId,
                          videoId: item.videoId,
                          title: item.title,
                          artist: item.subtitle || '',
                          duration: 0,
                          thumbnail: item.thumbnail || (item as any).imageUrl,
                        };
                        handlePlayTrackWithRadio(trackItem);
                      } else if (item.browseId) {
                        if (item.browseId.startsWith('UC')) {
                          router.push(`/artist/${item.browseId}`);
                        } else if (item.browseId.startsWith('MPREb_')) {
                          router.push(`/album/${item.browseId}`);
                        } else if (item.browseId.startsWith('VL') || item.browseId.startsWith('PL') || item.browseId.startsWith('RD')) {
                          router.push(`/playlist/${item.browseId}`);
                        }
                      }
                    }}
                    onClick={() => {
                      if (item.browseId) {
                        if (item.browseId.startsWith('UC')) {
                          router.push(`/artist/${item.browseId}`);
                        } else if (item.browseId.startsWith('MPREb_')) {
                          router.push(`/album/${item.browseId}`);
                        } else if (item.browseId.startsWith('VL') || item.browseId.startsWith('PL') || item.browseId.startsWith('RD')) {
                          router.push(`/playlist/${item.browseId}`);
                        }
                      } else if (item.videoId) {
                        const trackItem: Track = {
                          id: item.videoId,
                          videoId: item.videoId,
                          title: item.title,
                          artist: item.subtitle || '',
                          duration: 0,
                          thumbnail: item.thumbnail || (item as any).imageUrl,
                        };
                        handlePlayTrackWithRadio(trackItem);
                      }
                    }}
                  />
                ))}
              </MediaShelf>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
