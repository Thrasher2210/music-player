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
  X,
  LogIn,
  Play,
  Shuffle,
  Trash2,
  ListMusic,
} from 'lucide-react';
import {
  AppShell,
  BrandLogo,
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
  type TrackData,
} from '@mp/dying';
import { usePlayerStore, toTrackData } from '../stores/playerStore';
import { useAuthStore } from '../stores/authStore';
import { useLibraryStore } from '../stores/libraryStore';
import { AccountModal } from '../components/AccountModal';
import { CreatePlaylistDialog } from '../components/CreatePlaylistDialog';
import { AddToPlaylistModal } from '../components/AddToPlaylistModal';
import { useMediaSession } from '../hooks/useMediaSession';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import {
  type Track,
  type MediaShelfData,
} from '@mp/player-core';

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
    setShuffle,
    setQueue,
    addToQueue,
    removeFromQueue,
    search,
    getHomeFeed,
    getNextRadio,
  } = usePlayerStore();

  const {
    playlists,
    likedTracks,
    fetchLibrary,
    toggleLike,
    isLiked,
    deletePlaylist,
    fetchPlaylistTracks,
    recordPlayHistory,
  } = useLibraryStore();

  // Search & Navigation State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeNav, setActiveNav] = useState<'home' | 'explore' | 'library'>('home');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('liked');

  // Playlist view tracks state
  const [selectedPlaylistTracks, setSelectedPlaylistTracks] = useState<Track[]>([]);
  const [isLoadingPlaylistTracks, setIsLoadingPlaylistTracks] = useState(false);

  // Dialog & Modal State
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);
  const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState(false);
  const [trackToAddToPlaylist, setTrackToAddToPlaylist] = useState<Track | null>(null);

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

  const handleToggleLyrics = useCallback(() => {
    if (isFullPlayerOpen && fullPlayerTab === 'lyrics') {
      setIsFullPlayerOpen(false);
    } else {
      setFullPlayerTab('lyrics');
      setIsFullPlayerOpen(true);
    }
  }, [isFullPlayerOpen, fullPlayerTab]);

  const handleCloseModals = useCallback(() => {
    if (isAccountModalOpen) {
      setIsAccountModalOpen(false);
    } else if (isCreatePlaylistOpen) {
      setIsCreatePlaylistOpen(false);
    } else if (isAddToPlaylistOpen) {
      setIsAddToPlaylistOpen(false);
    } else if (isFullPlayerOpen) {
      setIsFullPlayerOpen(false);
    }
  }, [isAccountModalOpen, isCreatePlaylistOpen, isAddToPlaylistOpen, isFullPlayerOpen]);

  // Wire OS Media Session & Global Keyboard Shortcuts
  useMediaSession();
  useKeyboardShortcuts({
    toggleLyrics: handleToggleLyrics,
    closeModals: handleCloseModals,
  });

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Fetch user library on mount and when authentication changes
  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary, isAuthenticated]);

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

  // Fetch tracks for custom playlist when selected
  useEffect(() => {
    if (activeNav === 'library' && selectedPlaylistId && selectedPlaylistId !== 'liked') {
      let isMounted = true;
      setIsLoadingPlaylistTracks(true);
      fetchPlaylistTracks(selectedPlaylistId)
        .then((tracks) => {
          if (isMounted) {
            setSelectedPlaylistTracks(tracks);
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsLoadingPlaylistTracks(false);
          }
        });
      return () => {
        isMounted = false;
      };
    }
  }, [activeNav, selectedPlaylistId, fetchPlaylistTracks]);

  // Play track immediately, record history, and seed infinite radio
  const handlePlayTrackWithRadio = useCallback(
    (track: Track) => {
      playTrack(track);
      const vid = track.videoId || track.id;
      if (vid) {
        recordPlayHistory(vid, 0);
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
    [playTrack, getNextRadio, recordPlayHistory]
  );

  // Play all tracks in list
  const handlePlayAll = useCallback(
    (tracks: Track[]) => {
      if (!tracks.length) return;
      setQueue(tracks, 0);
      handlePlayTrackWithRadio(tracks[0]);
    },
    [setQueue, handlePlayTrackWithRadio]
  );

  // Shuffle all tracks in list
  const handleShuffleAll = useCallback(
    (tracks: Track[]) => {
      if (!tracks.length) return;
      const shuffled = [...tracks].sort(() => Math.random() - 0.5);
      setShuffle(true);
      setQueue(shuffled, 0);
      handlePlayTrackWithRadio(shuffled[0]);
    },
    [setShuffle, setQueue, handlePlayTrackWithRadio]
  );

  // Delete custom playlist
  const handleDeletePlaylist = useCallback(
    async (id: string) => {
      const ok = await deletePlaylist(id);
      if (ok) {
        setSelectedPlaylistId('liked');
      }
    },
    [deletePlaylist]
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

  // Helper to enrich core Track with live like status for dying TrackData
  const getTrackDataWithLiked = useCallback(
    (t: Track): TrackData => {
      const vid = t.videoId || t.id;
      return {
        ...toTrackData(t),
        isLiked: isLiked(vid),
      };
    },
    [isLiked]
  );

  // Group quick picks into 4-song clusters for YouTube Music desktop grid
  const quickPickClusters = useMemo(() => {
    const clusters: Track[][] = [];
    for (let i = 0; i < quickPicks.length; i += 4) {
      clusters.push(quickPicks.slice(i, i + 4));
    }
    return clusters;
  }, [quickPicks]);

  // Current active playlist object (if custom)
  const currentCustomPlaylist = useMemo(() => {
    if (selectedPlaylistId === 'liked') return null;
    return playlists.find((p) => p.id === selectedPlaylistId) || null;
  }, [playlists, selectedPlaylistId]);

  // Tracks for currently viewed playlist
  const currentLibraryTracks = useMemo(() => {
    if (selectedPlaylistId === 'liked') {
      return likedTracks;
    }
    return selectedPlaylistTracks;
  }, [selectedPlaylistId, likedTracks, selectedPlaylistTracks]);

  return (
    <AppShell
      sidebar={
        <Sidebar className="w-60 bg-sidebar border-r border-border-subtle flex flex-col justify-between">
          <Flex direction="col" className="h-full overflow-hidden">
            {/* Top Brand Logo */}
            <SidebarBrand
              logo={<BrandLogo variant="mark" size="sm" />}
              title={<BrandLogo variant="wordmark" size="sm" />}
              subtitle="Streaming"
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
                active={activeNav === 'library' && !isSearchActive && !isFullPlayerOpen}
                onClick={() => {
                  setActiveNav('library');
                  setIsFullPlayerOpen(false);
                  handleClearSearch();
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
                onClick={() => setIsCreatePlaylistOpen(true)}
              >
                New playlist
              </Button>
            </Box>

            {/* User Playlists Scrollable Rail */}
            <Box className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
              {/* Liked Music (Always pinned on top) */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedPlaylistId('liked');
                  setActiveNav('library');
                  setIsFullPlayerOpen(false);
                  handleClearSearch();
                }}
                className={`w-full justify-start flex-col items-start px-3 py-2 h-auto text-left rounded-lg transition-colors group ${
                  activeNav === 'library' && selectedPlaylistId === 'liked' && !isSearchActive
                    ? 'bg-surface-active text-text-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Flex justify="between" align="center" className="w-full">
                  <Text size="xs" weight="medium" className="truncate flex-1">
                    Liked music
                  </Text>
                  <Heart
                    size={12}
                    className="text-emerald-400 fill-emerald-400 shrink-0 ml-1.5"
                  />
                </Flex>
                <Text size="xs" className="text-text-tertiary truncate">
                  {likedTracks.length} {likedTracks.length === 1 ? 'song' : 'songs'} • Auto playlist
                </Text>
              </Button>

              {/* Dynamic User Playlists from Backend */}
              {playlists.map((pl) => (
                <Button
                  key={pl.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedPlaylistId(pl.id);
                    setActiveNav('library');
                    setIsFullPlayerOpen(false);
                    handleClearSearch();
                  }}
                  className={`w-full justify-start flex-col items-start px-3 py-2 h-auto text-left rounded-lg transition-colors group ${
                    activeNav === 'library' && selectedPlaylistId === pl.id && !isSearchActive
                      ? 'bg-surface-active text-text-primary'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Flex justify="between" align="center" className="w-full">
                    <Text size="xs" weight="medium" className="truncate flex-1">
                      {pl.name}
                    </Text>
                  </Flex>
                  <Text size="xs" className="text-text-tertiary truncate">
                    {typeof pl.trackCount === 'number'
                      ? `${pl.trackCount} ${pl.trackCount === 1 ? 'song' : 'songs'}`
                      : 'Playlist'}
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
          isLiked={currentTrack ? isLiked(currentTrack.videoId || currentTrack.id) : false}
          onToggleLike={() => {
            if (currentTrack) {
              toggleLike(currentTrack);
            }
          }}
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
          track={currentTrack ? getTrackDataWithLiked(currentTrack) : null}
          isPlaying={isCurrentlyPlaying}
          currentTime={currentTime}
          duration={duration}
          onPlayPause={togglePlay}
          onSeek={seek}
          onClose={() => setIsFullPlayerOpen(false)}
          activeTab={fullPlayerTab}
          onTabChange={setFullPlayerTab}
          queue={queue.map(getTrackDataWithLiked)}
          lyrics={lyrics || undefined}
          isLyricsLoading={isLyricsLoading}
          onLikeToggle={() => {
            if (currentTrack) {
              toggleLike(currentTrack);
            }
          }}
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
          {/* 1. REAL LIVE INNER_TUBE MOOD & ACTIVITY CHIPS STRIP (shown on home feed) */}
          {moodChips.length > 0 && activeNav === 'home' && !isSearchActive && (
            <Box className="mb-8 select-none">
              <MoodChipBar
                chips={moodChips}
                activeId={activeMoodChipId}
                onSelectChip={handleSelectMoodChip}
                showScrollButtons
              />
            </Box>
          )}

          {/* 2. DYNAMIC CONTENT: SEARCH RESULTS OR DEDICATED LIBRARY VIEW OR HOME FEED */}
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
                tracks={searchResults.map(getTrackDataWithLiked)}
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
                onLikeToggle={(trackData) => {
                  const matched = searchResults.find((x) => (x.id || x.videoId) === trackData.id);
                  if (matched) toggleLike(matched);
                }}
                onActionClick={(trackData) => {
                  const matched = searchResults.find((x) => (x.id || x.videoId) === trackData.id);
                  if (matched) {
                    setTrackToAddToPlaylist(matched);
                    setIsAddToPlaylistOpen(true);
                  }
                }}
                emptyMessage={
                  isSearching
                    ? 'Searching YouTube Music audio streams...'
                    : 'No tracks found. Try searching for an artist, track title, or genre.'
                }
              />
            </Stack>
          ) : activeNav === 'library' ? (
            /* DEDICATED LIBRARY & PLAYLIST VIEW */
            <Stack gap="8">
              {/* Playlist Header Banner */}
              <Flex gap="6" align="end" className="flex-col sm:flex-row pb-4 border-b border-border-subtle">
                {/* Artwork Tile */}
                {selectedPlaylistId === 'liked' ? (
                  <Box className="w-44 h-44 rounded-2xl bg-gradient-to-br from-emerald-600/50 via-emerald-800/30 to-surface flex items-center justify-center shadow-2xl border border-emerald-500/20 shrink-0">
                    <Heart size={64} className="text-emerald-400 fill-emerald-400" />
                  </Box>
                ) : (
                  <Box className="w-44 h-44 rounded-2xl bg-gradient-to-br from-surface-active to-surface flex items-center justify-center shadow-2xl border border-border-subtle shrink-0 text-text-tertiary">
                    <ListMusic size={64} />
                  </Box>
                )}

                {/* Playlist Info & Action Buttons */}
                <Stack gap="3" className="flex-1 min-w-0">
                  <Text variant="kicker" size="xs">
                    {selectedPlaylistId === 'liked' ? 'AUTO PLAYLIST' : 'PLAYLIST'}
                  </Text>
                  <Heading level={1} size="h1" className="truncate">
                    {selectedPlaylistId === 'liked'
                      ? 'Liked music'
                      : currentCustomPlaylist?.name || 'Playlist'}
                  </Heading>
                  <Text size="sm" className="text-text-secondary">
                    {selectedPlaylistId === 'liked'
                      ? `${likedTracks.length} ${likedTracks.length === 1 ? 'song' : 'songs'} • Saved to your library`
                      : `${currentLibraryTracks.length} ${currentLibraryTracks.length === 1 ? 'song' : 'songs'} • Created by you`}
                  </Text>

                  {/* Play & Shuffle Actions */}
                  <Flex gap="3" align="center" className="pt-2">
                    <Button
                      variant="primary"
                      size="md"
                      leftIcon={<Play size={16} className="fill-current" />}
                      disabled={currentLibraryTracks.length === 0}
                      onClick={() => handlePlayAll(currentLibraryTracks)}
                    >
                      Play
                    </Button>
                    <Button
                      variant="secondary"
                      size="md"
                      leftIcon={<Shuffle size={16} />}
                      disabled={currentLibraryTracks.length === 0}
                      onClick={() => handleShuffleAll(currentLibraryTracks)}
                    >
                      Shuffle
                    </Button>

                    {selectedPlaylistId !== 'liked' && currentCustomPlaylist && (
                      <IconButton
                        aria-label="Delete playlist"
                        variant="ghost"
                        size="md"
                        icon={<Trash2 size={18} className="text-status-error" />}
                        onClick={() => handleDeletePlaylist(currentCustomPlaylist.id)}
                      />
                    )}
                  </Flex>
                </Stack>
              </Flex>

              {/* Playlist Tracks Table */}
              {isLoadingPlaylistTracks ? (
                <Stack gap="3">
                  <Skeleton className="h-10 w-full rounded-lg" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </Stack>
              ) : (
                <TrackTable
                  tracks={currentLibraryTracks.map(getTrackDataWithLiked)}
                  currentTrackId={currentTrack?.id || currentTrack?.videoId}
                  isPlaying={isCurrentlyPlaying}
                  onTrackSelect={(t) => {
                    const matched = currentLibraryTracks.find((x) => (x.id || x.videoId) === t.id);
                    if (matched) handlePlayTrackWithRadio(matched);
                  }}
                  onTrackPlay={(t) => {
                    const matched = currentLibraryTracks.find((x) => (x.id || x.videoId) === t.id);
                    if (matched) handlePlayTrackWithRadio(matched);
                  }}
                  onTrackPause={pause}
                  onLikeToggle={(trackData) => {
                    const matched = currentLibraryTracks.find((x) => (x.id || x.videoId) === trackData.id);
                    if (matched) toggleLike(matched);
                  }}
                  onActionClick={(trackData) => {
                    const matched = currentLibraryTracks.find((x) => (x.id || x.videoId) === trackData.id);
                    if (matched) {
                      setTrackToAddToPlaylist(matched);
                      setIsAddToPlaylistOpen(true);
                    }
                  }}
                  emptyMessage={
                    selectedPlaylistId === 'liked'
                      ? 'No liked songs yet. Like songs while listening to see them in your collection!'
                      : 'This playlist is empty. Add songs to get started!'
                  }
                />
              )}
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
                              track={getTrackDataWithLiked(track)}
                              isActive={isActive}
                              isPlaying={isActive && isCurrentlyPlaying}
                              onPlay={() => handlePlayTrackWithRadio(track)}
                              onPause={pause}
                              onSelect={() => handlePlayTrackWithRadio(track)}
                              onQueue={() => addToQueue(track)}
                              onActionClick={() => {
                                setTrackToAddToPlaylist(track);
                                setIsAddToPlaylistOpen(true);
                              }}
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

      {/* Dynamic Create Playlist Dialog */}
      <CreatePlaylistDialog
        open={isCreatePlaylistOpen}
        onOpenChange={setIsCreatePlaylistOpen}
        onPlaylistCreated={(newPl) => {
          setSelectedPlaylistId(newPl.id);
          setActiveNav('library');
        }}
      />

      {/* Dynamic Add to Playlist Modal */}
      <AddToPlaylistModal
        open={isAddToPlaylistOpen}
        onOpenChange={setIsAddToPlaylistOpen}
        track={trackToAddToPlaylist}
        onCreateNewPlaylist={() => setIsCreatePlaylistOpen(true)}
      />

      {/* Dynamic Account & Profile Management Modal */}
      <AccountModal
        open={isAccountModalOpen}
        onOpenChange={setIsAccountModalOpen}
      />
    </AppShell>
  );
}
