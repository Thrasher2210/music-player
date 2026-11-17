import React, { useState } from "react";
import { Play, Pause, Heart, MoreHorizontal } from "lucide-react";
import { SoundWave } from "../effects/SoundWave";
import { cn } from "../utils/cn";

export interface TrackData {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number | string; // seconds number or "03:45"
  thumbnailUrl?: string;
  isLiked?: boolean;
}

export interface TrackRowProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onPlay" | "onPause"> {
  track: TrackData;
  index?: number;
  isActive?: boolean;
  isPlaying?: boolean;
  onPlay?: (track: TrackData) => void;
  onPause?: (track: TrackData) => void;
  onLikeToggle?: (track: TrackData, liked: boolean) => void;
  onActionClick?: (track: TrackData, event: React.MouseEvent) => void;
  showThumbnail?: boolean;
  showAlbum?: boolean;
  compact?: boolean;
}

function formatDuration(duration: number | string): string {
  if (typeof duration === "string") return duration;
  const mins = Math.floor(duration / 60);
  const secs = Math.floor(duration % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export const TrackRow = React.forwardRef<HTMLDivElement, TrackRowProps>(
  (
    {
      className,
      track,
      index,
      isActive = false,
      isPlaying = false,
      onPlay,
      onPause,
      onLikeToggle,
      onActionClick,
      showThumbnail = true,
      showAlbum = true,
      compact = false,
      ...props
    },
    ref
  ) => {
    const [isHovered, setIsHovered] = useState(false);
    const [liked, setLiked] = useState(track.isLiked || false);

    const handlePlayClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isActive && isPlaying) {
        onPause?.(track);
      } else {
        onPlay?.(track);
      }
    };

    const handleLikeClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      const nextLiked = !liked;
      setLiked(nextLiked);
      onLikeToggle?.(track, nextLiked);
    };

    return (
      <div
        ref={ref}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => onPlay?.(track)}
        className={cn(
          "group relative flex items-center select-none rounded-xl px-3 transition-all duration-150 cursor-pointer",
          compact ? "h-12 py-1 text-xs" : "h-14 py-2 text-sm",
          isActive
            ? "bg-white/[0.08] text-white shadow-sm"
            : "text-neutral-400 hover:bg-white/[0.04] hover:text-white",
          className
        )}
        {...props}
      >
        {/* Left: Index / Play-Pause / SoundWave */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center mr-3">
          {isActive ? (
            isPlaying ? (
              isHovered ? (
                <button
                  type="button"
                  onClick={handlePlayClick}
                  className="text-white hover:scale-110 active:scale-95 transition-transform"
                >
                  <Pause size={16} className="fill-current" />
                </button>
              ) : (
                <SoundWave isPlaying={true} size="sm" color="#ffffff" />
              )
            ) : isHovered ? (
              <button
                type="button"
                onClick={handlePlayClick}
                className="text-white hover:scale-110 active:scale-95 transition-transform"
              >
                <Play size={16} className="fill-current" />
              </button>
            ) : (
              <SoundWave isPlaying={false} size="sm" color="#a3a3a3" />
            )
          ) : isHovered ? (
            <button
              type="button"
              onClick={handlePlayClick}
              className="text-white hover:scale-110 active:scale-95 transition-transform"
            >
              <Play size={16} className="fill-current" />
            </button>
          ) : (
            <span className="font-mono text-xs text-neutral-500 group-hover:hidden">
              {index !== undefined ? index + 1 : ""}
            </span>
          )}
        </div>

        {/* Thumbnail */}
        {showThumbnail && (
          <div className="relative mr-3 h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-neutral-900 border border-white/[0.06]">
            {track.thumbnailUrl ? (
              <img
                src={track.thumbnailUrl}
                alt={track.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-white/[0.04] text-[10px] text-neutral-500">
                ♪
              </div>
            )}
          </div>
        )}

        {/* Title & Artist */}
        <div className="flex min-w-0 flex-1 flex-col justify-center pr-4">
          <span
            className={cn(
              "truncate font-medium leading-snug",
              isActive ? "text-white font-semibold" : "text-neutral-200 group-hover:text-white"
            )}
          >
            {track.title}
          </span>
          <span className="truncate text-xs text-neutral-400 group-hover:text-neutral-300">
            {track.artist}
          </span>
        </div>

        {/* Album (Optional) */}
        {showAlbum && track.album && (
          <div className="hidden md:flex min-w-0 flex-1 items-center pr-4">
            <span className="truncate text-xs text-neutral-500 group-hover:text-neutral-400">
              {track.album}
            </span>
          </div>
        )}

        {/* Like Button */}
        <div className="flex shrink-0 items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleLikeClick}
            aria-label={liked ? "Unlike" : "Like"}
            className={cn(
              "p-1.5 rounded-lg transition-all",
              liked
                ? "text-red-500 opacity-100 hover:scale-110"
                : "text-neutral-500 opacity-0 group-hover:opacity-100 hover:text-white hover:scale-110"
            )}
          >
            <Heart size={16} className={liked ? "fill-current" : ""} />
          </button>

          {/* Duration */}
          <span className="w-12 text-right font-mono text-xs tabular-nums text-neutral-500 group-hover:text-neutral-300">
            {formatDuration(track.duration)}
          </span>

          {/* Context Menu Button */}
          {onActionClick && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onActionClick(track, e);
              }}
              aria-label="Track actions"
              className="opacity-0 group-hover:opacity-100 p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/[0.08] transition-all"
            >
              <MoreHorizontal size={16} />
            </button>
          )}
        </div>
      </div>
    );
  }
);

TrackRow.displayName = "TrackRow";
