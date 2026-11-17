'use client';

import React, { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Search,
  Activity,
  Layers,
  Sparkles,
  RefreshCw,
  Cpu,
  Radio,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Zap,
} from 'lucide-react';
import {
  OledBase,
  AmbientAura,
  GlassPanel,
  GlassCard,
  TrackRow,
  PlayerBar,
  SoundWave,
  SpringButton,
  ScrubSlider,
  type TrackData,
} from '@mp/dying';
import {
  usePlayerStore,
  toTrackData,
  type NetworkAdapterType,
} from '../stores/playerStore';
import { Track } from '@mp/player-core';

const DEMO_PRESETS: Track[] = [
  {
    id: 'jfKfPfyJRdk',
    videoId: 'jfKfPfyJRdk',
    title: 'Lofi Hip Hop Radio — Beats to Relax/Study to',
    artist: 'Lofi Girl',
    duration: 180,
    thumbnail:
      'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: '5qap5aO4i9A',
    videoId: '5qap5aO4i9A',
    title: 'Lofi Hip Hop Radio — Beats to Sleep/Chill to',
    artist: 'Lofi Girl',
    duration: 210,
    thumbnail:
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'DWcJFNfaw90',
    videoId: 'DWcJFNfaw90',
    title: 'Synthetic Dreamscape (Ambient Immersion)',
    artist: 'GaneGan Soundlab',
    duration: 245,
    thumbnail:
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'kXYiU_JCYtU',
    videoId: 'kXYiU_JCYtU',
    title: 'Numb (Official Music Video)',
    artist: 'Linkin Park',
    duration: 187,
    thumbnail:
      'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400&auto=format&fit=crop&q=80',
  },
];

