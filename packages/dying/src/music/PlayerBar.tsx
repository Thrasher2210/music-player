import React from "react";
import {
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  Volume1,
  Maximize2,
  ListMusic,
  Mic2,
} from "lucide-react";
import { GlassPanel } from "../primitives/GlassPanel";
import { ScrubSlider } from "../primitives/ScrubSlider";
import { SpringButton } from "../primitives/SpringButton";
import { type TrackData } from "./TrackRow";
import { cn } from "../utils/cn";

export interface PlayerBarProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onVolumeChange"> {
  currentTrack?: TrackData | null;
  isPlaying?: boolean;
  currentTime?: number;
  duration?: number;
  buffered?: number;
  volume?: number; // 0 to 1
  isMuted?: boolean;
  isShuffle?: boolean;
  repeatMode?: "off" | "all" | "one";
  showLyrics?: boolean;
  showQueue?: boolean;

  onPlayPause?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onSeek?: (seconds: number) => void;
  onVolumeChange?: (vol: number) => void;
  onMuteToggle?: () => void;
  onShuffleToggle?: () => void;
  onRepeatToggle?: () => void;
  onLyricsToggle?: () => void;
  onQueueToggle?: () => void;
  onExpandNowPlaying?: () => void;
}

function formatTime(seconds: number = 0): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  className,
  currentTrack,
  isPlaying = false,
  currentTime = 0,
  duration = 0,
  buffered = 0,
  volume = 0.8,
  isMuted = false,
  isShuffle = false,
  repeatMode = "off",
  showLyrics = false,
  showQueue = false,

  onPlayPause,
  onPrevious,
  onNext,
  onSeek,
  onVolumeChange,
  onMuteToggle,
  onShuffleToggle,
  onRepeatToggle,
  onLyricsToggle,
  onQueueToggle,
  onExpandNowPlaying,
  ...props
}) => {
  const effectiveVolume = isMuted ? 0 : volume;

  const VolumeIcon = effectiveVolume === 0 ? VolumeX : effectiveVolume < 0.5 ? Volume1 : Volume2;

  return (
    <GlassPanel
      variant="heavy"
      className={cn(
        "h-22 w-full px-4 sm:px-6 flex items-center justify-between border-t border-white/[0.08] backdrop-blur-3xl z-40 select-none",
        className
      )}
      {...props}
    >
      {/* Left: Track Information */}
      <div className="flex items-center gap-3 w-1/4 min-w-[180px] max-w-[280px]">
        {currentTrack ? (
          <>
            <div
              onClick={onExpandNowPlaying}
              className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-neutral-900 cursor-pointer group shadow-lg"
            >
              {currentTrack.thumbnailUrl ? (
                <img
                  src={currentTrack.thumbnailUrl}
                  alt={currentTrack.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-neutral-500">
                  ♪
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Maximize2 size={16} className="text-white" />
              </div>
            </div>

            <div className="flex flex-col min-w-0 pr-2">
              <span
                onClick={onExpandNowPlaying}
                className="truncate text-sm font-semibold text-white hover:underline cursor-pointer"
              >
                {currentTrack.title}
              </span>
              <span className="truncate text-xs text-neutral-400">
                {currentTrack.artist}
              </span>
            </div>
          </>
        ) : (
          <div className="text-xs text-neutral-500 font-medium">No track playing</div>
        )}
      </div>

      {/* Center: Playback Controls & Progress Scrubber */}
      <div className="flex flex-col items-center justify-center max-w-xl w-2/4 px-2">
        {/* Buttons row */}
        <div className="flex items-center gap-4 mb-1">
          <SpringButton
            variant="ghost"
            size="sm"
            onClick={onShuffleToggle}
            aria-label="Shuffle"
            className={cn("text-neutral-400", isShuffle && "text-white font-bold")}
          >
            <Shuffle size={16} />
          </SpringButton>

          <SpringButton
            variant="ghost"
            size="sm"
            onClick={onPrevious}
            aria-label="Previous track"
            className="text-neutral-300 hover:text-white"
          >
            <SkipBack size={18} className="fill-current" />
          </SpringButton>

          <SpringButton
            variant="playPause"
            size="md"
            isPlaying={isPlaying}
            onClick={onPlayPause}
            aria-label={isPlaying ? "Pause" : "Play"}
            glow
          />

          <SpringButton
            variant="ghost"
            size="sm"
            onClick={onNext}
            aria-label="Next track"
            className="text-neutral-300 hover:text-white"
          >
            <SkipForward size={18} className="fill-current" />
          </SpringButton>

          <SpringButton
            variant="ghost"
            size="sm"
            onClick={onRepeatToggle}
            aria-label="Repeat mode"
            className={cn("text-neutral-400", repeatMode !== "off" && "text-white font-bold")}
          >
            <Repeat size={16} />
          </SpringButton>
        </div>

        {/* Scrub bar & timing row */}
        <div className="flex w-full items-center gap-3 text-[11px] font-mono text-neutral-400">
          <span className="w-10 text-right tabular-nums">{formatTime(currentTime)}</span>
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
          <span className="w-10 text-left tabular-nums">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right: Lyrics, Queue, Volume */}
      <div className="flex items-center justify-end gap-3 w-1/4 min-w-[180px]">
        {/* Lyrics Toggle */}
        <SpringButton
          variant="ghost"
          size="sm"
          onClick={onLyricsToggle}
          aria-label="Lyrics"
          className={cn(
            "p-2 text-neutral-400 hover:text-white",
            showLyrics && "text-white bg-white/[0.1]"
          )}
        >
          <Mic2 size={17} />
        </SpringButton>

        {/* Queue Toggle */}
        <SpringButton
          variant="ghost"
          size="sm"
          onClick={onQueueToggle}
          aria-label="Queue"
          className={cn(
            "p-2 text-neutral-400 hover:text-white",
            showQueue && "text-white bg-white/[0.1]"
          )}
        >
          <ListMusic size={17} />
        </SpringButton>

        {/* Volume controls */}
        <div className="flex items-center gap-2 w-28 group">
          <button
            type="button"
            onClick={onMuteToggle}
            aria-label={isMuted ? "Unmute" : "Mute"}
            className="text-neutral-400 hover:text-white transition-colors"
          >
            <VolumeIcon size={18} />
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
      </div>
    </GlassPanel>
  );
};

PlayerBar.displayName = "PlayerBar";
