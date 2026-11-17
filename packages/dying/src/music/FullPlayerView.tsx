import React, { useState, useEffect } from "react";
import { Dialog as RadixDialog, VisuallyHidden as RadixVisuallyHidden } from "radix-ui";
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Radio,
  Music2,
  Trash2,
  ListPlus,
  Heart,
  Disc,
} from "lucide-react";
import { TrackData } from "./TrackRow";
import { SyncedLyricsView, LyricLine } from "./SyncedLyricsView";
import { AmbientAura } from "../effects/AmbientAura";
import { SoundWave } from "../effects/SoundWave";
import { ScrubSlider } from "../primitives/ScrubSlider";
import { Switch } from "../components/Controls";
import { EmptyState } from "../components/Feedback";
import { cn } from "../utils/cn";

export type FullPlayerTab = "upNext" | "lyrics" | "related";

export interface RelatedItem {
  id: string;
  title: string;
  subtitle?: string;
  type?: "song" | "album" | "playlist" | "artist";
  thumbnail?: string;
  thumbnailUrl?: string;
  videoId?: string;
  browseId?: string;
}

export interface FullPlayerViewProps {
  track: TrackData | null;
  isPlaying?: boolean;
  currentTime?: number;
  duration?: number;
  onPlayPause?: () => void;
  onSeek?: (time: number) => void;
  onClose: () => void;
  activeTab?: FullPlayerTab;
  onTabChange?: (tab: FullPlayerTab) => void;

  // Queue & Navigation
  queue?: TrackData[];
  onSelectTrack?: (track: TrackData) => void;
  onReorderQueue?: (newQueue: TrackData[]) => void;
  onRemoveFromQueue?: (trackId: string) => void;
  infiniteRadio?: boolean;
  onToggleInfiniteRadio?: (enabled: boolean) => void;

  // Playback Controls
  onPrevious?: () => void;
  onNext?: () => void;
  isShuffle?: boolean;
  onToggleShuffle?: () => void;
  repeatMode?: "off" | "all" | "one";
  onToggleRepeat?: () => void;
  volume?: number; // 0 to 1
  onVolumeChange?: (volume: number) => void;
  onLikeToggle?: (track: TrackData, liked: boolean) => void;

  // Tab-specific Data
  lyrics?: LyricLine[] | string;
  related?: RelatedItem[];
  onSelectRelated?: (item: RelatedItem) => void;

  className?: string;
}

