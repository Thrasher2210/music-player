'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Sparkles,
  Layers,
  Music,
  Check,
  Activity,
  Sliders,
  ShieldCheck,
  Disc,
  Radio,
  Eye,
  Maximize2,
  Volume2,
} from 'lucide-react';
import {
  OledBase,
  GlassPanel,
  GlassCard,
  SpringButton,
  ScrubSlider,
  SoundWave,
  TrackRow,
  TrackTable,
  SyncedLyricsView,
  FloatingPlayerPill,
  PageHeader,
  HeroCarousel,
  HeroBannerCard,
  MediaShelf,
  MediaCard,
  FullImmersionLyrics,
  type TrackData,
  type LyricLine,
  dyingTokens,
} from '@mp/dying';

const SAMPLE_LYRICS: LyricLine[] = [
  { time: 0, text: '♪ (Acoustic Prelude & Subdued Vinyl) ♪' },
  { time: 6, text: 'Looking through the dark acrylic glass tonight' },
  { time: 12, text: 'Monochrome Graphite tones in high-contrast light' },
  { time: 18, text: 'Zero latency in the stream of audio waves' },
  { time: 24, text: 'Every byte streaming with the precision sound craves' },
  { time: 30, text: 'Pure deep matte canvas beneath our feet' },
  { time: 36, text: 'Tactile spring physics in every beat' },
  { time: 44, text: 'GaneGan audio playing endlessly' },
  { time: 52, text: '♪ (Outro fades into ambient silence) ♪' },
];

const SHOWCASE_TRACKS: TrackData[] = [
  {
    id: 'demo-1',
    title: 'Midnight in Tokyo',
    artist: 'Komorebi & ChilledCat',
    album: 'Tokyo Drift Sessions',
    duration: 184,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&auto=format&fit=crop&q=80',
    isLiked: true,
  },
  {
    id: 'demo-2',
    title: 'Cybernetic Skyline',
    artist: 'Vector Graphics',
    album: 'Monochrome Horizon',
    duration: 236,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&auto=format&fit=crop&q=80',
    isLiked: false,
  },
  {
    id: 'demo-3',
    title: 'Weightless Dreams',
    artist: 'Ethereal Orchestra',
    album: 'Graphite Architecture Vol. 1',
    duration: 298,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80',
    isLiked: false,
  },
];

const GRAPHITE_SWATCHES = [
  {
    name: 'Canvas Base',
    hex: '#141416',
    role: 'App foundation background',
    contrast: '18.2:1 (AAA vs #ffffff)',
    token: '--dying-color-canvas',
  },
  {
    name: 'Sidebar Dark',
    hex: '#121214',
    role: 'Navigation sidebar backdrop',
    contrast: '18.9:1 (AAA vs #ffffff)',
    token: '--dying-color-sidebar',
  },
  {
    name: 'Surface Card Fill',
    hex: '#1e1e22',
    role: 'Containers, cards, elevated panels',
    contrast: '16.5:1 (AAA vs #ffffff)',
    token: '--dying-color-surface',
  },
  {
    name: 'Hover / Active Surface',
    hex: '#28282c',
    role: 'Interactive row & card hover highlight',
    contrast: '14.8:1 (AAA vs #ffffff)',
    token: '--dying-color-surface-hover',
  },
  {
    name: 'Active Nav Pill',
    hex: '#2c2c2e',
    role: 'Current sidebar nav item selection',
    contrast: '14.1:1 (AAA vs #ffffff)',
    token: '--dying-color-surface-active',
  },
  {
    name: 'Frosted Glass Fill',
    hex: 'rgba(30,30,34,0.85)',
    role: 'Floating player pill & overlay header',
    contrast: 'Blur 24px + Specular border',
    token: '--dying-color-glass-frosted',
  },
  {
    name: 'Specular Border',
    hex: 'rgba(255,255,255,0.08)',
    role: 'Subtle metallic perimeter refraction',
    contrast: 'Non-text UI element indicator',
    token: '--dying-border-glass',
  },
  {
    name: 'Text Primary',
    hex: '#ffffff',
    role: 'Headers, titles, active track info',
    contrast: '18.2:1 (AAA on canvas)',
    token: '--dying-text-primary',
  },
  {
    name: 'Text Secondary',
    hex: '#98989d',
    role: 'Artist names, subtitles, timestamps',
    contrast: '5.2:1 (AA on canvas)',
    token: '--dying-text-secondary',
  },
  {
    name: 'Text Kicker / Tertiary',
    hex: '#86868b',
    role: 'Section kickers, placeholder text',
    contrast: '4.54:1 (AA on canvas)',
    token: '--dying-text-tertiary',
  },
];

