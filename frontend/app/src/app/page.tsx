'use client';

import React, { useEffect, useState, useTransition, useCallback, useMemo } from 'react';
import {
  Search,
  Home as HomeIcon,
  Compass,
  Library,
  Plus,
  Heart,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Cast,
  Sun,
  Moon,
  Sparkles,
  Play,
  Pause,
  X,
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
  FullImmersionLyrics,
  Flex,
  Text,
  Heading,
  Separator,
  Button,
  IconButton,
  Badge,
  Tooltip,
  Input,
  Avatar,
  type TrackData,
  type LyricLine,
} from '@mp/dying';
import { usePlayerStore, toTrackData } from '../stores/playerStore';
import { type Track } from '@mp/player-core';

// ==========================================
// 1. MOCK & DEMO DATA (Matching YouTube Music Reference)
// ==========================================

const MOOD_CHIPS = [
  'Podcasts',
  'Romance',
  'Feel good',
  'Work out',
  'Party',
  'Relax',
  'Energise',
  'Sad',
  'Commute',
  'Focus',
  'Sleep',
];

const USER_PLAYLISTS = [
  { id: 'liked', name: 'Liked music', subtitle: 'Auto playlist', pinned: true },
  { id: 'pl-1', name: 'SynthWave-mix', subtitle: 'Anshul Khaire' },
  { id: 'pl-2', name: 'Custom', subtitle: 'Anshul Khaire' },
  { id: 'pl-3', name: 'THE BEST OF SKRILLEX', subtitle: 'Ton SparkleCl' },
  { id: 'pl-4', name: 'Tokyo night', subtitle: 'Anshul Khaire' },
  { id: 'pl-5', name: 'Vapor Drive', subtitle: 'Anshul Khaire' },
  { id: 'pl-6', name: 'Best BreakCore Playlist', subtitle: 'Anshul Khaire' },
  { id: 'pl-7', name: 'Minecraft - Volume Beta', subtitle: 'Anshul Khaire' },
  { id: 'pl-8', name: '2025 Recap', subtitle: 'Curated' },
];

// 16:9 Landscape Video Cards ("Listen again" shelf)
const LISTEN_AGAIN_TRACKS: Track[] = [
  {
    id: 'pehli-dafa-video',
    videoId: 'kXYiU_JCYtU',
    title: 'Pehli Dafa',
    artist: 'Played • Atif Aslam',
    album: 'Pehli Dafa Single',
    duration: 254,
    thumbnail:
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'papercut-video',
    videoId: '1w7OgIMMRc4',
    title: 'Papercut',
    artist: 'Linkin Park • 380m views',
    album: 'Hybrid Theory',
    duration: 185,
    thumbnail:
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'drive-sunset-video',
    videoId: '4NRXx6U8ABQ',
    title: 'Drive Into the Sunset 昭和の懐かしいシティポップ 1980',
    artist: 'Vintage J-Pop Station • 11k views',
    album: 'ChillDrive Playlist',
    duration: 320,
    thumbnail:
      'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'emptiness-machine-video',
    videoId: 'dQw4w9WgXcQ',
    title: 'The Emptiness Machine',
    artist: 'Linkin Park • 240m views',
    album: 'From Zero',
    duration: 191,
    thumbnail:
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'midnight-tokyo-video',
    videoId: 'kXYiU_JCYtU',
    title: 'Midnight in Tokyo',
    artist: 'Komorebi & ChilledCat • 85m views',
    album: 'Tokyo Lo-Fi Tape',
    duration: 214,
    thumbnail:
      'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&auto=format&fit=crop&q=80',
  },
];

