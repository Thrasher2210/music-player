'use client';

import React, { useEffect, useState, useTransition, useCallback } from 'react';
import {
  Radio,
  Search,
  Home as HomeIcon,
  Sparkles,
  Library,
  Activity,
  Music2,
} from 'lucide-react';
import {
  AppShell,
  Sidebar,
  SidebarBrand,
  SearchInput,
  SidebarNav,
  SidebarNavItem,
  SidebarFooter,
  PageHeader,
  HeroCarousel,
  HeroBannerCard,
  MediaShelf,
  MediaCard,
  TrackTable,
  FloatingPlayerPill,
  FullImmersionLyrics,
  type TrackData,
  type LyricLine,
} from '@mp/dying';
import { usePlayerStore, toTrackData } from '../stores/playerStore';
import { type Track } from '@mp/player-core';

const FEATURED_STATIONS: Track[] = [
  {
    id: 'kXYiU_JCYtU',
    videoId: 'kXYiU_JCYtU',
    title: 'Holiday Hits',
    artist: 'Apple Music Radio',
    album: 'Festive Classics',
    duration: 187,
    thumbnail:
      'https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: '1w7OgIMMRc4',
    videoId: '1w7OgIMMRc4',
    title: 'Rocket Hour',
    artist: 'Elton John',
    album: 'Apple Music 1',
    duration: 216,
    thumbnail:
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: '4NRXx6U8ABQ',
    videoId: '4NRXx6U8ABQ',
    title: 'Apple Music 1',
    artist: 'Zane Lowe & Daily Shows',
    album: 'Global Live Radio',
    duration: 200,
    thumbnail:
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80',
  },
];

const ARTIST_STATIONS: Track[] = [
  {
    id: 'dQw4w9WgXcQ',
    videoId: 'dQw4w9WgXcQ',
    title: 'Billie Eilish Radio',
    artist: 'Billie Eilish',
    album: 'Artist Take Over',
    duration: 196,
    thumbnail:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: '4NRXx6U8ABQ',
    videoId: '4NRXx6U8ABQ',
    title: 'Kendrick Lamar Radio',
    artist: 'Kendrick Lamar',
    album: 'Artist Take Over',
    duration: 274,
    thumbnail:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: '1w7OgIMMRc4',
    videoId: '1w7OgIMMRc4',
    title: 'Dua Lipa Radio',
    artist: 'Dua Lipa',
    album: 'Artist Take Over',
    duration: 185,
    thumbnail:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'kXYiU_JCYtU',
    videoId: 'kXYiU_JCYtU',
    title: 'The Weeknd Radio',
    artist: 'The Weeknd',
    album: 'Artist Take Over',
    duration: 200,
    thumbnail:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'dQw4w9WgXcQ',
    videoId: 'dQw4w9WgXcQ',
    title: 'Taylor Swift Radio',
    artist: 'Taylor Swift',
    album: 'Artist Take Over',
    duration: 178,
    thumbnail:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&auto=format&fit=crop&q=80',
  },
];

const POPULAR_STATIONS: Track[] = [
  {
    id: 'kXYiU_JCYtU',
    videoId: 'kXYiU_JCYtU',
    title: 'Apple Music Chill',
    artist: 'Ambient & Lo-Fi Beats',
    album: 'Curated Radio',
    duration: 187,
    thumbnail:
      'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: '1w7OgIMMRc4',
    videoId: '1w7OgIMMRc4',
    title: "Today's Hits",
    artist: 'Global Chart Toppers',
    album: 'Curated Radio',
    duration: 216,
    thumbnail:
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: '4NRXx6U8ABQ',
    videoId: '4NRXx6U8ABQ',
    title: 'Classical Essentials',
    artist: 'Orchestral Masters',
    album: 'Curated Radio',
    duration: 200,
    thumbnail:
      'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'dQw4w9WgXcQ',
    videoId: 'dQw4w9WgXcQ',
    title: 'Club Quarantine',
    artist: 'D-Nice Radio Session',
    album: 'Curated Radio',
    duration: 213,
    thumbnail:
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
  },
];