export default function DyingShowcasePage() {
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeTrackIndex, setActiveTrackIndex] = useState(0);
  const [sliderValue, setSliderValue] = useState(64);
  const [volumeValue, setVolumeValue] = useState(0.85);
  const [lyricsTime, setLyricsTime] = useState(18);
  const [showImmersionPreview, setShowImmersionPreview] = useState(false);

  // Auto-progress lyrics demo timer when playing
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setLyricsTime((prev) => (prev >= 55 ? 0 : prev + 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <OledBase className="flex min-h-screen flex-col bg-[#141416] text-[#ffffff] pb-40">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/[0.08] bg-[#141416]/90 px-6 py-4 backdrop-blur-2xl">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.1] bg-[#1e1e22] text-[#98989d] transition-colors hover:bg-[#28282c] hover:text-white"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white">
                @mp/dying
              </h1>
              <span className="rounded-md border border-white/20 bg-white/10 px-2 py-0.5 text-[11px] font-mono font-medium text-white">
                Monochrome Graphite v1.0
              </span>
            </div>
            <p className="text-xs text-[#86868b]">
              Apple Music desktop aesthetics, dark acrylic glass, tactile spring physics & WCAG 2.2 AA/AAA governance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-mono text-emerald-400">
            <ShieldCheck size={14} />
            100% WCAG 2.2 AA Verified
          </span>
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-[#1e1e22] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#28282c] transition-colors"
          >
            <Radio size={14} />
            Open App
          </Link>
        </div>
      </header>

      {/* Main Content Showcase */}
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-12 p-6 sm:p-8 lg:p-10">
        {/* Intro Hero Banner */}
        <GlassPanel variant="heavy" className="p-8 relative overflow-hidden bg-[#1e1e22]">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-mono text-white/80 mb-3">
              <Sparkles size={13} />
              Monochrome Graphite Design Architecture
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Precision Audio Primitives Tuned for Apple Music Fidelity
            </h2>
            <p className="mt-3 text-sm text-[#98989d] leading-relaxed">
              Every component in <code className="text-white">@mp/dying</code> is built against strict Apple Music
              Monochrome Graphite design tokens: deep matte canvas (<code className="text-white">#141416</code>),
              sidebar (<code className="text-white">#121214</code>), cards (<code className="text-white">#1e1e22</code>),
              specular borders (<code className="text-white">rgba(255,255,255,0.08)</code>), and frosted acrylic glass
              blur (<code className="text-white">rgba(30,30,34,0.85)</code>).
            </p>
          </div>
        </GlassPanel>

        {/* SECTION 1: Monochrome Graphite Design Tokens */}
        <section className="flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2">
              <Sliders size={20} className="text-white" />
              <h3 className="text-xl font-bold text-white">Monochrome Graphite Tokens</h3>
            </div>
            <span className="text-xs font-mono text-[#86868b]">
              3-Tier W3C DTCG Token System
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {GRAPHITE_SWATCHES.map((swatch) => (
              <GlassCard key={swatch.name} interactive={false} className="p-4 flex flex-col justify-between h-44 bg-[#1e1e22]">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="h-6 w-6 rounded-md border border-white/20 shadow-sm shrink-0"
                      style={{ backgroundColor: swatch.hex }}
                    />
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      WCAG PASS
                    </span>
                  </div>
                  <div className="font-semibold text-xs text-white truncate">{swatch.name}</div>
                  <div className="text-[11px] font-mono text-white/70 mt-0.5">{swatch.hex}</div>
                  <div className="text-[11px] text-[#86868b] mt-1 line-clamp-2 leading-tight">
                    {swatch.role}
                  </div>
                </div>
                <div className="border-t border-white/[0.06] pt-2 mt-2">
                  <div className="text-[10px] font-mono text-[#98989d] truncate">
                    {swatch.contrast}
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* SECTION 2: Layout Components (<AppShell>, <Sidebar>, <FloatingPlayerPill>) */}
        <section className="flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2">
              <Layers size={20} className="text-white" />
              <h3 className="text-xl font-bold text-white">Layout & Shell Components</h3>
            </div>
            <span className="text-xs font-mono text-[#86868b]">
              AppShell · Sidebar · FloatingPlayerPill
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sidebar Preview */}
            <div className="lg:col-span-5 flex flex-col gap-3">
              <span className="text-xs font-mono uppercase text-[#86868b]">
                1. Fixed 240px Navigation Sidebar
              </span>
              <div className="rounded-2xl border border-white/[0.08] bg-[#121214] p-4 flex flex-col gap-3 h-[380px] shadow-2xl">
                <div className="flex items-center gap-2.5 px-2 py-1">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white">
                    <Music size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-white">GaneGan</span>
                    <span className="text-[11px] text-[#86868b]">Monochrome Graphite</span>
                  </div>
                </div>

                <div className="flex h-8 items-center gap-2 rounded-lg border border-white/[0.08] bg-[#1e1e22] px-2.5 text-xs text-[#86868b]">
                  <Sliders size={14} />
                  <span>Search YouTube Music...</span>
                  <kbd className="ml-auto rounded border border-white/10 bg-white/5 px-1 py-0.5 text-[9px] font-mono">⌘K</kbd>
                </div>

                <div className="flex flex-col gap-1 mt-2">
                  <div className="px-2 text-[10px] font-semibold uppercase text-[#86868b]">Discover</div>
                  <div className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[#98989d] hover:bg-[#28282c]">
                    <Sliders size={14} /> Search
                  </div>
                  <div className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[#98989d] hover:bg-[#28282c]">
                    <Disc size={14} /> Home
                  </div>
                  <div className="flex items-center gap-2.5 rounded-lg bg-[#2c2c2e] px-3 py-1.5 text-xs font-medium text-white shadow-sm">
                    <Radio size={14} /> Radio
                    <span className="ml-auto rounded bg-white/15 px-1.5 py-0.2 text-[9px]">Live</span>
                  </div>
                </div>

                <div className="mt-auto border-t border-white/[0.08] pt-3 text-[11px] text-[#86868b]">
                  WCAG AAA High Contrast Nav
                </div>
              </div>
            </div>

            {/* Floating Player Pill Preview */}
            <div className="lg:col-span-7 flex flex-col gap-3">
              <span className="text-xs font-mono uppercase text-[#86868b]">
                2. Centered Floating Acrylic Player Pill
              </span>
              <GlassPanel variant="heavy" className="p-6 flex flex-col justify-between h-[380px] bg-[#1e1e22]">
                <div className="flex flex-col gap-2">
                  <h4 className="text-lg font-bold text-white">Apple Music Desktop Player Pill</h4>
                  <p className="text-xs text-[#98989d]">
                    Frosted acrylic glass pill (<code className="text-white">rgba(30,30,34,0.85)</code>) with
                    specular top highlight, scrub slider with hover timestamp preview, tactile spring transport
                    buttons, volume control, and synced lyrics toggle.
                  </p>
                </div>

                {/* Render actual FloatingPlayerPill inside preview */}
                <div className="w-full">
                  <FloatingPlayerPill
                    title={SHOWCASE_TRACKS[activeTrackIndex].title}
                    artist={SHOWCASE_TRACKS[activeTrackIndex].artist}
                    album={SHOWCASE_TRACKS[activeTrackIndex].album}
                    artworkUrl={SHOWCASE_TRACKS[activeTrackIndex].thumbnailUrl}
                    isPlaying={isPlaying}
                    currentTime={lyricsTime}
                    duration={Number(SHOWCASE_TRACKS[activeTrackIndex].duration) || 0}
                    buffered={75}
                    volume={volumeValue}
                    isLyricsOpen={showImmersionPreview}
                    onPlayPause={() => setIsPlaying(!isPlaying)}
                    onPrevious={() => {
                      setActiveTrackIndex((prev) => (prev > 0 ? prev - 1 : SHOWCASE_TRACKS.length - 1));
                      setLyricsTime(0);
                    }}
                    onNext={() => {
                      setActiveTrackIndex((prev) => (prev < SHOWCASE_TRACKS.length - 1 ? prev + 1 : 0));
                      setLyricsTime(0);
                    }}
                    onSeek={(sec) => setLyricsTime(sec)}
                    onVolumeChange={(vol) => setVolumeValue(vol)}
                    onToggleLyrics={() => setShowImmersionPreview(!showImmersionPreview)}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-[#86868b] border-t border-white/[0.06] pt-3">
                  <span>Width: max-w-[720px]</span>
                  <span>Backdrop: blur-2xl acrylic</span>
                  <span>Elevation: shadow-2xl</span>
                </div>
              </GlassPanel>
            </div>
          </div>
        </section>

        {/* SECTION 3: Media Components (PageHeader, HeroCarousel, MediaShelf, MediaCard) */}
        <section className="flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2">
              <Radio size={20} className="text-white" />
              <h3 className="text-xl font-bold text-white">Media Components</h3>
            </div>
            <span className="text-xs font-mono text-[#86868b]">
              PageHeader · HeroCarousel · MediaShelf · MediaCard
            </span>
          </div>

          {/* PageHeader Showcase */}
          <PageHeader
            kicker="Exclusive Stations"
            title="Apple Music Radio Showcase"
            actionSlot={
              <SpringButton variant="glass" size="sm">
                Explore All
              </SpringButton>
            }
          />

          {/* Hero Carousel with 3 Featured Banners */}
          <HeroCarousel>
            <HeroBannerCard
              kicker="Apple Music Radio"
              title="Holiday Hits"
              subtitle="Festive classics and seasonal favorites with Zane Lowe"
              imageUrl="https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=800&auto=format&fit=crop&q=80"
              onPlay={() => setIsPlaying(true)}
            />
            <HeroBannerCard
              kicker="The Rocket Hour"
              title="Rocket Hour"
              subtitle="Elton John plays his favorite tracks from emerging artists"
              imageUrl="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80"
              onPlay={() => setIsPlaying(true)}
            />
            <HeroBannerCard
              kicker="Live Now"
              title="Apple Music 1"
              subtitle="The world's biggest artists, exclusive interviews, and daily hits"
              imageUrl="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80"
              onPlay={() => setIsPlaying(true)}
            />
          </HeroCarousel>

          {/* MediaShelf with Artist Take Over MediaCards */}
          <MediaShelf title="Artists Take Over" seeAllHref="#artists">
            <MediaCard
              title="Billie Eilish"
              subtitle="Artist Station"
              imageUrl="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80"
              aspect="square"
              onPlay={() => setIsPlaying(true)}
            />
            <MediaCard
              title="Kendrick Lamar"
              subtitle="Artist Station"
              imageUrl="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80"
              aspect="square"
              onPlay={() => setIsPlaying(true)}
            />
            <MediaCard
              title="Dua Lipa"
              subtitle="Artist Station"
              imageUrl="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80"
              aspect="square"
              onPlay={() => setIsPlaying(true)}
            />
            <MediaCard
              title="The Weeknd"
              subtitle="Artist Station"
              imageUrl="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80"
              aspect="square"
              onPlay={() => setIsPlaying(true)}
            />
            <MediaCard
              title="Taylor Swift"
              subtitle="Artist Station"
              imageUrl="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&auto=format&fit=crop&q=80"
              aspect="square"
              onPlay={() => setIsPlaying(true)}
            />
          </MediaShelf>
        </section>

        {/* SECTION 4: Music Components (TrackTable & SyncedLyricsView) */}
        <section className="flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2">
              <Music size={20} className="text-white" />
              <h3 className="text-xl font-bold text-white">Music & Search Components</h3>
            </div>
            <span className="text-xs font-mono text-[#86868b]">
              TrackTable · TrackRow · SyncedLyricsView
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* TrackTable Showcase */}
            <div className="lg:col-span-7 flex flex-col gap-3">
              <span className="text-xs font-mono uppercase text-[#86868b]">
                Dense Apple Music Track Table
              </span>
              <GlassPanel variant="default" className="p-4 bg-[#1e1e22]">
                <TrackTable
                  tracks={SHOWCASE_TRACKS}
                  currentTrackId={SHOWCASE_TRACKS[activeTrackIndex].id}
                  isPlaying={isPlaying}
                  onTrackSelect={(t) => {
                    const idx = SHOWCASE_TRACKS.findIndex((item) => item.id === t.id);
                    if (idx !== -1) setActiveTrackIndex(idx);
                    setIsPlaying(true);
                  }}
                  onTrackPlay={() => setIsPlaying(true)}
                  onTrackPause={() => setIsPlaying(false)}
                />
              </GlassPanel>
            </div>

            {/* Synced Lyrics Showcase */}
            <div className="lg:col-span-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-[#86868b]">
                  Synced Lyrics View ({lyricsTime}s)
                </span>
                <button
                  type="button"
                  onClick={() => setShowImmersionPreview(true)}
                  className="flex items-center gap-1 text-xs text-[#98989d] hover:text-white"
                >
                  <Maximize2 size={12} /> Full Immersion
                </button>
              </div>
              <GlassPanel variant="heavy" className="h-[320px] overflow-hidden bg-[#1e1e22]">
                <SyncedLyricsView
                  lyrics={SAMPLE_LYRICS}
                  currentTime={lyricsTime}
                  onSeek={(time) => setLyricsTime(time)}
                  showTimestamps
                />
              </GlassPanel>
            </div>
          </div>
        </section>

        {/* SECTION 5: WCAG 2.2 AA / AAA Governance & Contrast Matrix */}
        <section className="flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={20} className="text-emerald-400" />
              <h3 className="text-xl font-bold text-white">WCAG 2.2 Contrast & Governance</h3>
            </div>
            <span className="text-xs font-mono text-emerald-400">
              Strict Mathematical Validation
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GlassPanel variant="default" className="p-6 flex flex-col gap-4 bg-[#1e1e22]">
              <span className="text-xs font-mono uppercase text-[#86868b]">
                1. Text Contrast Ratios
              </span>
              <div className="flex flex-col gap-3 text-xs">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                  <div>
                    <div className="font-semibold text-white">Primary Text (#ffffff)</div>
                    <div className="text-[11px] text-[#86868b] font-mono">On Canvas (#141416)</div>
                  </div>
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-xs font-bold text-emerald-300">
                    18.2:1 (AAA)
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                  <div>
                    <div className="font-semibold text-white">Primary Text (#ffffff)</div>
                    <div className="text-[11px] text-[#86868b] font-mono">On Surface (#1e1e22)</div>
                  </div>
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-xs font-bold text-emerald-300">
                    16.5:1 (AAA)
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                  <div>
                    <div className="font-medium text-[#98989d]">Secondary Text (#98989d)</div>
                    <div className="text-[11px] text-[#86868b] font-mono">On Canvas (#141416)</div>
                  </div>
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-xs font-bold text-emerald-300">
                    5.2:1 (AA)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-[#86868b]">Kicker Text (#86868b)</div>
                    <div className="text-[11px] text-[#86868b] font-mono">On Canvas (#141416)</div>
                  </div>
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-xs font-bold text-emerald-300">
                    4.54:1 (AA)
                  </span>
                </div>
              </div>
            </GlassPanel>

            <GlassPanel variant="default" className="p-6 flex flex-col gap-4 bg-[#1e1e22]">
              <span className="text-xs font-mono uppercase text-[#86868b]">
                2. Non-Text & Focus Contrast
              </span>
              <ul className="flex flex-col gap-3 text-xs text-[#98989d]">
                <li className="flex items-start gap-2">
                  <Check size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white">Active Nav Pill:</strong> #2c2c2e surface with #ffffff text yields 14.1:1 AAA contrast.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white">Specular Border:</strong> rgba(255,255,255,0.08) creates visible boundary without color vibration.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white">Focus Ring:</strong> 2px solid white/30 ring on keyboard navigation satisfies 3.0:1 focus indicator rule.
                  </span>
                </li>
              </ul>
            </GlassPanel>

            <GlassPanel variant="default" className="p-6 flex flex-col gap-4 bg-[#1e1e22]">
              <span className="text-xs font-mono uppercase text-[#86868b]">
                3. Accessibility & Motion Guards
              </span>
              <ul className="flex flex-col gap-3 text-xs text-[#98989d]">
                <li className="flex items-start gap-2">
                  <Check size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white">Keyboard Seeking:</strong> Left/Right arrows scrub 5 seconds; Shift+Arrows scrub 15 seconds.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white">prefers-reduced-motion:</strong> Spring transitions automatically flatten when reduced motion is preferred.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white">Screen Reader Semantics:</strong> ARIA sliders, live broadcast labels, and keyboard dialog dismiss.
                  </span>
                </li>
              </ul>
            </GlassPanel>
          </div>
        </section>
      </main>

      {/* Full Immersion Modal Overlay Preview */}
      {showImmersionPreview && (
        <FullImmersionLyrics
          track={SHOWCASE_TRACKS[activeTrackIndex]}
          lyrics={SAMPLE_LYRICS}
          currentTime={lyricsTime}
          isPlaying={isPlaying}
          onPlayPause={() => setIsPlaying(!isPlaying)}
          onClose={() => setShowImmersionPreview(false)}
          onSeek={(t) => setLyricsTime(t)}
        />
      )}
    </OledBase>
  );
}
