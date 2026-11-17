import React from "react";
import {
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  Volume1,
  VolumeX,
  Mic2,
  Music,
} from "lucide-react";
import { ScrubSlider } from "../primitives/ScrubSlider";
import { SpringButton } from "../primitives/SpringButton";
import { cn } from "../utils/cn";

export interface FloatingPlayerPillProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onVolumeChange"> {
  // Track information
  title?: string;
  artist?: string;
  album?: string;
  artworkUrl?: string;
  onTrackClick?: () => void;

  // Playback state
  isPlaying?: boolean;
  currentTime?: number; // seconds
  duration?: number; // seconds
  buffered?: number; // 0 to 100

  // Volume state
  volume?: number; // 0 to 1
  isMuted?: boolean;

  // Mode toggles
  isLyricsOpen?: boolean;
  isShuffle?: boolean;
  repeatMode?: "off" | "all" | "one";

  // Action callbacks
  onPlayPause?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onSeek?: (seconds: number) => void;
  onVolumeChange?: (volume: number) => void;
  onToggleMute?: () => void;
  onToggleLyrics?: () => void;
  onToggleShuffle?: () => void;
  onToggleRepeat?: () => void;

  // Optional customization slots
  leadingSlot?: React.ReactNode;
  trailingSlot?: React.ReactNode;
}

function formatTime(seconds: number = 0): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

/**
 * FloatingPlayerPill: Centered floating frosted acrylic pill for Apple Music desktop.
 * Features dark graphite glass, specular top reflection, track info, transport controls,
 * scrub slider with timing, volume slider, and lyrics immersion toggle.
 */
export const FloatingPlayerPill = React.forwardRef<
  HTMLDivElement,
  FloatingPlayerPillProps
