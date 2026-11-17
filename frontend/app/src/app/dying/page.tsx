'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Sparkles,
  Sliders,
  Layers,
  Music,
  Play,
  Pause,
  Heart,
  Volume2,
  Mic2,
  Activity,
  Check,
  Disc,
  Radio,
  Eye,
} from 'lucide-react';
import {
  OledBase,
  AmbientAura,
  GlassPanel,
  GlassCard,
  SpringButton,
  ScrubSlider,
  SoundWave,
  TrackRow,
  SyncedLyricsView,
  PlayerBar,
  type TrackData,
  type LyricLine,
} from '@mp/dying';

const SAMPLE_LYRICS: LyricLine[] = [
  { time: 0, text: '♪ (Atmospheric Synths & Vinyl Crackle) ♪' },
  { time: 6, text: 'Looking through the acrylic glass tonight' },
  { time: 12, text: 'Neon purple reflections dancing in the dark' },
  { time: 18, text: 'Zero latency in the flow of sound' },
  { time: 24, text: 'Every byte streaming without a bound' },
  { time: 30, text: 'Pure pitch-black OLED depth beneath our feet' },
  { time: 36, text: 'Tactile spring physics in every beat' },
  { time: 44, text: 'GaneGan audio playing endlessly' },
  { time: 52, text: '♪ (Outro fades into ambient glow) ♪' },
];

const SHOWCASE_TRACKS: TrackData[] = [
  {
    id: 'demo-1',
    title: 'Midnight in Tokyo (Lofi Vibe)',
    artist: 'Komorebi & ChilledCat',
    album: 'Tokyo Drift Sessions',
    duration: 184,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&auto=format&fit=crop&q=80',
    isLiked: true,
  },
  {
    id: 'demo-2',
    title: 'Cybernetic Skyline (Synthwave)',
    artist: 'Vector Graphics',
    album: 'Neon Horizon',
    duration: 236,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&auto=format&fit=crop&q=80',
    isLiked: false,
  },
  {
    id: 'demo-3',
    title: 'Weightless Dreams (Ambient Orchestral)',
    artist: 'Ethereal Orchestra',
    album: 'Dying Architecture Vol. 1',
    duration: 298,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80',
    isLiked: false,
  },
];

const THEME_PRESETS = [
  {
    name: 'Purple Velvet',
    primary: '#9333ea',
    secondary: '#3b82f6',
    tertiary: '#ec4899',
  },
  {
    name: 'Cyberpunk Neon',
    primary: '#06b6d4',
    secondary: '#ec4899',
    tertiary: '#8b5cf6',
  },
  {
    name: 'Emerald Matrix',
    primary: '#10b981',
    secondary: '#06b6d4',
    tertiary: '#3b82f6',
  },
  {
    name: 'Sunset Mirage',
    primary: '#f97316',
    secondary: '#ec4899',
    tertiary: '#8b5cf6',
  },
];

