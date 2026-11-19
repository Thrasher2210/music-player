'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  AppShell,
  Sidebar,
  SidebarBrand,
  BrandLogo,
  SidebarNav,
  SidebarNavItem,
  SidebarFooter,
  Flex,
  Box,
  Button,
  IconButton,
  Input,
  Badge,
  Avatar,
  Tooltip,
  FloatingPlayerPill,
  FullPlayerView,
  ThemeSwitcher,
  type TrackData,
} from '@mp/dying';
import {
  Home,
  Compass,
  Library,
  Plus,
  Heart,
  Search,
  Cast,
  LogIn,
  X,
  Sparkles,
} from 'lucide-react';
import { usePlayerStore, type Track } from '../../stores/playerStore';
import { useAuthStore } from '../../stores/authStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { useMediaSession, useKeyboardShortcuts, useUrlSync } from '../../hooks';
import { CreatePlaylistDialog } from '../CreatePlaylistDialog';
import { AddToPlaylistModal } from '../AddToPlaylistModal';
import { AccountModal } from '../AccountModal';
import { PlaybackOptionsModal } from '../PlaybackOptionsModal';

export interface PersistentAppShellProps {
  children: React.ReactNode;
}

export function PersistentAppShell({ children }: PersistentAppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [hasMounted, setHasMounted] = useState(false);
  const [, startTransition] = useTransition();

  // Dialog & Modal State
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);
  const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState(false);
  const [trackToAddToPlaylist, setTrackToAddToPlaylist] = useState<Track | null>(null);
  const [isPlaybackOptionsOpen, setIsPlaybackOptionsOpen] = useState(false);

  // Full Player Modal State
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [fullPlayerTab, setFullPlayerTab] = useState<'lyrics' | 'upNext' | 'related'>('lyrics');

  // Search State
  const initialQuery = searchParams.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  // Stores
  const { user, isAuthenticated } = useAuthStore();
  const {
    currentTrack,
    playbackState,
    currentTime,
    duration,
    bufferedPercent,
    volume,
    isMuted,
    queue,
    isShuffle,
    repeatMode,
    lyrics,
    isLyricsLoading,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    next,
    previous,
    toggleShuffle,
    toggleRepeat,
    initialize,
    removeFromQueue,
    playTrack,
  } = usePlayerStore();

  const {
    playlists,
    fetchLibrary,
    toggleLike,
    isLiked,
  } = useLibraryStore();

  // Two-way synchronization with URL search parameters and /watch route
  useUrlSync({
    isFullPlayerOpen,
    setIsFullPlayerOpen,
  });

  // OS Media Session & Keyboard Shortcuts
  useMediaSession();

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

  useKeyboardShortcuts({
    toggleLyrics: handleToggleLyrics,
    toggleFullPlayer: () => setIsFullPlayerOpen((prev) => !prev),
    closeModals: handleCloseModals,
  });

  // Mount effects
  useEffect(() => {
    setHasMounted(true);
    initialize();
  }, [initialize]);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary, isAuthenticated]);

  // Sync search input with searchParams when route changes
  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null && q !== searchQuery) {
      setSearchQuery(q);
    }
  }, [searchParams]);

  // Debounced search query navigation to /search?q=...
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    startTransition(() => {
      if (val.trim()) {
        router.push(`/search?q=${encodeURIComponent(val.trim())}`);
      } else if (pathname === '/search') {
        router.push('/');
      }
    });
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    if (pathname === '/search') {
      router.push('/');
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

  const isCurrentlyPlaying = playbackState === 'playing';

  // Do not render AppShell sidebar/header on dedicated auth pages
  const isAuthRoute = pathname === '/login' || pathname === '/register';
  if (isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <AppShell
        sidebar={
          <Sidebar>
            <div className="cursor-pointer" onClick={() => router.push('/')}>
              <SidebarBrand
                logo={<BrandLogo variant="app-icon" size={28} />}
                title={<BrandLogo variant="wordmark" size="sm" />}
                subtitle="Streaming"
              />
            </div>

            <div className="flex-1 overflow-y-auto">
              <SidebarNav title="Menu">
                <SidebarNavItem
                  icon={<Home className="h-4 w-4" />}
                  label="Home"
                  active={pathname === '/'}
                  onClick={() => router.push('/')}
                />
                <SidebarNavItem
                  icon={<Compass className="h-4 w-4" />}
                  label="Explore"
                  active={pathname === '/explore'}
                  onClick={() => router.push('/explore')}
                />
                <SidebarNavItem
                  icon={<Library className="h-4 w-4" />}
                  label="Library"
                  active={pathname === '/library'}
                  onClick={() => router.push('/library')}
                />
              </SidebarNav>

              <SidebarNav
                title="Playlists"
                action={
                  <IconButton
                    aria-label="Create new playlist"
                    variant="ghost"
                    size="xs"
                    icon={<Plus size={14} />}
                    onClick={() => setIsCreatePlaylistOpen(true)}
                  />
                }
              >
                <SidebarNavItem
                  icon={<Heart className="h-4 w-4 text-emerald-400" />}
                  label="Liked music"
                  active={pathname === '/playlist/liked'}
                  onClick={() => router.push('/playlist/liked')}
                />

                {playlists.map((pl) => (
                  <SidebarNavItem
                    key={pl.id}
                    icon={<Library className="h-4 w-4" />}
                    label={pl.name}
                    active={pathname === `/playlist/${pl.id}`}
                    onClick={() => router.push(`/playlist/${pl.id}`)}
                  />
                ))}
              </SidebarNav>
            </div>

            <SidebarFooter>
              <SidebarNavItem
                icon={<Sparkles className="h-4 w-4 text-emerald-400" />}
                label="Dying 2.0 Design System"
                onClick={() => router.push('/dying')}
              />
            </SidebarFooter>
          </Sidebar>
        }
        header={
          <Flex justify="between" align="center" className="h-16 px-4 md:px-8 gap-4 select-none">
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
            onToggleLyrics={handleToggleLyrics}
            onToggleExpand={() => setIsFullPlayerOpen(!isFullPlayerOpen)}
            onExpandNowPlaying={() => setIsFullPlayerOpen(!isFullPlayerOpen)}
            onArtistClick={() => {
              if (currentTrack?.artistId) {
                startTransition(() => router.push(`/artist/${currentTrack.artistId}`));
              }
            }}
            onToggleShuffle={toggleShuffle}
            onToggleRepeat={toggleRepeat}
            onMoreOptions={() => setIsPlaybackOptionsOpen(true)}
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
                playTrack(matched);
              }
            }}
            onRemoveFromQueue={(trackId) => {
              const idx = queue.findIndex((x) => (x.id || x.videoId) === trackId);
              if (idx !== -1) {
                removeFromQueue(idx);
              }
            }}
          />
        ) : (
          children
        )}
      </AppShell>

      {/* Global Modals */}
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