// 4-row Column Grid List ("Song mixes" section)
const SONG_MIXES_TRACKS: Track[] = [
  {
    id: 'mix-1',
    videoId: 'kXYiU_JCYtU',
    title: 'Pehli Dafa',
    artist: 'Atif Aslam',
    album: 'Pehli Dafa',
    duration: 254,
    thumbnail:
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'mix-2',
    videoId: '1w7OgIMMRc4',
    title: 'Bring Me To Life',
    artist: 'Evanescence',
    album: 'Fallen',
    duration: 236,
    thumbnail:
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'mix-3',
    videoId: '4NRXx6U8ABQ',
    title: "That's So True",
    artist: 'Gracie Abrams',
    album: 'The Secret of Us (Deluxe)',
    duration: 182,
    thumbnail:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'mix-4',
    videoId: 'dQw4w9WgXcQ',
    title: 'Love Me Not',
    artist: 'Ravyn Lenae',
    album: "Bird's Eye",
    duration: 215,
    thumbnail:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'mix-5',
    videoId: 'kXYiU_JCYtU',
    title: 'Classical Dragon (feat. Tim Henson)',
    artist: 'Polyphia',
    album: 'Remember That You Will Die',
    duration: 198,
    thumbnail:
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'mix-6',
    videoId: '1w7OgIMMRc4',
    title: 'CELINE',
    artist: 'Drake',
    album: 'For All The Dogs',
    duration: 221,
    thumbnail:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'mix-7',
    videoId: '4NRXx6U8ABQ',
    title: 'Numb',
    artist: 'Linkin Park',
    album: 'Meteora (20th Anniversary)',
    duration: 187,
    thumbnail:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'mix-8',
    videoId: 'dQw4w9WgXcQ',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    album: 'After Hours',
    duration: 200,
    thumbnail:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'mix-9',
    videoId: 'kXYiU_JCYtU',
    title: 'Birds of a Feather',
    artist: 'Billie Eilish',
    album: 'HIT ME HARD AND SOFT',
    duration: 196,
    thumbnail:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'mix-10',
    videoId: '1w7OgIMMRc4',
    title: 'Not Like Us',
    artist: 'Kendrick Lamar',
    album: 'GNX',
    duration: 274,
    thumbnail:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'mix-11',
    videoId: '4NRXx6U8ABQ',
    title: 'APT.',
    artist: 'ROSÉ & Bruno Mars',
    album: 'rosie',
    duration: 173,
    thumbnail:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'mix-12',
    videoId: 'dQw4w9WgXcQ',
    title: 'Starboy',
    artist: 'The Weeknd feat. Daft Punk',
    album: 'Starboy',
    duration: 230,
    thumbnail:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
  },
];

