'use client';

import React, { useEffect, useState, useTransition, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Home as HomeIcon,
  Compass,
  Library,
  Plus,
  Heart,
  Cast,
  Sparkles,
  Play,
  X,
  LogIn,
} from 'lucide-react';
import {
  AppShell,
  Sidebar,
  SidebarBrand,
  SidebarNav,
  SidebarNavItem,
  SidebarFooter,
  MediaShelf,
  MediaCard,
  TrackTable,
  FloatingPlayerPill,
  MoodChipBar,
  MoodChipData,
  QuickPicksGrid,
  QuickPicksColumn,
  QuickPickRow,
  FullPlayerView,
  FullPlayerTab,
  RelatedItem,
  Flex,
  Box,
  Stack,
  Grid,
  Text,
  Heading,
  Separator,
  Button,
  IconButton,
  ThemeSwitcher,
  Badge,
  Tooltip,
  Input,
  Avatar,
  Skeleton,
} from '@mp/dying';
import { usePlayerStore, toTrackData } from '../stores/playerStore';
import { useAuthStore } from '../stores/authStore';
import { AccountModal } from '../components/AccountModal';
import {
  type Track,
  type MediaShelfData,
} from '@mp/player-core';

interface PlaylistNav {
  id: string;
  name: string;
  subtitle: string;
  pinned?: boolean;
}

const USER_PLAYLISTS: PlaylistNav[] = [
  { id: 'liked', name: 'Liked music', subtitle: 'Auto playlist', pinned: true },
  { id: 'pl-1', name: 'Top Mixes', subtitle: 'Curated for you' },
  { id: 'pl-2', name: 'Chill Drive', subtitle: 'Relaxed grooves' },
  { id: 'pl-3', name: 'Focus Flow', subtitle: 'Deep work beats' },
];

