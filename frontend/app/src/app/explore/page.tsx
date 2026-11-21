'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Box,
  Heading,
  PageHeader,
  MoodChipBar,
  QuickPicksGrid,
  QuickPickRow,
  MediaShelf,
  MediaCard,
  Skeleton,
  Stack,
} from '@mp/dying';
import { usePlayerStore, toTrackData } from '@/stores/playerStore';
import { useYouTubeAuthStore } from '@/stores/youtubeAuthStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useTrackMenu } from '@/components/track-menu/useTrackMenu';
import { type HomeFeedData, type Track } from '@mp/player-core';

export default function ExplorePage() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [feed, setFeed] = useState<HomeFeedData | null>(null);
  const [activeChipId, setActiveChipId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  const {
    getHomeFeed,
    getExploreFeed,
    currentTrack,
    playbackState,
    playTrack,
    setQueue,
    togglePlay,
    networkAdapterType,
  } = usePlayerStore();

  const isYouTubeAuthenticated = useYouTubeAuthStore((s) => s.isYouTubeAuthenticated);
  const isLiked = useLibraryStore((s) => s.isLiked);
  const renderTrackMenu = useTrackMenu();
  const isPlaying = playbackState === 'playing';

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    getExploreFeed()
      .then((data) => {
        if (isMounted) {
          setFeed(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load explore feed:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [getExploreFeed, isYouTubeAuthenticated, networkAdapterType]);

  const handleChipSelect = async (chipId: string) => {
    setActiveChipId(chipId);
    const chip = feed?.chips.find((c) => c.id === chipId);
    if (!chip) return;

    setIsLoading(true);
    try {
      const updatedFeed = await getHomeFeed(chip.params);
      setFeed(updatedFeed);
    } catch (err) {
      console.error('Failed to filter explore feed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrackSelect = (track: Track, index: number) => {
    if (!feed) return;
    const isCurrent = currentTrack && (currentTrack.videoId === track.videoId || currentTrack.id === track.id);
    if (isCurrent) {
      togglePlay();
      return;
    }
    setQueue(feed.quickPicks, index);
    playTrack(track);
  };

  return (
    <Container size="xl" className="py-6 px-4 sm:px-6 pb-24">
      <PageHeader
        title="Explore"
        kicker="Discover New Music"
      />

      {/* Mood & Genre Chips */}
      {feed && feed.chips.length > 0 && (
        <Box className="mb-8">
          <MoodChipBar
            chips={feed.chips.map((c) => ({
              id: c.id,
              label: c.title,
            }))}
            activeId={activeChipId}
            onSelectChip={(chip) => handleChipSelect(chip.id)}
          />
        </Box>
      )}

      {isLoading ? (
        <Stack gap="6">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </Stack>
      ) : (
        <>
          {/* Quick Picks / Trending Grid */}
          {feed && feed.quickPicks.length > 0 && (
            <Box className="mb-12">
              <Heading level={2} className="text-xl sm:text-2xl font-bold text-text-primary mb-4">
                Trending & Recommended
              </Heading>
              <QuickPicksGrid columns={4}>
                {feed.quickPicks.slice(0, 16).map((track, idx) => {
                  const isTrackActive =
                    currentTrack?.videoId === track.videoId || currentTrack?.id === track.id;

                  return (
                    <QuickPickRow
                      key={track.videoId || track.id || idx}
                      track={toTrackData(track, isLiked(track.videoId || track.id))}
                      isActive={isTrackActive}
                      isPlaying={isTrackActive && isPlaying}
                      actions={renderTrackMenu(track)}
                      onSelect={() => handleTrackSelect(track, idx)}
                      onPlay={() => {
                        if (isTrackActive) {
                          togglePlay();
                        } else {
                          handleTrackSelect(track, idx);
                        }
                      }}
                      onPause={() => togglePlay()}
                      onArtistClick={(_artist, artistId) => {
                        if (artistId) {
                          startTransition(() => router.push(`/artist/${artistId}`));
                        }
                      }}
                      onAlbumClick={(_album, albumId) => {
                        if (albumId) {
                          startTransition(() => router.push(`/album/${albumId}`));
                        }
                      }}
                    />
                  );
                })}
              </QuickPicksGrid>
            </Box>
          )}

          {/* Shelves */}
          {feed &&
            feed.shelves.map((shelf) => (
              <Box key={shelf.id} className="mb-12">
                <MediaShelf title={shelf.title}>
                  {shelf.items.map((item) => (
                    <MediaCard
                      key={item.id}
                      title={item.title}
                      subtitle={item.subtitle}
                      imageUrl={item.thumbnail}
                      onClick={() => {
                        const targetId = item.browseId || item.id;
                        if (item.type === 'artist') {
                          startTransition(() => router.push(`/artist/${targetId}`));
                        } else if (item.type === 'album') {
                          startTransition(() => router.push(`/album/${targetId}`));
                        } else if (item.type === 'playlist') {
                          startTransition(() => router.push(`/playlist/${targetId}`));
                        } else if (item.videoId) {
                          playTrack({
                            id: item.videoId,
                            videoId: item.videoId,
                            title: item.title,
                            artist: item.subtitle,
                            duration: 0,
                            thumbnail: item.thumbnail,
                          });
                        }
                      }}
                    />
                  ))}
                </MediaShelf>
              </Box>
            ))}
        </>
      )}
    </Container>
  );
}