const DEFAULT_LYRICS: LyricLine[] = [
  { time: 0, text: '♪ (Acoustic Prelude & Subdued Vinyl) ♪' },
  { time: 6, text: 'Looking through the dark acrylic glass tonight' },
  { time: 12, text: 'Monochrome reflections in the OLED light' },
  { time: 18, text: 'No latency, no friction in the stream' },
  { time: 24, text: 'Living inside the high-fidelity dream' },
  { time: 30, text: '♪ (Bass Drop & Deep Resonance) ♪' },
  { time: 36, text: 'Hear every subtle detail crystal clear' },
  { time: 42, text: 'The purest sound is waiting right here' },
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
    search,
  } = usePlayerStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeMood, setActiveMood] = useState<string | null>(null);
  const [activeNav, setActiveNav] = useState<'home' | 'explore' | 'library' | 'liked'>('home');
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<'oled' | 'dark' | 'light'>('oled');
  const [, startTransition] = useTransition();

  // Initialize audio engine on client mount
  useEffect(() => {
    initialize();
    // Default to true OLED black for YouTube Music aesthetic
    document.documentElement.setAttribute('data-theme', 'oled');
    document.documentElement.classList.add('dark');
  }, [initialize]);

  const switchTheme = (theme: 'oled' | 'dark' | 'light') => {
    setCurrentTheme(theme);
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  };

  // Handle Search Input Change
  const handleSearchChange = useCallback((value: string) => {
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
  }, [search]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
    setActiveMood(null);
  }, []);

  const handleMoodSelect = useCallback((mood: string) => {
    if (activeMood === mood) {
      setActiveMood(null);
      handleClearSearch();
    } else {
      setActiveMood(mood);
      handleSearchChange(mood);
    }
  }, [activeMood, handleClearSearch, handleSearchChange]);

  const handleTrackSelect = useCallback((trackData: TrackData) => {
    const matchedTrack: Track =
      searchResults.find((t) => (t.id || t.videoId) === trackData.id) ||
      LISTEN_AGAIN_TRACKS.find((t) => (t.id || t.videoId) === trackData.id) ||
      SONG_MIXES_TRACKS.find((t) => (t.id || t.videoId) === trackData.id) || {
        id: trackData.id,
        videoId: trackData.id,
        title: trackData.title,
        artist: trackData.artist,
        duration:
          typeof trackData.duration === 'number'
            ? trackData.duration
            : Number(trackData.duration) || 0,
        thumbnail: trackData.thumbnailUrl || '',
        album: trackData.album || '',
      };
    playTrack(matchedTrack);
  }, [searchResults, playTrack]);

  const isSearchActive = searchQuery.trim().length > 0;
  const isCurrentlyPlaying = playbackState === 'playing';

  // Group song mixes into columns of 4 for the dense grid list
  const mixColumns = useMemo(() => {
    const columns: Track[][] = [];
    for (let i = 0; i < SONG_MIXES_TRACKS.length; i += 4) {
      columns.push(SONG_MIXES_TRACKS.slice(i, i + 4));
    }
    return columns;
  }, []);

  return (
    <AppShell
      sidebar={
        <Sidebar className="w-60 bg-sidebar border-r border-border-subtle flex flex-col justify-between">
          <div className="flex flex-col h-full overflow-hidden">
            {/* Top Brand Logo */}
            <SidebarBrand
              logo={
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white shadow-md">
                  <Play size={14} className="fill-current ml-0.5" />
                </div>
              }
              title="Music"
              subtitle="GaneGan Engine"
            />

            {/* Primary Navigation Drawer */}
            <SidebarNav>
              <SidebarNavItem
                icon={<HomeIcon className="h-4 w-4" />}
                label="Home"
                active={activeNav === 'home' && !isSearchActive}
                onClick={() => {
                  setActiveNav('home');
                  handleClearSearch();
                }}
              />
              <SidebarNavItem
                icon={<Compass className="h-4 w-4" />}
                label="Explore"
                active={activeNav === 'explore'}
                onClick={() => {
                  setActiveNav('explore');
                  handleSearchChange('Trending Top Hits');
                }}
              />
              <SidebarNavItem
                icon={<Library className="h-4 w-4" />}
                label="Library"
                active={activeNav === 'library'}
                onClick={() => setActiveNav('library')}
              />
            </SidebarNav>

            <div className="px-3 py-2">
              <Separator />
            </div>

            {/* "+ New playlist" button */}
            <div className="px-3 py-1">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Plus size={16} />}
                className="w-full justify-start text-xs font-semibold text-text-primary hover:bg-surface-active rounded-full"
                onClick={() => alert('New Playlist creation modal')}
              >
                New playlist
              </Button>
            </div>

            {/* User Playlists Scrollable Rail */}
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
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
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-medium truncate flex-1">{pl.name}</span>
                    {pl.pinned && (
                      <Heart size={12} className="text-emerald-400 fill-emerald-400 shrink-0 ml-1.5" />
                    )}
                  </div>
                  <span className="text-[11px] text-text-tertiary truncate">{pl.subtitle}</span>
                </Button>
              ))}
            </div>
          </div>

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
        <div className="flex items-center justify-between h-16 px-4 md:px-8 gap-4 select-none">
          {/* Centered Large Search Pill */}
          <div className="flex-1 max-w-2xl mx-auto">
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
                  <kbd className="hidden sm:inline-flex pointer-events-none rounded-full border border-border-subtle bg-white/5 px-2 py-0.5 text-[10px] font-mono text-text-tertiary">
                    ⌘K
                  </kbd>
                )
              }
              className="rounded-full bg-surface/80 border-border-subtle focus:bg-surface text-sm"
            />
          </div>

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

            <Tooltip content={`Switch Theme (Current: ${currentTheme.toUpperCase()})`}>
              <IconButton
                aria-label="Switch theme"
                variant="ghost"
                size="md"
                shape="circle"
                icon={
                  currentTheme === 'oled' ? (
                    <Sun size={18} className="text-amber-400" />
                  ) : (
                    <Moon size={18} className="text-cyan-400" />
                  )
                }
                onClick={() =>
                  switchTheme(currentTheme === 'oled' ? 'dark' : currentTheme === 'dark' ? 'light' : 'oled')
                }
              />
            </Tooltip>

            {/* User Profile Avatar Pill (Matches "A" ANSHUL KHAIRE in screenshot) */}
            <Tooltip content="Account: Anshul Khaire">
              <Avatar
                fallback="A"
                size="sm"
                aria-label="User Account: Anshul Khaire"
                className="bg-emerald-600 text-white font-bold cursor-pointer hover:ring-2 hover:ring-emerald-400 transition-all"
              />
            </Tooltip>
          </Flex>
        </div>
      }
      playerDock={
        <FloatingPlayerPill
          title={currentTrack?.title || 'Not Playing'}
          artist={currentTrack?.artist || 'Select a track or search to begin listening'}
          album={currentTrack?.album}
          artworkUrl={currentTrack?.thumbnail}
          isPlaying={isCurrentlyPlaying}
          currentTime={currentTime}
          duration={duration}
          buffered={bufferedPercent}
          volume={volume}
          isMuted={isMuted}
          isLyricsOpen={isLyricsOpen}
          isShuffle={isShuffle}
          repeatMode={repeatMode}
          onPlayPause={togglePlay}
          onPrevious={previous}
          onNext={next}
          onSeek={seek}
          onVolumeChange={setVolume}
          onToggleMute={toggleMute}
          onToggleLyrics={() => setIsLyricsOpen((prev) => !prev)}
          onToggleShuffle={toggleShuffle}
          onToggleRepeat={toggleRepeat}
        />
      }
      overlay={
        isLyricsOpen ? (
          <FullImmersionLyrics
            track={currentTrack ? toTrackData(currentTrack) : null}
            lyrics={DEFAULT_LYRICS}
            currentTime={currentTime}
            isPlaying={isCurrentlyPlaying}
            onPlayPause={togglePlay}
            onClose={() => setIsLyricsOpen(false)}
            onSeek={seek}
          />
        ) : null
      }
    >
      {/* 2. MOOD & ACTIVITY CHIPS RAIL (Horizontal Scrollable) */}
      <section className="mb-8 select-none">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none no-scrollbar">
          {MOOD_CHIPS.map((mood) => {
            const isSelected = activeMood === mood;
            return (
              <Button
                key={mood}
                variant={isSelected ? "primary" : "secondary"}
                size="xs"
                onClick={() => handleMoodSelect(mood)}
                className={`shrink-0 rounded-lg text-xs font-medium ${
                  isSelected ? 'font-semibold' : ''
                }`}
              >
                {mood}
              </Button>
            );
          })}
        </div>
      </section>

      {/* 3. DYNAMIC CONTENT: SEARCH RESULTS OR YOUTUBE MUSIC DASHBOARD */}
      {isSearchActive ? (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Text variant="kicker" size="xs">YouTube Music Engine</Text>
              <Heading level={1} size="h1">
                {searchQuery.trim() ? `Results for "${searchQuery}"` : 'Search'}
              </Heading>
            </div>
            {isSearching && (
              <Badge variant="accent">Searching InnerTube...</Badge>
            )}
          </div>

          <TrackTable
            tracks={searchResults.map(toTrackData)}
            currentTrackId={currentTrack?.id || currentTrack?.videoId}
            isPlaying={isCurrentlyPlaying}
            onTrackSelect={handleTrackSelect}
            onTrackPlay={handleTrackSelect}
            onTrackPause={pause}
            emptyMessage={
              isSearching
                ? 'Searching YouTube Music audio streams...'
                : 'No tracks found. Try searching for an artist, track title, or genre.'
            }
          />
        </section>
      ) : (
        <div className="space-y-12">
          {/* SECTION 1: "Listen again" (16:9 Video Cards) */}
          <section className="space-y-4">
            <Flex justify="between" align="end">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-base shadow-md">
                  A
                </div>
                <div className="flex flex-col">
                  <Text variant="kicker" size="xs">ANSHUL KHAIRE</Text>
                  <Heading level={2} size="h2" className="tracking-tight">
                    Listen again
                  </Heading>
                </div>
              </div>

              <Flex gap="2" align="center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs font-semibold rounded-full"
                  onClick={() => handleSearchChange('Listen again')}
                >
                  More
                </Button>
                <IconButton
                  aria-label="Previous"
                  variant="ghost"
                  size="sm"
                  shape="circle"
                  icon={<ChevronLeft size={16} />}
                />
                <IconButton
                  aria-label="Next"
                  variant="ghost"
                  size="sm"
                  shape="circle"
                  icon={<ChevronRight size={16} />}
                />
              </Flex>
            </Flex>

            {/* 16:9 Landscape Video Shelf */}
            <div className="flex gap-4 overflow-x-auto pb-4 pt-1 scrollbar-none">
              {LISTEN_AGAIN_TRACKS.map((t, idx) => (
                <MediaCard
                  key={t.id}
                  title={t.title}
                  subtitle={t.artist}
                  imageUrl={t.thumbnail}
                  aspect="video"
                  overlayText={idx === 0 ? '340M+ VIEWS' : undefined}
                  onPlay={() => playTrack(t)}
                />
              ))}
            </div>
          </section>

          {/* SECTION 2: "Song mixes" (Dense 4-row Column Grid) */}
          <section className="space-y-4">
            <Flex justify="between" align="end">
              <div>
                <Heading level={2} size="h2" className="tracking-tight">
                  Song mixes
                </Heading>
              </div>

              <Flex gap="2" align="center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs font-semibold rounded-full"
                  onClick={() => playTrack(SONG_MIXES_TRACKS[0])}
                >
                  Play all
                </Button>
                <IconButton
                  aria-label="Previous mixes"
                  variant="ghost"
                  size="sm"
                  shape="circle"
                  icon={<ChevronLeft size={16} />}
                />
                <IconButton
                  aria-label="Next mixes"
                  variant="ghost"
                  size="sm"
                  shape="circle"
                  icon={<ChevronRight size={16} />}
                />
              </Flex>
            </Flex>

            {/* 4-Item Stacked Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {mixColumns.map((col, colIdx) => (
                <div key={colIdx} className="flex flex-col gap-2">
                  {col.map((track) => {
                    const isTrackActive =
                      (currentTrack?.id || currentTrack?.videoId) === (track.id || track.videoId);
                    return (
                      <div
                        key={track.id}
                        onClick={() => playTrack(track)}
                        className={`group relative flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all duration-150 select-none ${
                          isTrackActive
                            ? 'bg-surface-active text-white'
                            : 'hover:bg-surface-hover text-text-primary'
                        }`}
                      >
                        {/* Square Thumbnail with Hover Play */}
                        <div className="relative h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-surface border border-border-subtle">
                          <img
                            src={track.thumbnail}
                            alt={track.title}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                          <div
                            className={`absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity ${
                              isTrackActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                            }`}
                          >
                            {isTrackActive && isCurrentlyPlaying ? (
                              <Pause size={18} className="fill-current text-white" />
                            ) : (
                              <Play size={18} className="fill-current text-white ml-0.5" />
                            )}
                          </div>
                        </div>

                        {/* Title & Secondary Metadata */}
                        <div className="flex flex-col min-w-0 flex-1">
                          <span
                            className={`truncate text-sm font-semibold tracking-tight ${
                              isTrackActive ? 'text-emerald-400' : 'text-text-primary'
                            }`}
                          >
                            {track.title}
                          </span>
                          <span className="truncate text-xs text-text-secondary mt-0.5">
                            {track.artist} • {track.album}
                          </span>
                        </div>

                        {/* Context Menu Action */}
                        <IconButton
                          aria-label="Track options"
                          variant="ghost"
                          size="sm"
                          shape="circle"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-text-tertiary hover:text-white"
                          icon={<MoreVertical size={14} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            alert(`Options for ${track.title}`);
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 3: "Quick picks & Trending" */}
          <section className="space-y-4">
            <MediaShelf title="Trending Hits & Quick Picks">
              {SONG_MIXES_TRACKS.slice(0, 6).map((track) => (
                <MediaCard
                  key={track.id}
                  title={track.title}
                  subtitle={track.artist}
                  imageUrl={track.thumbnail}
                  aspect="square"
                  onPlay={() => playTrack(track)}
                />
              ))}
            </MediaShelf>
          </section>
        </div>
      )}
    </AppShell>
  );
}