export default function Home() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Store state
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
    queue,
    activeClient,
    activeItag,
    codec,
    bufferedAheadSeconds,
    bufferedPercent,
    networkAdapterType,
    verdicts,
    error,

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
    setNetworkAdapterType,
    search,
    setQueue,
  } = usePlayerStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'queue' | 'search'>('queue');
  const [isPending, startTransition] = useTransition();

  // Initialize engine on mount with audio element ref
  useEffect(() => {
    if (audioRef.current) {
      initialize(audioRef.current);
    } else {
      initialize();
    }
    // Set initial preset queue
    setQueue(DEMO_PRESETS);
  }, [initialize, setQueue]);

  // Handle Search Execution
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setActiveTab('search');
    try {
      const results = await search(searchQuery.trim());
      setSearchResults(results.length > 0 ? results : DEMO_PRESETS);
    } catch (err) {
      console.error('Search failed, falling back to presets', err);
      setSearchResults(DEMO_PRESETS);
    } finally {
      setIsSearching(false);
    }
  };

  const isPlaying = playbackState === 'playing';
  const currentTrackData: TrackData | null = currentTrack
    ? toTrackData(currentTrack)
    : null;

  return (
    <OledBase grain className="flex min-h-screen flex-col pb-28">
      {/* Hidden headless HTMLMediaElement managed by ShakaMseAudioDriver */}
      <audio ref={audioRef} playsInline preload="auto" className="hidden" />

      {/* Dynamic Ambient Aura Backdrop */}
      <AmbientAura
        className="fixed inset-0 pointer-events-none -z-10"
        primaryColor={isPlaying ? '#9333ea' : '#3b82f6'}
        secondaryColor={isPlaying ? '#06b6d4' : '#6366f1'}
        tertiaryColor={isPlaying ? '#ec4899' : '#14b8a6'}
        intensity={isPlaying ? 0.45 : 0.25}
      />

      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/[0.08] bg-black/40 px-6 py-3.5 backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 shadow-md shadow-purple-900/30">
            <Radio size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
              GaneGan
              <span className="rounded-md border border-purple-500/30 bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-mono font-medium text-purple-300">
                Phase 1 Proof
              </span>
            </h1>
            <p className="text-[11px] text-neutral-400">
              Byte-range MSE Streaming & Zero-Install InnerTube
            </p>
          </div>
        </div>

        {/* Header Actions & Showcase Link */}
        <div className="flex items-center gap-3">
          <Link
            href="/dying"
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            <Sparkles size={14} className="text-purple-400" />
            <span>Dying Design System</span>
          </Link>

          {/* Network Adapter Switcher */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-black/50 p-1 text-xs">
            {(['dev-proxy', 'web-extension', 'native-http'] as NetworkAdapterType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setNetworkAdapterType(type)}
                className={`rounded px-2 py-0.5 font-mono text-[11px] transition-all ${
                  networkAdapterType === type
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {type === 'dev-proxy' ? 'Dev Proxy' : type === 'web-extension' ? 'Extension' : 'Native'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
        {/* Search Bar Section */}
        <section className="flex flex-col gap-3">
          <form onSubmit={handleSearch} className="relative flex w-full items-center">
            <div className="pointer-events-none absolute left-4 text-neutral-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search YouTube / YouTube Music catalog (e.g., Lofi Girl, Hans Zimmer, synthwave)..."
              className="h-13 w-full rounded-2xl border border-white/[0.1] bg-white/[0.04] pl-11 pr-28 text-sm text-white placeholder-neutral-500 shadow-inner backdrop-blur-xl transition-all focus:border-purple-500/50 focus:bg-white/[0.07] focus:outline-none focus:ring-1 focus:ring-purple-500/50"
            />
            <div className="absolute right-2 flex items-center gap-1">
              <SpringButton
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSearching}
                className="gap-1.5 px-4"
              >
                {isSearching ? (
                  <RefreshCw size={14} className="animate-spin text-white" />
                ) : (
                  <Zap size={14} />
                )}
                <span>Search</span>
              </SpringButton>
            </div>
          </form>

          {/* Quick preset chips */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
            <span className="font-mono text-[11px] text-neutral-500">Presets:</span>
            {['Lofi Hip Hop', 'Synthwave 80s', 'Classical Piano', 'ChilledCow'].map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => {
                  setSearchQuery(term);
                  search(term).then((res) => {
                    setSearchResults(res.length > 0 ? res : DEMO_PRESETS);
                    setActiveTab('search');
                  });
                }}
                className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-0.5 text-neutral-300 transition-colors hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
              >
                {term}
              </button>
            ))}
          </div>
        </section>

        {/* Error Banner */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-sm text-red-200 backdrop-blur-xl">
            <AlertTriangle size={18} className="text-red-400 shrink-0" />
            <div className="flex-1">
              <span className="font-semibold">Playback Notice: </span>
              {error}
            </div>
            <button
              onClick={() => playTrack(DEMO_PRESETS[0])}
              className="rounded-lg bg-red-900/60 px-3 py-1 text-xs font-medium text-white hover:bg-red-800"
            >
              Try Preset Fallback
            </button>
          </div>
        )}

        {/* 2-Column Responsive Layout: Tracks + Diagnostics */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left / Main Column: Active Hero + Tabs (Queue / Search) */}
          <div className="flex flex-col gap-6 lg:col-span-7">
            {/* Active Track Hero Card */}
            <GlassPanel variant="elevated" className="p-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Artwork with Live Soundwave overlay */}
                <div className="relative h-40 w-40 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 shadow-2xl">
                  {currentTrack?.thumbnail ? (
                    <img
                      src={currentTrack.thumbnail}
                      alt={currentTrack.title}
                      className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-white/[0.03] text-neutral-600 text-3xl font-mono">
                      ♪
                    </div>
                  )}

                  {/* Soundwave badge overlay */}
                  <div className="absolute bottom-2 right-2 rounded-lg bg-black/60 px-2 py-1 backdrop-blur-md border border-white/10">
                    <SoundWave isPlaying={isPlaying} size="sm" color="#a855f7" />
                  </div>
                </div>

                {/* Track details & hero controls */}
                <div className="flex flex-1 flex-col items-center sm:items-start text-center sm:text-left min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        isPlaying
                          ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                          : 'border border-neutral-700 bg-neutral-800/60 text-neutral-400'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'}`} />
                      {playbackState}
                    </span>
                    {activeClient && (
                      <span className="rounded-md border border-purple-500/30 bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-mono text-purple-300">
                        {activeClient}
                      </span>
                    )}
                  </div>

                  <h2 className="w-full truncate text-xl font-bold tracking-tight text-white sm:text-2xl">
                    {currentTrack ? currentTrack.title : 'Ready to Stream'}
                  </h2>
                  <p className="w-full truncate text-sm text-neutral-400">
                    {currentTrack ? currentTrack.artist : 'Select a track below or search above'}
                  </p>

                  {/* Quick scrubber preview */}
                  <div className="mt-4 w-full">
                    <ScrubSlider
                      size="sm"
                      min={0}
                      max={duration || 100}
                      value={currentTime}
                      buffered={bufferedPercent}
                      onValueCommit={(val) => seek(val)}
                      accentColor="#a855f7"
                      tooltipFormatter={(v) => {
                        const m = Math.floor(v / 60);
                        const s = Math.floor(v % 60);
                        return `${m}:${s < 10 ? '0' : ''}${s}`;
                      }}
                    />
                  </div>

                  {/* Primary hero buttons */}
                  <div className="mt-3 flex items-center gap-3">
                    <SpringButton
                      variant="primary"
                      size="md"
                      glow
                      onClick={() => togglePlay()}
                      className="gap-2 px-5"
                    >
                      <Play size={16} className={isPlaying ? 'fill-current' : ''} />
                      <span>{isPlaying ? 'Pause' : 'Play Now'}</span>
                    </SpringButton>
                    <SpringButton
                      variant="glass"
                      size="md"
                      onClick={() => next()}
                    >
                      Next Track
                    </SpringButton>
                  </div>
                </div>
              </div>
            </GlassPanel>

            {/* Track Listing Tabs (Queue / Search) */}
            <GlassPanel variant="default" className="flex flex-col overflow-hidden p-4">
              {/* Tab Selector */}
              <div className="mb-4 flex items-center justify-between border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('queue')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      activeTab === 'queue'
                        ? 'border border-white/20 bg-white/[0.1] text-white shadow-sm'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Play Queue ({queue.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('search')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      activeTab === 'search'
                        ? 'border border-white/20 bg-white/[0.1] text-white shadow-sm'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Search Results ({searchResults.length})
                  </button>
                </div>
                <span className="text-[11px] font-mono text-neutral-500">
                  Click track to stream
                </span>
              </div>

              {/* Rows List */}
              <div className="flex flex-col gap-1 overflow-y-auto max-h-[420px] pr-1">
                {activeTab === 'queue' ? (
                  queue.length === 0 ? (
                    <div className="py-12 text-center text-xs text-neutral-500">
                      Queue is empty. Select tracks from search to add.
                    </div>
                  ) : (
                    queue.map((track, idx) => {
                      const isRowActive = currentTrack?.videoId === track.videoId;
                      return (
                        <TrackRow
                          key={`${track.videoId}-${idx}`}
                          index={idx}
                          track={toTrackData(track)}
                          isActive={isRowActive}
                          isPlaying={isRowActive && isPlaying}
                          onPlay={() => playTrack(track)}
                          onPause={() => pause()}
                        />
                      );
                    })
                  )
                ) : searchResults.length === 0 ? (
                  <div className="py-12 text-center text-xs text-neutral-500">
                    No search results yet. Enter a query or select a preset tag.
                  </div>
                ) : (
                  searchResults.map((track, idx) => {
                    const isRowActive = currentTrack?.videoId === track.videoId;
                    return (
                      <TrackRow
                        key={`search-${track.videoId}-${idx}`}
                        index={idx}
                        track={toTrackData(track)}
                        isActive={isRowActive}
                        isPlaying={isRowActive && isPlaying}
                        onPlay={() => playTrack(track)}
                        onPause={() => pause()}
                      />
                    );
                  })
                )}
              </div>
            </GlassPanel>
          </div>

          {/* Right Column: Diagnostic Inspector */}
          <div className="flex flex-col gap-6 lg:col-span-5">
            <GlassPanel variant="heavy" className="p-5 flex flex-col gap-5 border-purple-500/20">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    <Activity size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Diagnostic Inspector</h3>
                    <p className="text-[10px] text-neutral-400">Core Engine Real-Time Telemetry</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-[10px] font-mono text-emerald-400">LIVE</span>
                </div>
              </div>

              {/* Inspector Metric Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Active Client */}
                <GlassCard interactive={false} className="p-3">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 block">
                    Active Client
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-base font-bold font-mono text-white">
                      {activeClient || 'VISIONOS'}
                    </span>
                    <span className="rounded bg-emerald-500/20 px-1 py-0.5 text-[9px] font-mono text-emerald-400">
                      RESOLVED
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400 mt-1 block">
                    Priority 1 InnerTube Client
                  </span>
                </GlassCard>

                {/* Stream itag */}
                <GlassCard interactive={false} className="p-3">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 block">
                    Resolved itag
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-base font-bold font-mono text-purple-400">
                      itag {activeItag || 251}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400 mt-1 block">
                    {codec || 'Opus 48kHz (160kbps)'}
                  </span>
                </GlassCard>

                {/* Buffer Lookahead */}
                <GlassCard interactive={false} className="p-3">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 block">
                    MSE Buffer Ahead
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-cyan-400">
                      {bufferedAheadSeconds.toFixed(1)}s
                    </span>
                    <span className="text-[10px] text-neutral-500">/ 30s target</span>
                  </div>
                  {/* Buffer Progress bar */}
                  <div className="mt-2 h-1.5 w-full rounded-full bg-neutral-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (bufferedAheadSeconds / 30) * 100)}%`,
                      }}
                    />
                  </div>
                </GlassCard>

                {/* Buffer Total Percent */}
                <GlassCard interactive={false} className="p-3">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 block">
                    Total Track Buffered
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-white">
                      {bufferedPercent.toFixed(1)}%
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400 mt-1 block">
                    Byte-range lookahead
                  </span>
                </GlassCard>
              </div>

              {/* Streaming Stack Architecture */}
              <div className="flex flex-col gap-2 rounded-xl border border-white/[0.08] bg-black/40 p-3.5">
                <span className="text-[10px] font-mono uppercase text-neutral-400">
                  Engine Pipeline Breakdown
                </span>
                <div className="flex flex-col gap-1.5 text-xs font-mono">
                  <div className="flex items-center justify-between text-neutral-300">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-400" />
                      Audio Driver
                    </span>
                    <span className="text-white">Shaka Player v5 (MSE)</span>
                  </div>

                  <div className="flex items-center justify-between text-neutral-300">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-400" />
                      Manifest Delivery
                    </span>
                    <span className="text-white">In-Memory Synthetic DASH MPD</span>
                  </div>

                  <div className="flex items-center justify-between text-neutral-300">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-400" />
                      Network Adapter
                    </span>
                    <span className="text-purple-300">
                      {networkAdapterType === 'dev-proxy'
                        ? 'DevProxyAdapter (/api/yt/*)'
                        : networkAdapterType === 'web-extension'
                        ? 'WebExtension Bridge'
                        : 'Native Http'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-neutral-300">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-400" />
                      Verdict Cache
                    </span>
                    <span className="text-emerald-400">10m bench auto-recovery</span>
                  </div>
                </div>
              </div>

              {/* Client Walk Priority Table */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-mono uppercase text-neutral-400">
                  Client Walk Priority & Status
                </span>
                <div className="space-y-1.5">
                  {[
                    { name: 'VISIONOS', itag: '251 (Opus)', status: 'Primary (Direct Audio)' },
                    { name: 'WEB_REMIX', itag: '251 / 140', status: 'Priority 2 Fallback' },
                    { name: 'WEB', itag: '251 / 140', status: 'Priority 3 Fallback' },
                    { name: 'MWEB', itag: '140 (AAC)', status: 'Priority 4 Mobile Fallback' },
                  ].map((c) => {
                    const isSelected = activeClient === c.name || (!activeClient && c.name === 'VISIONOS');
                    return (
                      <div
                        key={c.name}
                        className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-mono transition-all ${
                          isSelected
                            ? 'border border-purple-500/40 bg-purple-500/10 text-white'
                            : 'border border-white/[0.04] bg-white/[0.02] text-neutral-400'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              isSelected ? 'bg-purple-400' : 'bg-neutral-600'
                            }`}
                          />
                          <span className="font-semibold">{c.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-neutral-400">{c.itag}</span>
                          <span
                            className={`text-[10px] ${
                              isSelected ? 'text-purple-300 font-bold' : 'text-neutral-500'
                            }`}
                          >
                            {isSelected ? 'ACTIVE' : 'STANDBY'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </GlassPanel>
          </div>
        </div>
      </main>

      {/* Docked PlayerBar at bottom using dying primitives */}
      <div className="fixed inset-x-0 bottom-0 z-40">
        <PlayerBar
          currentTrack={currentTrackData}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          buffered={bufferedPercent}
          volume={volume}
          isMuted={isMuted}
          isShuffle={isShuffle}
          repeatMode={repeatMode}
          onPlayPause={() => togglePlay()}
          onPrevious={() => previous()}
          onNext={() => next()}
          onSeek={(seconds) => seek(seconds)}
          onVolumeChange={(val) => setVolume(val)}
          onMuteToggle={() => toggleMute()}
          onShuffleToggle={() => toggleShuffle()}
          onRepeatToggle={() => toggleRepeat()}
        />
      </div>
    </OledBase>
  );
}