function formatDuration(seconds: number = 0): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export const FullPlayerView: React.FC<FullPlayerViewProps> = ({
  track,
  isPlaying = false,
  currentTime = 0,
  duration = 0,
  onPlayPause,
  onSeek,
  onClose,
  activeTab: controlledActiveTab,
  onTabChange,

  queue = [],
  onSelectTrack,
  onReorderQueue,
  onRemoveFromQueue,
  infiniteRadio = true,
  onToggleInfiniteRadio,

  onPrevious,
  onNext,
  isShuffle = false,
  onToggleShuffle,
  repeatMode = "off",
  onToggleRepeat,
  volume = 1,
  onVolumeChange,
  onLikeToggle,

  lyrics,
  related = [],
  onSelectRelated,

  className,
}) => {
  const [internalTab, setInternalTab] = useState<FullPlayerTab>("upNext");
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(volume);
  const [liked, setLiked] = useState(track?.isLiked || false);

  const activeTab = controlledActiveTab ?? internalTab;

  const handleTabClick = (tab: FullPlayerTab) => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  useEffect(() => {
    setLiked(track?.isLiked || false);
  }, [track?.id, track?.isLiked]);

  const handleMuteToggle = () => {
    if (isMuted) {
      setIsMuted(false);
      onVolumeChange?.(prevVolume > 0 ? prevVolume : 0.8);
    } else {
      setPrevVolume(volume);
      setIsMuted(true);
      onVolumeChange?.(0);
    }
  };

  const handleLikeClick = () => {
    if (!track) return;
    const nextLiked = !liked;
    setLiked(nextLiked);
    onLikeToggle?.(track, nextLiked);
  };

  const thumbnail = track?.thumbnailUrl || track?.thumbnail;

  // Parse lyrics if passed as string into LyricLine[]
  const parsedLyrics: LyricLine[] = React.useMemo(() => {
    if (!lyrics) return [];
    if (Array.isArray(lyrics)) return lyrics;
    return lyrics
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((text, idx) => ({
        id: `line-${idx}`,
        time: idx * 5, // fallback timing if raw string
        text: text.trim(),
      }));
  }, [lyrics]);

  return (
    <RadixDialog.Root open={true} onOpenChange={(open) => !open && onClose()}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <RadixDialog.Content
          aria-describedby={undefined}
          className={cn(
            "fixed inset-0 z-50 flex flex-col bg-canvas text-text-primary overflow-hidden select-none focus:outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-300",
            className
          )}
        >
          <RadixVisuallyHidden.Root>
            <RadixDialog.Title>
              {track ? `Playing ${track.title}` : "Full Player View"}
            </RadixDialog.Title>
          </RadixVisuallyHidden.Root>

          {/* Dynamic 10% Ambient Aura Backdrop Glow */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
            {thumbnail && (
              <img
                src={thumbnail}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover blur-[180px] scale-150 opacity-10 filter saturate-150"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-canvas/60 via-canvas/90 to-canvas" />
          </div>

          {/* Top Header Bar */}
          <div className="relative z-20 flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-canvas/40 backdrop-blur-md">
            {/* Collapse Down Arrow */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Collapse player"
              className="flex h-10 w-10 items-center justify-center rounded-full text-text-secondary hover:text-white hover:bg-surface-hover transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              <ChevronDown size={28} />
            </button>

            {/* Now Playing Title */}
            <div className="flex flex-col items-center max-w-sm truncate px-4">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-text-tertiary">
                Now Playing
              </span>
              <span className="text-sm font-semibold text-text-primary truncate">
                {track?.title || "No track playing"}
              </span>
            </div>

            {/* Right Tabs Switcher */}
            <div className="flex items-center gap-1 bg-surface/80 p-1 rounded-full border border-border-subtle">
              <button
                type="button"
                onClick={() => handleTabClick("upNext")}
                className={cn(
                  "px-4 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-full transition-all cursor-pointer",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
                  activeTab === "upNext"
                    ? "bg-white text-black shadow-sm font-bold"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                )}
              >
                Up Next
              </button>
              <button
                type="button"
                onClick={() => handleTabClick("lyrics")}
                className={cn(
                  "px-4 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-full transition-all cursor-pointer",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
                  activeTab === "lyrics"
                    ? "bg-white text-black shadow-sm font-bold"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                )}
              >
                Lyrics
              </button>
              <button
                type="button"
                onClick={() => handleTabClick("related")}
                className={cn(
                  "px-4 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-full transition-all cursor-pointer",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
                  activeTab === "related"
                    ? "bg-white text-black shadow-sm font-bold"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                )}
              >
                Related
              </button>
            </div>
          </div>

          {/* Main 2-Column Split Content */}
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 flex-1 min-h-0 px-6 sm:px-12 py-6 overflow-hidden">
            {/* Left Column: Large Album Artwork with Soft 10% Ambient Aura Glow + Controls */}
            <div className="lg:col-span-6 flex flex-col items-center justify-center h-full min-h-0 max-w-xl mx-auto w-full">
              {/* Artwork Box with Ambient Aura Glow */}
              <div className="relative aspect-square w-64 sm:w-80 md:w-96 lg:w-[400px] xl:w-[420px] shrink-0 flex items-center justify-center">
                {/* Soft 10% Dynamic Ambient Aura Glow */}
                <div className="absolute inset-0 -m-6 rounded-full pointer-events-none overflow-hidden opacity-10 blur-3xl scale-125">
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt=""
                      aria-hidden="true"
                      className="h-full w-full object-cover filter saturate-200"
                    />
                  ) : (
                    <AmbientAura intensity={0.1} blur={100} className="w-full h-full" />
                  )}
                </div>

                {/* Album Artwork Card */}
                <div className="relative z-10 h-full w-full overflow-hidden rounded-2xl lg:rounded-3xl bg-surface border border-border-subtle shadow-[0_24px_64px_rgba(0,0,0,0.85)]">
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt={track?.title || "Album Artwork"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-white/[0.04] text-text-tertiary">
                      <Music2 size={96} className="stroke-1" />
                    </div>
                  )}
                </div>
              </div>

              {/* Track Details & Action Row */}
              <div className="w-full mt-6 flex items-center justify-between">
                <div className="flex flex-col min-w-0 pr-4">
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-text-primary tracking-tight truncate leading-tight">
                    {track?.title || "No track selected"}
                  </h2>
                  <p className="text-sm sm:text-base text-text-secondary truncate mt-1">
                    {track?.artist || "Unknown artist"}
                    {track?.album ? ` • ${track.album}` : ""}
                  </p>
                </div>

                {track && (
                  <button
                    type="button"
                    aria-label={liked ? "Unlike" : "Like"}
                    onClick={handleLikeClick}
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all cursor-pointer",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
                      liked
                        ? "text-status-error bg-status-error/10 hover:bg-status-error/20"
                        : "text-text-secondary hover:text-white hover:bg-surface-hover"
                    )}
                  >
                    <Heart size={22} className={liked ? "fill-current" : ""} />
                  </button>
                )}
              </div>

              {/* Scrub Slider with Timestamps */}
              <div className="w-full mt-4 flex flex-col gap-1.5">
                <ScrubSlider
                  value={currentTime}
                  max={duration > 0 ? duration : 100}
                  onValueChange={onSeek}
                  onValueCommit={onSeek}
                  tooltipFormatter={(val) => formatDuration(val)}
                  size="md"
                  aria-label="Seek time"
                />
                <div className="flex items-center justify-between text-xs font-mono text-text-tertiary px-1">
                  <span>{formatDuration(currentTime)}</span>
                  <span>{formatDuration(duration)}</span>
                </div>
              </div>

              {/* Transport Controls */}
              <div className="w-full mt-4 flex items-center justify-between px-2">
                {/* Shuffle */}
                <button
                  type="button"
                  aria-label="Shuffle"
                  onClick={onToggleShuffle}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full transition-all cursor-pointer",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
                    isShuffle
                      ? "text-white bg-surface-active"
                      : "text-text-secondary hover:text-white hover:bg-surface-hover"
                  )}
                >
                  <Shuffle size={18} />
                </button>

                {/* Previous */}
                <button
                  type="button"
                  aria-label="Previous track"
                  onClick={onPrevious}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-text-secondary hover:text-white hover:bg-surface-hover transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  <SkipBack size={22} className="fill-current" />
                </button>

                {/* Main Play / Pause */}
                <button
                  type="button"
                  aria-label={isPlaying ? "Pause" : "Play"}
                  onClick={onPlayPause}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  {isPlaying ? (
                    <Pause size={24} className="fill-current" />
                  ) : (
                    <Play size={24} className="fill-current ml-0.5" />
                  )}
                </button>

                {/* Next */}
                <button
                  type="button"
                  aria-label="Next track"
                  onClick={onNext}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-text-secondary hover:text-white hover:bg-surface-hover transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  <SkipForward size={22} className="fill-current" />
                </button>

                {/* Repeat */}
                <button
                  type="button"
                  aria-label="Repeat"
                  onClick={onToggleRepeat}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full transition-all cursor-pointer",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
                    repeatMode !== "off"
                      ? "text-white bg-surface-active"
                      : "text-text-secondary hover:text-white hover:bg-surface-hover"
                  )}
                >
                  {repeatMode === "one" ? <Repeat1 size={18} /> : <Repeat size={18} />}
                </button>

                {/* Volume Toggle */}
                <div className="hidden sm:flex items-center gap-2">
                  <button
                    type="button"
                    aria-label={isMuted ? "Unmute" : "Mute"}
                    onClick={handleMuteToggle}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary hover:text-white hover:bg-surface-hover transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  >
                    {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: 3-Tab Panel (UP NEXT | LYRICS | RELATED) */}
            <div className="lg:col-span-6 flex flex-col min-h-0 h-full rounded-2xl md:rounded-3xl bg-surface/40 border border-border-subtle p-4 sm:p-6 backdrop-blur-xl overflow-hidden">
              {/* TAB 1: UP NEXT */}
              {activeTab === "upNext" && (
                <div className="flex flex-col h-full min-h-0">
                  {/* Queue Header & Infinite Radio Toggle */}
                  <div className="flex items-center justify-between pb-4 mb-2 border-b border-border-subtle shrink-0">
                    <div>
                      <h3 className="text-base font-semibold text-text-primary">
                        Playing next
                      </h3>
                      <p className="text-xs text-text-tertiary">
                        {queue.length > 0 ? `${queue.length} songs in queue` : "Queue is empty"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Radio size={14} className={infiniteRadio ? "text-white" : "text-text-tertiary"} />
                      <span className="text-xs text-text-secondary">Autoplay</span>
                      <Switch
                        checked={infiniteRadio}
                        onCheckedChange={onToggleInfiniteRadio}
                        aria-label="Autoplay similar songs"
                      />
                    </div>
                  </div>

                  {/* Queue Scroll List */}
                  <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-1 pr-1">
                    {/* Current Track Row */}
                    {track && (
                      <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-surface-active/80 border border-border-subtle mb-2">
                        <div className="flex items-center min-w-0 flex-1 mr-3">
                          <div className="relative h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-surface border border-border-subtle mr-3">
                            {thumbnail ? (
                              <img src={thumbnail} alt={track.title} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-white/[0.04] text-text-tertiary">
                                <Music2 size={16} />
                              </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                              <SoundWave isPlaying={isPlaying} size="sm" color="#ffffff" />
                            </div>
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-semibold text-white truncate">
                              {track.title}
                            </span>
                            <span className="text-xs text-text-secondary truncate">
                              {track.artist}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-mono text-text-tertiary">
                          {formatDuration(track.duration || duration)}
                        </span>
                      </div>
                    )}

                    {/* Queue Tracks */}
                    {queue.length > 0 ? (
                      queue.map((queueTrack, index) => {
                        const qThumb = queueTrack.thumbnailUrl || queueTrack.thumbnail;
                        return (
                          <div
                            key={queueTrack.id || `q-${index}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => onSelectTrack?.(queueTrack)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onSelectTrack?.(queueTrack);
                              }
                            }}
                            className="group flex items-center justify-between px-3 py-2 rounded-xl hover:bg-surface-hover/80 transition-all cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                          >
                            <div className="flex items-center min-w-0 flex-1 mr-3">
                              <span className="font-mono text-xs text-text-tertiary w-6 shrink-0 group-hover:hidden">
                                {index + 1}
                              </span>
                              <div className="hidden group-hover:flex w-6 shrink-0 items-center justify-start text-white">
                                <Play size={14} className="fill-current" />
                              </div>

                              <div className="relative h-9 w-9 shrink-0 rounded-lg overflow-hidden bg-surface border border-border-subtle mr-3">
                                {qThumb ? (
                                  <img src={qThumb} alt={queueTrack.title} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-white/[0.04] text-text-tertiary">
                                    <Music2 size={14} />
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-medium text-text-primary group-hover:text-white truncate">
                                  {queueTrack.title}
                                </span>
                                <span className="text-xs text-text-secondary truncate">
                                  {queueTrack.artist}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {onRemoveFromQueue && (
                                <button
                                  type="button"
                                  aria-label={`Remove ${queueTrack.title} from queue`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onRemoveFromQueue(queueTrack.id);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 flex h-7 w-7 items-center justify-center rounded-full text-text-secondary hover:text-status-error hover:bg-white/[0.08] transition-all cursor-pointer"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                              <span className="text-xs font-mono text-text-tertiary">
                                {formatDuration(queueTrack.duration)}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex flex-col items-center justify-center h-48 text-center">
                        <EmptyState
                          title="No upcoming tracks"
                          description="Turn on Autoplay to keep the music playing with similar songs."
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: LYRICS */}
              {activeTab === "lyrics" && (
                <div className="flex flex-col h-full min-h-0">
                  <div className="pb-3 mb-2 border-b border-border-subtle shrink-0 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-text-primary">
                      Lyrics
                    </h3>
                    <span className="text-xs text-text-tertiary">Synced Karaoke</span>
                  </div>

                  <div className="flex-1 min-h-0 overflow-hidden">
                    {parsedLyrics.length > 0 ? (
                      <SyncedLyricsView
                        lyrics={parsedLyrics}
                        currentTime={currentTime}
                        onSeek={onSeek}
                        className="h-full"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center py-12">
                        <EmptyState
                          title="No lyrics available"
                          description="Lyrics aren't available for this track yet."
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: RELATED */}
              {activeTab === "related" && (
                <div className="flex flex-col h-full min-h-0">
                  <div className="pb-3 mb-2 border-b border-border-subtle shrink-0">
                    <h3 className="text-base font-semibold text-text-primary">
                      Related tracks & albums
                    </h3>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-2 pr-1">
                    {related.length > 0 ? (
                      related.map((item) => {
                        const itemThumb = item.thumbnailUrl || item.thumbnail;
                        return (
                          <div
                            key={item.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => onSelectRelated?.(item)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onSelectRelated?.(item);
                              }
                            }}
                            className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-hover/80 transition-all cursor-pointer select-none border border-transparent hover:border-border-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                          >
                            <div className="flex items-center min-w-0 flex-1 mr-3">
                              <div className="relative h-11 w-11 shrink-0 rounded-lg overflow-hidden bg-surface border border-border-subtle mr-3">
                                {itemThumb ? (
                                  <img src={itemThumb} alt={item.title} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-white/[0.04] text-text-tertiary">
                                    {item.type === "album" ? <Disc size={20} /> : <Music2 size={20} />}
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-medium text-text-primary group-hover:text-white truncate">
                                  {item.title}
                                </span>
                                <span className="text-xs text-text-secondary truncate">
                                  {item.subtitle || item.type || "Track"}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              aria-label={`Play ${item.title}`}
                              className="opacity-0 group-hover:opacity-100 flex h-8 w-8 items-center justify-center rounded-full text-white bg-white/[0.1] hover:bg-white/[0.2] transition-all cursor-pointer"
                            >
                              <Play size={14} className="fill-current ml-0.5" />
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex flex-col items-center justify-center h-48 text-center">
                        <EmptyState
                          title="No related recommendations"
                          description="Recommendations will appear as more tracks are explored."
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
};