>(
  (
    {
      className,
      title = "Not Playing",
      artist = "Select a track",
      album,
      artworkUrl,
      onTrackClick,
      isPlaying = false,
      currentTime = 0,
      duration = 0,
      buffered = 0,
      volume = 0.8,
      isMuted = false,
      isLyricsOpen = false,
      isShuffle = false,
      repeatMode = "off",
      onPlayPause,
      onPrevious,
      onNext,
      onSeek,
      onVolumeChange,
      onToggleMute,
      onToggleLyrics,
      onToggleShuffle,
      onToggleRepeat,
      leadingSlot,
      trailingSlot,
      ...props
    },
    ref
  ) => {
    const effectiveVolume = isMuted ? 0 : volume;
    const VolumeIcon =
      effectiveVolume === 0 ? VolumeX : effectiveVolume < 0.5 ? Volume1 : Volume2;

    return (
      <div
        ref={ref}
        className={cn(
          "pointer-events-auto relative w-full max-w-[720px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[rgba(30,30,34,0.85)] p-3 px-4 text-white shadow-2xl shadow-black/80 backdrop-blur-2xl transition-all duration-300 select-none",
          // Specular top highlight reflection
          "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/[0.18] before:to-transparent",
          className
        )}
        {...props}
      >
        {/* Main upper row: Track Info | Controls | Utilities */}
        <div className="flex items-center justify-between gap-3">
          {/* Left: Artwork & Track Meta */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 sm:flex-initial sm:min-w-[140px] sm:max-w-[210px] shrink-0">
            {leadingSlot ?? (
              <>
                <div
                  onClick={onTrackClick}
                  className={cn(
                    "relative h-10 w-10 sm:h-11 sm:w-11 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#1e1e22] shadow-sm",
                    onTrackClick && "cursor-pointer group"
                  )}
                >
                  {artworkUrl ? (
                    <img
                      src={artworkUrl}
                      alt={title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[#86868b]">
                      <Music className="h-4 w-4" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col min-w-0 pr-1">
                  <span
                    onClick={onTrackClick}
                    className={cn(
                      "truncate text-xs font-semibold text-white",
                      onTrackClick && "hover:underline cursor-pointer"
                    )}
                    title={title}
                  >
                    {title}
                  </span>
                  <span
                    className="truncate text-[11px] text-[#98989d]"
                    title={artist}
                  >
                    {artist}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Center: Transport Controls */}
          <div className="flex items-center gap-1 sm:gap-2 justify-center shrink-0">
            {onToggleShuffle && (
              <SpringButton
                variant="ghost"
                size="xs"
                onClick={onToggleShuffle}
                aria-label="Shuffle"
                className={cn(
                  "hidden md:inline-flex text-[#86868b] hover:text-white",
                  isShuffle && "text-white"
                )}
              >
                <Shuffle className="h-3.5 w-3.5" />
              </SpringButton>
            )}

            <SpringButton
              variant="ghost"
              size="xs"
              onClick={onPrevious}
              aria-label="Previous track"
              className="text-[#98989d] hover:text-white"
            >
              <SkipBack className="h-4 w-4 fill-current" />
            </SpringButton>

            <SpringButton
              variant="playPause"
              size="sm"
              isPlaying={isPlaying}
              onClick={onPlayPause}
              aria-label={isPlaying ? "Pause" : "Play"}
            />

            <SpringButton
              variant="ghost"
              size="xs"
              onClick={onNext}
              aria-label="Next track"
              className="text-[#98989d] hover:text-white"
            >
              <SkipForward className="h-4 w-4 fill-current" />
            </SpringButton>

            {onToggleRepeat && (
              <SpringButton
                variant="ghost"
                size="xs"
                onClick={onToggleRepeat}
                aria-label="Repeat mode"
                className={cn(
                  "hidden md:inline-flex text-[#86868b] hover:text-white",
                  repeatMode !== "off" && "text-white"
                )}
              >
                <Repeat className="h-3.5 w-3.5" />
              </SpringButton>
            )}
          </div>

          {/* Right: Lyrics & Volume Utilities */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2.5 sm:min-w-[120px] sm:max-w-[210px] shrink-0">
            {trailingSlot ?? (
              <>
                {/* Lyrics toggle */}
                <SpringButton
                  variant="ghost"
                  size="xs"
                  onClick={onToggleLyrics}
                  aria-label="Toggle Lyrics"
                  className={cn(
                    "text-[#98989d] hover:text-white transition-colors",
                    isLyricsOpen && "bg-white/10 text-white rounded-lg"
                  )}
                >
                  <Mic2 className="h-4 w-4" />
                </SpringButton>

                {/* Volume slider & mute (hidden on smallest screens to preserve control layout) */}
                <div className="hidden sm:flex items-center gap-1.5 w-20 sm:w-28">
                  <button
                    type="button"
                    onClick={onToggleMute}
                    aria-label={isMuted ? "Unmute" : "Mute"}
                    className="text-[#98989d] hover:text-white transition-colors p-1"
                  >
                    <VolumeIcon className="h-3.5 w-3.5" />
                  </button>
                  <div className="flex-1">
                    <ScrubSlider
                      size="sm"
                      min={0}
                      max={1}
                      step={0.01}
                      value={effectiveVolume}
                      onValueChange={(val) => onVolumeChange?.(val)}
                      tooltipFormatter={(val) => `${Math.round(val * 100)}%`}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Lower row: Embedded Scrub Bar with Timings */}
        <div className="mt-1 flex w-full items-center gap-2.5 text-[10px] font-mono text-[#86868b]">
          <span className="w-8 text-right tabular-nums">
            {formatTime(currentTime)}
          </span>
          <div className="flex-1">
            <ScrubSlider
              size="sm"
              min={0}
              max={duration || 100}
              value={currentTime}
              buffered={buffered}
              onValueCommit={(val) => onSeek?.(val)}
              tooltipFormatter={(val) => formatTime(val)}
            />
          </div>
          <span className="w-8 text-left tabular-nums">
            {formatTime(duration)}
          </span>
        </div>
      </div>
    );
  }
);

FloatingPlayerPill.displayName = "FloatingPlayerPill";