const DEFAULT_LYRICS: LyricLine[] = [
  { time: 0, text: '♪ (Live Apple Music Radio Broadcast) ♪' },
  { time: 6, text: 'Streaming seamless audio in Monochrome Graphite' },
  { time: 12, text: 'Specular reflections on dark acrylic glass' },
  { time: 18, text: 'Zero latency in the flow of sound' },
  { time: 25, text: 'Deep graphite canvas beneath our feet' },
  { time: 33, text: 'Tactile spring physics in every beat' },
  { time: 42, text: 'GaneGan audio playing endlessly' },
  { time: 54, text: '♪ (Outro fades into ambient glow) ♪' },
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
  const [activeNav, setActiveNav] = useState<'home' | 'search' | 'new' | 'radio' | 'library'>('radio');
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [, startTransition] = useTransition();

  // Initialize audio engine on client mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Handle Search Input Change
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (value.trim()) {
      setActiveNav('search');
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
    setActiveNav('radio');
  }, []);

  const handlePlayStation = useCallback((station: Track) => {
    playTrack(station);
  }, [playTrack]);

  const handleTrackSelect = useCallback((trackData: TrackData) => {
    const matchedTrack: Track = searchResults.find(
      (t) => (t.id || t.videoId) === trackData.id
    ) || {
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

  const isSearchActive = activeNav === 'search' || searchQuery.trim().length > 0;
  const isCurrentlyPlaying = playbackState === 'playing';

  return (
    <AppShell
      stageClassName="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto"
      sidebar={
        <Sidebar>
          <SidebarBrand
            logo={<Music2 className="h-5 w-5 text-white" />}
            title="GaneGan"
            subtitle="Apple Music Graphite"
          />
          <SearchInput
            value={searchQuery}
            onChange={handleSearchChange}
            onClear={handleClearSearch}
            placeholder="Search YouTube Music..."
            shortcutBadge="⌘K"
          />
          <SidebarNav title="Discover">
            <SidebarNavItem
              icon={<Search className="h-4 w-4" />}
              label="Search"
              active={activeNav === 'search'}
              onClick={() => setActiveNav('search')}
            />
            <SidebarNavItem
              icon={<HomeIcon className="h-4 w-4" />}
              label="Home"
              active={activeNav === 'home'}
              onClick={() => {
                setActiveNav('home');
                setSearchQuery('');
              }}
            />
            <SidebarNavItem
              icon={<Sparkles className="h-4 w-4" />}
              label="New"
              active={activeNav === 'new'}
              onClick={() => {
                setActiveNav('new');
                setSearchQuery('');
              }}
            />
            <SidebarNavItem
              icon={<Radio className="h-4 w-4" />}
              label="Radio"
              active={activeNav === 'radio'}
              onClick={() => {
                setActiveNav('radio');
                setSearchQuery('');
              }}
            />
          </SidebarNav>
          <SidebarNav title="Library">
            <SidebarNavItem
              icon={<Library className="h-4 w-4" />}
              label="Library"
              active={activeNav === 'library'}
              onClick={() => setActiveNav('library')}
            />
          </SidebarNav>
          <SidebarFooter>
            <SidebarNavItem
              icon={<Activity className="h-4 w-4" />}
              label="Design System Showcase"
              href="/dying"
            />
          </SidebarFooter>
        </Sidebar>
      }
      playerDock={
        <FloatingPlayerPill
          title={currentTrack?.title || 'Not Playing'}
          artist={currentTrack?.artist || 'Select a radio station or search for music'}
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
      {isSearchActive ? (
        <React.Fragment>
          <PageHeader
            kicker="YouTube Music Search"
            title={searchQuery.trim() ? `Results for "${searchQuery}"` : 'Search'}
          />
          <TrackTable
            tracks={searchResults.map(toTrackData)}
            currentTrackId={currentTrack?.id || currentTrack?.videoId}
            isPlaying={isCurrentlyPlaying}
            onTrackSelect={handleTrackSelect}
            onTrackPlay={handleTrackSelect}
            onTrackPause={pause}
            emptyMessage={
              isSearching
                ? 'Searching YouTube Music...'
                : 'No tracks found. Type a query in the search bar to find songs.'
            }
          />
        </React.Fragment>
      ) : (
        <React.Fragment>
          <PageHeader
            kicker="Exclusive Stations"
            title="Apple Music Radio"
          />
          <HeroCarousel>
            <HeroBannerCard
              kicker="Apple Music Radio"
              title="Holiday Hits"
              subtitle="Festive classics and seasonal favorites with Zane Lowe"
              imageUrl="https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=800&auto=format&fit=crop&q=80"
              onPlay={() => handlePlayStation(FEATURED_STATIONS[0])}
            />
            <HeroBannerCard
              kicker="The Rocket Hour"
              title="Rocket Hour"
              subtitle="Elton John plays his favorite tracks from emerging artists"
              imageUrl="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80"
              onPlay={() => handlePlayStation(FEATURED_STATIONS[1])}
            />
            <HeroBannerCard
              kicker="Live Now"
              title="Apple Music 1"
              subtitle="The world's biggest artists, exclusive interviews, and daily hits"
              imageUrl="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80"
              onPlay={() => handlePlayStation(FEATURED_STATIONS[2])}
            />
          </HeroCarousel>
          <MediaShelf title="Artists Take Over">
            <MediaCard
              title="Billie Eilish"
              subtitle="Artist Station"
              imageUrl="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80"
              aspect="square"
              onPlay={() => handlePlayStation(ARTIST_STATIONS[0])}
            />
            <MediaCard
              title="Kendrick Lamar"
              subtitle="Artist Station"
              imageUrl="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80"
              aspect="square"
              onPlay={() => handlePlayStation(ARTIST_STATIONS[1])}
            />
            <MediaCard
              title="Dua Lipa"
              subtitle="Artist Station"
              imageUrl="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80"
              aspect="square"
              onPlay={() => handlePlayStation(ARTIST_STATIONS[2])}
            />
            <MediaCard
              title="The Weeknd"
              subtitle="Artist Station"
              imageUrl="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80"
              aspect="square"
              onPlay={() => handlePlayStation(ARTIST_STATIONS[3])}
            />
            <MediaCard
              title="Taylor Swift"
              subtitle="Artist Station"
              imageUrl="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&auto=format&fit=crop&q=80"
              aspect="square"
              onPlay={() => handlePlayStation(ARTIST_STATIONS[4])}
            />
          </MediaShelf>
          <MediaShelf title="Popular Stations">
            <MediaCard
              title="Chill Radio"
              subtitle="Apple Music Chill"
              imageUrl="https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80"
              aspect="square"
              onPlay={() => handlePlayStation(POPULAR_STATIONS[0])}
            />
            <MediaCard
              title="Today's Hits"
              subtitle="Chart Toppers"
              imageUrl="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80"
              aspect="square"
              onPlay={() => handlePlayStation(POPULAR_STATIONS[1])}
            />
            <MediaCard
              title="Classical Essentials"
              subtitle="Apple Classical"
              imageUrl="https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=500&auto=format&fit=crop&q=80"
              aspect="square"
              onPlay={() => handlePlayStation(POPULAR_STATIONS[2])}
            />
            <MediaCard
              title="Club Quarantine"
              subtitle="D-Nice Session"
              imageUrl="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80"
              aspect="square"
              onPlay={() => handlePlayStation(POPULAR_STATIONS[3])}
            />
          </MediaShelf>
        </React.Fragment>
      )}
    </AppShell>
  );
}