export default function HomePage() {
  const {
    initialize,
    playbackState,
    currentTrack,
    currentTime,
    duration,
    volume,
    isMuted,
    repeatMode,
    isShuffle,
    bufferedPercent,
    queue,
    lyrics,
    isLyricsLoading,
    playTrack,
    togglePlay,
    pause,
    seek,
    next,
    previous,
    setVolume,
    toggleMute,
    toggleRepeat,
    toggleShuffle,
    addToQueue,
    removeFromQueue,
    search,
    getHomeFeed,
    getNextRadio,
  } = usePlayerStore();

  // Search & Navigation State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeNav, setActiveNav] = useState<'home' | 'explore' | 'library' | 'liked'>('home');

  // Live YouTube Music Feed State
  const [moodChips, setMoodChips] = useState<MoodChipData[]>([]);
  const [activeMoodChipId, setActiveMoodChipId] = useState<string | null>(null);
  const [quickPicks, setQuickPicks] = useState<Track[]>([]);
  const [shelves, setShelves] = useState<MediaShelfData[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);

  // Full-Screen Player Modal & Related Items State
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [fullPlayerTab, setFullPlayerTab] = useState<FullPlayerTab>('upNext');
  const [relatedItems, setRelatedItems] = useState<RelatedItem[]>([]);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const [, startTransition] = useTransition();

  // Initialize audio engine and load initial real YouTube Music live feed
  useEffect(() => {
    initialize();

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
  }, [initialize, getHomeFeed]);

  // Play track immediately and concurrently seed infinite Up Next queue with live radio
  const handlePlayTrackWithRadio = useCallback(
    (track: Track) => {
      playTrack(track);
      const vid = track.videoId || track.id;
      if (vid) {
        getNextRadio(vid)
          .then((radio) => {
            if (radio.related && radio.related.length > 0) {
              setRelatedItems(radio.related);
            }
          })
          .catch((err) => {
            console.error('Failed to seed next radio:', err);
          });
      }
    },
    [playTrack, getNextRadio]
  );

  // Mood Chip Selection: dynamically swap live feed
  const handleSelectMoodChip = useCallback(
    async (chip: MoodChipData) => {
      setIsLoadingFeed(true);
      try {
        if (activeMoodChipId === chip.id) {
          setActiveMoodChipId(null);
          const feed = await getHomeFeed();
          if (feed.chips && feed.chips.length > 0) setMoodChips(feed.chips);
          setQuickPicks(feed.quickPicks || []);
          setShelves(feed.shelves || []);
        } else {
          setActiveMoodChipId(chip.id);
          const feed = await getHomeFeed(chip.params);
          if (feed.chips && feed.chips.length > 0) setMoodChips(feed.chips);
          setQuickPicks(feed.quickPicks || []);
          setShelves(feed.shelves || []);
        }
      } catch (err) {
        console.error('Failed to swap mood feed:', err);
      } finally {
        setIsLoadingFeed(false);
      }
    },
    [activeMoodChipId, getHomeFeed]
  );

  // Search handling
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      if (value.trim()) {
        setIsSearching(true);
        const timer = setTimeout(async () => {
          try {
            const results = await search(value.trim());
            startTransition(() => {
              setSearchResults(results);
              setIsSearching(false);
            });
          } catch {
            setIsSearching(false);
          }
        }, 350);
        return () => clearTimeout(timer);
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    },
    [search]
  );

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
  }, []);

  const isSearchActive = searchQuery.trim().length > 0;
  const isCurrentlyPlaying = playbackState === 'playing';

  // Group quick picks into 4-song clusters for YouTube Music desktop grid
  const quickPickClusters = useMemo(() => {
    const clusters: Track[][] = [];
    for (let i = 0; i < quickPicks.length; i += 4) {
      clusters.push(quickPicks.slice(i, i + 4));
    }
    return clusters;
  }, [quickPicks]);

  return (
    <AppShell
      sidebar={
        <Sidebar className="w-60 bg-sidebar border-r border-border-subtle flex flex-col justify-between">
          <Flex direction="col" className="h-full overflow-hidden">
            {/* Top Brand Logo */}
            <SidebarBrand
              logo={
                <Flex
                  align="center"
                  justify="center"
                  className="h-7 w-7 rounded-full bg-red-600 text-white shadow-md"
                >
                  <Play size={14} className="fill-current ml-0.5" />
                </Flex>
              }
              title="Music"
              subtitle="GaneGan Engine"
            />

            {/* Primary Navigation Drawer */}
            <SidebarNav>
              <SidebarNavItem
                icon={<HomeIcon className="h-4 w-4" />}
                label="Home"
                active={activeNav === 'home' && !isSearchActive && !isFullPlayerOpen}
                onClick={() => {
                  setActiveNav('home');
                  setIsFullPlayerOpen(false);
                  handleClearSearch();
                }}
              />
              <SidebarNavItem
                icon={<Compass className="h-4 w-4" />}
                label="Explore"
                active={activeNav === 'explore'}
                onClick={() => {
                  setActiveNav('explore');
                  setIsFullPlayerOpen(false);
                  handleSearchChange('Trending Top Hits');
                }}
              />
              <SidebarNavItem
                icon={<Library className="h-4 w-4" />}
                label="Library"
                active={activeNav === 'library'}
                onClick={() => {
                  setActiveNav('library');
                  setIsFullPlayerOpen(false);
                }}
              />
            </SidebarNav>

            <Box className="px-3 py-2">
              <Separator />
            </Box>

            {/* New playlist button */}
            <Box className="px-3 py-1">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Plus size={16} />}
                className="w-full justify-start text-xs font-semibold text-text-primary hover:bg-surface-active rounded-full"
                onClick={() => handleSearchChange('Discover Weekly')}
              >
                New playlist
              </Button>
            </Box>

            {/* User Playlists Scrollable Rail */}
            <Box className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
              {USER_PLAYLISTS.map((pl) => (
                <Button
                  key={pl.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setActiveNav('liked');
                    handleSearchChange(pl.name);
                  }}
                  className={`w-full justify-start flex-col items-start px-3 py-2 h-auto text-left rounded-lg transition-colors group ${
                    activeNav === 'liked' && searchQuery === pl.name
                      ? 'bg-surface-active text-text-primary'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Flex justify="between" align="center" className="w-full">
                    <Text size="xs" weight="medium" className="truncate flex-1">
                      {pl.name}
                    </Text>
                    {pl.pinned && (
                      <Heart
                        size={12}
                        className="text-emerald-400 fill-emerald-400 shrink-0 ml-1.5"
                      />
                    )}
                  </Flex>
                  <Text size="xs" className="text-text-tertiary truncate">
                    {pl.subtitle}
                  </Text>
                </Button>
              ))}
            </Box>
          </Flex>

          <SidebarFooter>
            <SidebarNavItem
              icon={<Sparkles className="h-4 w-4 text-emerald-400" />}
              label="Dying 2.0 Design System"
              href="/dying"
            />
          </SidebarFooter>
        </Sidebar>
      }
      header={
        <Flex
          justify="between"
          align="center"
          className="h-16 px-4 md:px-8 gap-4 select-none"
        >
          {/* Centered Large Search Pill */}
          <Box className="flex-1 max-w-2xl mx-auto">
            <Input
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search songs, albums, artists, podcasts"
              leftIcon={<Search className="h-4 w-4 text-text-tertiary" />}
              rightIcon={
                searchQuery ? (
                  <IconButton
                    aria-label="Clear search"
                    variant="ghost"
                    size="xs"
                    shape="circle"
                    icon={<X size={14} />}
                    onClick={handleClearSearch}
                  />
                ) : (
                  <Badge variant="glass" size="sm">
                    ⌘K
                  </Badge>
                )
              }
              className="rounded-full bg-surface/80 border-border-subtle focus:bg-surface text-sm"
            />
          </Box>

          {/* Right Action Icons: Cast, Theme, User Avatar */}
          <Flex gap="2" align="center" className="shrink-0">
            <Tooltip content="Cast / AirPlay">
              <IconButton
                aria-label="Cast audio"
                variant="ghost"
                size="md"
                shape="circle"
                icon={<Cast size={18} />}
                onClick={() => alert('AirPlay / Cast device selector')}
              />
            </Tooltip>

            <Tooltip content="Appearance (System / Light / Dark)">
              <ThemeSwitcher size="sm" />
            </Tooltip>

            {hasMounted && isAuthenticated ? (
              <Tooltip content={`Account: ${user?.name || 'User'}`}>
                <Avatar
                  fallback={(user?.name || 'U')[0].toUpperCase()}
                  size="sm"
                  aria-label={`User Account: ${user?.name || 'User'}`}
                  onClick={() => setIsAccountModalOpen(true)}
                  className="cursor-pointer select-none"
                />
              </Tooltip>
            ) : (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<LogIn size={14} />}
                onClick={() => router.push('/login')}
              >
                Sign In
              </Button>
            )}
          </Flex>
        </Flex>
      }
      playerDockVariant="floating"
      isFullBleed={isFullPlayerOpen}
      playerDock={
        <FloatingPlayerPill
          title={currentTrack?.title || 'Not Playing'}
          artist={currentTrack?.artist || 'Select a song or explore quick picks'}
          album={currentTrack?.album}
          artworkUrl={currentTrack?.thumbnail}
          isPlaying={isCurrentlyPlaying}
          currentTime={currentTime}
          duration={duration}
          buffered={bufferedPercent}
          volume={volume}
          isMuted={isMuted}
          isLyricsOpen={isFullPlayerOpen && fullPlayerTab === 'lyrics'}
          isExpanded={isFullPlayerOpen}
          isShuffle={isShuffle}
          repeatMode={repeatMode}
          onPlayPause={togglePlay}
          onPrevious={previous}
          onNext={next}
          onSeek={seek}
          onVolumeChange={setVolume}
          onToggleMute={toggleMute}
          onToggleLyrics={() => {
            if (isFullPlayerOpen && fullPlayerTab === 'lyrics') {
              setIsFullPlayerOpen(false);
            } else {
              setFullPlayerTab('lyrics');
              setIsFullPlayerOpen(true);
            }
          }}
          onToggleExpand={() => setIsFullPlayerOpen(!isFullPlayerOpen)}
          onExpandNowPlaying={() => setIsFullPlayerOpen(!isFullPlayerOpen)}
          onToggleShuffle={toggleShuffle}
          onToggleRepeat={toggleRepeat}
        />
      }
      overlay={null}
    >
      {isFullPlayerOpen ? (
        <FullPlayerView
          track={currentTrack ? toTrackData(currentTrack) : null}
          isPlaying={isCurrentlyPlaying}
          currentTime={currentTime}
          duration={duration}
          onPlayPause={togglePlay}
          onSeek={seek}
          onClose={() => setIsFullPlayerOpen(false)}
          activeTab={fullPlayerTab}
          onTabChange={setFullPlayerTab}
          queue={queue.map(toTrackData)}
          lyrics={lyrics || undefined}
          isLyricsLoading={isLyricsLoading}
          onSelectTrack={(t) => {
            const matched = queue.find((x) => (x.id || x.videoId) === t.id);
            if (matched) {
              handlePlayTrackWithRadio(matched);
            }
          }}
          onRemoveFromQueue={(trackId) => {
            const idx = queue.findIndex((x) => (x.id || x.videoId) === trackId);
            if (idx !== -1) {
              removeFromQueue(idx);
            }
          }}
          related={relatedItems}
          onSelectRelated={(item) => {
            if (item.videoId) {
              const trackItem: Track = {
                id: item.videoId,
                videoId: item.videoId,
                title: item.title,
                artist: item.subtitle || '',
                duration: 0,
                thumbnail: item.thumbnail || item.thumbnailUrl || '',
              };
              handlePlayTrackWithRadio(trackItem);
            }
          }}
          radioTitle={currentTrack ? `${currentTrack.title} radio` : undefined}
          asModal={false}
        />
      ) : (
        <>
          {/* 1. REAL LIVE INNER_TUBE MOOD & ACTIVITY CHIPS STRIP */}
          {moodChips.length > 0 && (
            <Box className="mb-8 select-none">
              <MoodChipBar
                chips={moodChips}
                activeId={activeMoodChipId}
                onSelectChip={handleSelectMoodChip}
                showScrollButtons
              />
            </Box>
          )}

      {/* 2. DYNAMIC CONTENT: SEARCH RESULTS OR YOUTUBE MUSIC LIVE HOME FEED */}
      {isSearchActive ? (
        <Stack gap="6">
          <Flex justify="between" align="center">
            <Stack gap="1">
              <Text variant="kicker" size="xs">
                YouTube Music Engine
              </Text>
              <Heading level={1} size="h1">
                {searchQuery.trim() ? `Results for "${searchQuery}"` : 'Search'}
              </Heading>
            </Stack>
            {isSearching && (
              <Badge variant="accent">Searching InnerTube...</Badge>
            )}
          </Flex>

          <TrackTable
            tracks={searchResults.map(toTrackData)}
            currentTrackId={currentTrack?.id || currentTrack?.videoId}
            isPlaying={isCurrentlyPlaying}
            onTrackSelect={(t) => {
              const matched = searchResults.find((x) => (x.id || x.videoId) === t.id);
              if (matched) handlePlayTrackWithRadio(matched);
            }}
            onTrackPlay={(t) => {
              const matched = searchResults.find((x) => (x.id || x.videoId) === t.id);
              if (matched) handlePlayTrackWithRadio(matched);
            }}
            onTrackPause={pause}
            emptyMessage={
              isSearching
                ? 'Searching YouTube Music audio streams...'
                : 'No tracks found. Try searching for an artist, track title, or genre.'
            }
          />
        </Stack>
      ) : (
        <Stack gap="12">
          {/* Feed Loading Skeleton */}
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

          {/* SECTION 1: REAL LIVE QUICK PICKS (4-Song Clusters) */}
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

                <Flex gap="2" align="center">
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
              </Flex>

              <QuickPicksGrid columns={4}>
                {quickPickClusters.map((cluster, colIdx) => (
                  <QuickPicksColumn key={colIdx}>
                    {cluster.map((track) => {
                      const trackKey = track.id || track.videoId;
                      const isActive =
                        (currentTrack?.id || currentTrack?.videoId) === trackKey;
                      return (
                        <QuickPickRow
                          key={trackKey}
                          track={toTrackData(track)}
                          isActive={isActive}
                          isPlaying={isActive && isCurrentlyPlaying}
                          onPlay={() => handlePlayTrackWithRadio(track)}
                          onPause={pause}
                          onSelect={() => handlePlayTrackWithRadio(track)}
                          onQueue={() => addToQueue(track)}
                        />
                      );
                    })}
                  </QuickPicksColumn>
                ))}
              </QuickPicksGrid>
            </Stack>
          )}

          {/* SECTION 2: DYNAMIC LIVE INNER_TUBE SHELVES */}
          {shelves.map((shelf) => {
            if (!shelf.items || shelf.items.length === 0) return null;
            return (
              <Box key={shelf.id} className="space-y-4">
                <MediaShelf title={shelf.title}>
                  {shelf.items.map((item) => (
                    <MediaCard
                      key={item.id}
                      title={item.title}
                      subtitle={item.subtitle}
                      imageUrl={item.thumbnail}
                      aspect={
                        shelf.title.toLowerCase().includes('video') ||
                        shelf.title.toLowerCase().includes('listen again')
                          ? 'video'
                          : 'square'
                      }
                      onPlay={() => {
                        if (item.videoId) {
                          handlePlayTrackWithRadio({
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
            );
          })}
        </Stack>
      )}
        </>
      )}

      {/* Dynamic Account & Profile Management Modal */}
      <AccountModal
        open={isAccountModalOpen}
        onOpenChange={setIsAccountModalOpen}
      />
    </AppShell>
  );
}