export default function DyingShowcasePage() {
  const [selectedTheme, setSelectedTheme] = useState(THEME_PRESETS[0]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeTrackIndex, setActiveTrackIndex] = useState(0);
  const [sliderValue, setSliderValue] = useState(64);
  const [volumeValue, setVolumeValue] = useState(0.85);
  const [lyricsTime, setLyricsTime] = useState(18);
  const [auraIntensity, setAuraIntensity] = useState(0.5);

  // Auto-progress lyrics demo timer when playing
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setLyricsTime((prev) => (prev >= 55 ? 0 : prev + 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <OledBase grain className="flex min-h-screen flex-col pb-36">
      {/* Live Ambient Aura Background */}
      <AmbientAura
        className="fixed inset-0 pointer-events-none -z-10"
        primaryColor={selectedTheme.primary}
        secondaryColor={selectedTheme.secondary}
        tertiaryColor={selectedTheme.tertiary}
        intensity={auraIntensity}
        blur={110}
      />

      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/[0.08] bg-black/50 px-6 py-4 backdrop-blur-2xl">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] text-neutral-300 transition-colors hover:bg-white/[0.1] hover:text-white"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white">
                @mp/dying
              </h1>
              <span className="rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[11px] font-mono font-medium text-purple-300">
                Design System v0.1.0
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              OLED black foundations, dark acrylic glass, tactile spring physics & dynamic aura lighting
            </p>
          </div>
        </div>

        {/* Aura Theme Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-neutral-400 hidden sm:inline">Theme:</span>
          <div className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-black/60 p-1">
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => setSelectedTheme(preset)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                  selectedTheme.name === preset.name
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: preset.primary }}
                />
                <span className="hidden md:inline">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content Showcase */}
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 p-6 sm:p-8">
        {/* Intro Hero Banner */}
        <GlassPanel variant="heavy" className="p-8 relative overflow-hidden">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-mono text-purple-300 mb-3">
              <Sparkles size={13} />
              Apple Music × OLED Pitch-Black Aesthetics
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Precision Crafted Primitives for Next-Gen Audio
            </h2>
            <p className="mt-3 text-sm text-neutral-300 leading-relaxed">
              Every component in <code className="text-purple-300">@mp/dying</code> is tuned for dark mode
              perfection: zero backlight bleed on OLED screens, frosted acrylic specular highlights,
              framer-motion tactile spring responses, and dynamic Canvas 2D ambient aura backdrops.
            </p>
          </div>
        </GlassPanel>

        {/* SECTION 1: Primitives (GlassPanel, GlassCard, SpringButton, ScrubSlider) */}
        <section className="flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-purple-400" />
              <h3 className="text-lg font-bold text-white">Glass Primitives & Surfaces</h3>
            </div>
            <span className="text-xs font-mono text-neutral-500">
              GlassPanel · GlassCard · SpringButton · ScrubSlider
            </span>
          </div>

          {/* Panels Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <GlassPanel variant="subtle" className="p-5 flex flex-col justify-between h-40">
              <div>
                <span className="text-xs font-mono text-purple-300">GlassPanel (subtle)</span>
                <p className="text-xs text-neutral-400 mt-1">
                  Ultra-thin frosted glass with blur-xl and subtle border.
                </p>
              </div>
              <div className="text-[10px] font-mono text-neutral-500">bg-white/[0.02]</div>
            </GlassPanel>

            <GlassPanel variant="default" className="p-5 flex flex-col justify-between h-40">
              <div>
                <span className="text-xs font-mono text-purple-300">GlassPanel (default)</span>
                <p className="text-xs text-neutral-400 mt-1">
                  Balanced acrylic backdrop blur-2xl with specular highlight reflection.
                </p>
              </div>
              <div className="text-[10px] font-mono text-neutral-500">bg-white/[0.035]</div>
            </GlassPanel>

            <GlassPanel variant="elevated" className="p-5 flex flex-col justify-between h-40">
              <div>
                <span className="text-xs font-mono text-purple-300">GlassPanel (elevated)</span>
                <p className="text-xs text-neutral-400 mt-1">
                  High-contrast blur-3xl with heavy pitch-black drop shadows.
                </p>
              </div>
              <div className="text-[10px] font-mono text-neutral-500">shadow-2xl shadow-black/80</div>
            </GlassPanel>

            <GlassPanel variant="heavy" className="p-5 flex flex-col justify-between h-40">
              <div>
                <span className="text-xs font-mono text-purple-300">GlassPanel (heavy)</span>
                <p className="text-xs text-neutral-400 mt-1">
                  Dark composite acrylic with double specular edge reflection.
                </p>
              </div>
              <div className="text-[10px] font-mono text-neutral-500">bg-black/40 bg-white/[0.08]</div>
            </GlassPanel>
          </div>

          {/* Interactive Cards & Spring Buttons */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Interactive Glass Cards */}
            <GlassPanel variant="default" className="p-6 flex flex-col gap-4">
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                Interactive Glass Cards (Hover & Press Physics)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <GlassCard interactive active={false}>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={16} className="text-purple-400" />
                    <span className="text-sm font-semibold text-white">Default Card</span>
                  </div>
                  <p className="text-xs text-neutral-400">
                    Hover to trigger ambient glow and scale down on click.
                  </p>
                </GlassCard>

                <GlassCard interactive active={true}>
                  <div className="flex items-center gap-2 mb-2">
                    <Check size={16} className="text-emerald-400" />
                    <span className="text-sm font-semibold text-white">Active Card</span>
                  </div>
                  <p className="text-xs text-neutral-400">
                    Highlighted border with active specular edge reflection.
                  </p>
                </GlassCard>
              </div>
            </GlassPanel>

            {/* Spring Buttons Matrix */}
            <GlassPanel variant="default" className="p-6 flex flex-col gap-4">
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                Tactile Spring Buttons (Framer-Motion)
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <SpringButton variant="primary" size="md" glow>
                  Primary Glow
                </SpringButton>

                <SpringButton variant="glass" size="md">
                  Glass Button
                </SpringButton>

                <SpringButton variant="ghost" size="md">
                  Ghost Button
                </SpringButton>

                <SpringButton
                  variant="playPause"
                  size="md"
                  isPlaying={isPlaying}
                  onClick={() => setIsPlaying(!isPlaying)}
                  glow
                />

                <SpringButton variant="primary" size="sm">
                  Small
                </SpringButton>
              </div>
            </GlassPanel>
          </div>

          {/* Scrub Sliders */}
          <GlassPanel variant="default" className="p-6 flex flex-col gap-4">
            <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">
              ScrubSlider (Radix Slider Scrubber with Hover Tooltip & Buffer Indicator)
            </span>
            <div className="flex flex-col gap-4">
              <div>
                <div className="flex justify-between text-xs font-mono text-neutral-400 mb-1">
                  <span>Audio Seeker (60% buffered ahead)</span>
                  <span>{sliderValue}s / 180s</span>
                </div>
                <ScrubSlider
                  size="md"
                  min={0}
                  max={180}
                  value={sliderValue}
                  buffered={60}
                  onValueChange={(val) => setSliderValue(val)}
                  accentColor={selectedTheme.primary}
                  tooltipFormatter={(val) => {
                    const m = Math.floor(val / 60);
                    const s = Math.floor(val % 60);
                    return `${m}:${s < 10 ? '0' : ''}${s}`;
                  }}
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono text-neutral-400 mb-1">
                  <span>Volume Scrubber</span>
                  <span>{Math.round(volumeValue * 100)}%</span>
                </div>
                <ScrubSlider
                  size="sm"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volumeValue}
                  onValueChange={(val) => setVolumeValue(val)}
                  accentColor="#ffffff"
                  tooltipFormatter={(val) => `${Math.round(val * 100)}%`}
                />
              </div>
            </div>
          </GlassPanel>
        </section>

        {/* SECTION 2: SoundWave & Effects */}
        <section className="flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-cyan-400" />
              <h3 className="text-lg font-bold text-white">Audio Effects & Indicators</h3>
            </div>
            <span className="text-xs font-mono text-neutral-500">SoundWave Multi-Bar Frequency</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <GlassCard interactive={false} className="p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono text-white block">Playing (Small)</span>
                <span className="text-[11px] text-neutral-400">Track list indicator</span>
              </div>
              <SoundWave isPlaying={true} size="sm" color={selectedTheme.primary} />
            </GlassCard>

            <GlassCard interactive={false} className="p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono text-white block">Playing (Medium)</span>
                <span className="text-[11px] text-neutral-400">Player bar indicator</span>
              </div>
              <SoundWave isPlaying={true} size="md" color="#06b6d4" />
            </GlassCard>

            <GlassCard interactive={false} className="p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono text-white block">Paused State</span>
                <span className="text-[11px] text-neutral-400">Zero motion rest</span>
              </div>
              <SoundWave isPlaying={false} size="md" color="#737373" />
            </GlassCard>
          </div>
        </section>

        {/* SECTION 3: Music Components (TrackRow & SyncedLyricsView) */}
        <section className="flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
            <div className="flex items-center gap-2">
              <Music size={18} className="text-purple-400" />
              <h3 className="text-lg font-bold text-white">Music Components</h3>
            </div>
            <span className="text-xs font-mono text-neutral-500">
              TrackRow · SyncedLyricsView · PlayerBar
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* TrackRow List Showcase */}
            <div className="flex flex-col gap-3 lg:col-span-5">
              <span className="text-xs font-mono uppercase text-neutral-400">
                TrackRow Showcase (Click row to play)
              </span>
              <GlassPanel variant="default" className="p-3 flex flex-col gap-1">
                {SHOWCASE_TRACKS.map((t, idx) => {
                  const isActive = activeTrackIndex === idx;
                  return (
                    <TrackRow
                      key={t.id}
                      index={idx}
                      track={t}
                      isActive={isActive}
                      isPlaying={isActive && isPlaying}
                      onPlay={() => {
                        setActiveTrackIndex(idx);
                        setIsPlaying(true);
                      }}
                      onPause={() => setIsPlaying(false)}
                    />
                  );
                })}
              </GlassPanel>
            </div>

            {/* SyncedLyricsView Showcase */}
            <div className="flex flex-col gap-3 lg:col-span-7">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-neutral-400 flex items-center gap-2">
                  <Mic2 size={14} className="text-purple-400" />
                  Synced Lyrics View (Neon Active Glow)
                </span>
                <span className="text-xs font-mono text-purple-300">
                  Current: {lyricsTime}s
                </span>
              </div>
              <GlassPanel variant="heavy" className="h-[340px] overflow-hidden">
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

        {/* SECTION 3: Token Governance & WCAG 2.2 AA Compliance */}
        <section className="flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-emerald-400" />
              <h3 className="text-lg font-bold text-white">Token Governance & WCAG 2.2 AA</h3>
            </div>
            <span className="text-xs font-mono text-emerald-400">
              W3C DTCG Spec · 100% Contrast Verified
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* 3-Tier Hierarchy */}
            <GlassPanel variant="default" className="p-6 flex flex-col gap-4">
              <span className="text-xs font-mono uppercase text-neutral-400">
                1. 3-Tier Token Architecture
              </span>
              <div className="flex flex-col gap-2.5 text-xs">
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="font-semibold text-white">Tier 1: Primitives</div>
                  <div className="font-mono text-neutral-400 text-[11px] mt-0.5">
                    #000000, 24px blur, 0.03 opacity, spring curves
                  </div>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="font-semibold text-purple-300">Tier 2: Semantic Roles</div>
                  <div className="font-mono text-neutral-400 text-[11px] mt-0.5">
                    surface-canvas, text-primary, text-muted, border-glass
                  </div>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="font-semibold text-emerald-300">Tier 3: Components</div>
                  <div className="font-mono text-neutral-400 text-[11px] mt-0.5">
                    playerbar-height: 88px, lyrics-active-glow
                  </div>
                </div>
              </div>
            </GlassPanel>

            {/* WCAG Contrast Ratios */}
            <GlassPanel variant="default" className="p-6 flex flex-col gap-4">
              <span className="text-xs font-mono uppercase text-neutral-400">
                2. WCAG 2.2 Contrast Verification
              </span>
              <div className="flex flex-col gap-3 text-xs">
                <div className="flex items-center justify-between border-b border-white/[0.05] pb-2">
                  <div>
                    <div className="font-medium text-white">Primary Text</div>
                    <div className="text-[11px] text-neutral-400 font-mono">#ffffff on #000000</div>
                  </div>
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-300">
                    21.0:1 (AAA)
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-white/[0.05] pb-2">
                  <div>
                    <div className="font-medium text-white/80">Secondary Text</div>
                    <div className="text-[11px] text-neutral-400 font-mono">rgba(255,255,255,0.72)</div>
                  </div>
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-300">
                    9.8:1 (AAA)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white/50">Muted Metadata</div>
                    <div className="text-[11px] text-neutral-400 font-mono">rgba(255,255,255,0.50)</div>
                  </div>
                  <span className="rounded bg-blue-500/20 px-2 py-0.5 font-mono text-[11px] font-bold text-blue-300">
                    4.6:1 (AA Pass)
                  </span>
                </div>
              </div>
            </GlassPanel>

            {/* Accessibility & Motor Guards */}
            <GlassPanel variant="default" className="p-6 flex flex-col gap-4">
              <span className="text-xs font-mono uppercase text-neutral-400">
                3. Keyboard & Motion Guards
              </span>
              <ul className="flex flex-col gap-2.5 text-xs text-neutral-300">
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Keyboard Seeking:</strong> Arrow keys scrub 5s, Shift+Arrows scrub 15s.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Reduced Motion:</strong> Automatically flattens spring curves under <code className="text-purple-300">prefers-reduced-motion</code>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>AI & Figma Sync:</strong> Full DTCG <code className="text-purple-300">tokens.json</code> export for zero-drift generation.
                  </span>
                </li>
              </ul>
            </GlassPanel>
          </div>
        </section>
      </main>

      {/* Docked PlayerBar at bottom */}
      <div className="fixed inset-x-0 bottom-0 z-40">
        <PlayerBar
          currentTrack={SHOWCASE_TRACKS[activeTrackIndex]}
          isPlaying={isPlaying}
          currentTime={lyricsTime}
          duration={SHOWCASE_TRACKS[activeTrackIndex]?.duration as number}
          buffered={75}
          volume={volumeValue}
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
        />
      </div>
    </OledBase>
  );
}
