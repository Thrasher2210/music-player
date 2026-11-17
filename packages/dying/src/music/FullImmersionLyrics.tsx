import React, { useEffect, useRef, useState } from "react";
import { X, Music2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TrackData } from "./TrackRow";
import { LyricLine } from "./SyncedLyricsView";
import { cn } from "../utils/cn";

export interface FullImmersionLyricsProps {
  track: TrackData | null;
  lyrics: LyricLine[];
  currentTime: number;
  isPlaying?: boolean;
  onPlayPause?: () => void;
  onClose: () => void;
  onSeek?: (time: number) => void;
  className?: string;
}

export const FullImmersionLyrics: React.FC<FullImmersionLyricsProps> = ({
  track,
  lyrics = [],
  currentTime = 0,
  isPlaying = false,
  onPlayPause,
  onClose,
  onSeek,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);
  const [userIsScrolling, setUserIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keyboard escape listener to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Find index of currently active line
  const activeIndex = lyrics.reduce((currActive, line, index) => {
    return line.time <= currentTime ? index : currActive;
  }, -1);

  // Pause auto-scroll when user manually scrolls
  const handleScroll = () => {
    setUserIsScrolling(true);
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      setUserIsScrolling(false);
    }, 2800);
  };

  // Auto-scroll to center the active line smoothly
  useEffect(() => {
    if (userIsScrolling || activeIndex === -1) return;
    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeIndex, userIsScrolling]);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col bg-[#000000] text-white overflow-hidden select-none",
        className
      )}
    >
      {/* Dark Graphite Blurred Ambient Backdrop */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {track?.thumbnailUrl && (
          <img
            src={track.thumbnailUrl}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover blur-[140px] scale-150 opacity-25 filter saturate-150"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-[#000000]/75 via-[#121214]/85 to-[#000000]/95" />
        <div className="absolute inset-0 backdrop-blur-3xl" />
      </div>

      {/* Top Bar with Close Button */}
      <div className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-12">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#86868b]">
            Apple Music Immersion
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close full lyrics immersion"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/[0.1] text-white transition-all shadow-lg active:scale-95 cursor-pointer"
        >
          <X size={20} />
        </button>
      </div>

      {/* Main Content Area: Split 2-Column Layout */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 flex-1 min-h-0 px-6 sm:px-12 pb-10">
        {/* Left Column: Large Album Art & Track Info */}
        <div className="lg:col-span-5 flex flex-col items-center lg:items-start justify-center h-full">
          <div className="relative aspect-square w-56 sm:w-72 md:w-80 lg:w-[400px] shrink-0 overflow-hidden rounded-2xl lg:rounded-3xl bg-[#1c1c1e] border border-white/[0.12] shadow-[0_30px_70px_rgba(0,0,0,0.85)]">
            {track?.thumbnailUrl ? (
              <img
                src={track.thumbnailUrl}
                alt={track.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-white/[0.04] text-neutral-600">
                <Music2 size={80} className="stroke-1" />
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col items-center lg:items-start text-center lg:text-left max-w-md">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight line-clamp-2">
              {track?.title || "No track selected"}
            </h1>
            <p className="text-lg sm:text-xl font-medium text-[#98989d] mt-1 line-clamp-1">
              {track?.artist || "Unknown Artist"}
            </p>
            {track?.album && (
              <p className="text-sm text-[#86868b] mt-1 line-clamp-1">
                {track.album}
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Synced Lyrics Stream */}
        <div className="lg:col-span-7 flex flex-col h-full min-h-0 relative">
          {lyrics.length > 0 ? (
            <div
              ref={containerRef}
              onScroll={handleScroll}
              className={cn(
                "h-full w-full overflow-y-auto px-4 py-28 scrollbar-none scroll-smooth flex flex-col gap-6",
                // Top and bottom fade masks
                "mask-[linear-gradient(to_bottom,transparent_0%,black_15%,black_85%,transparent_100%)]"
              )}
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {lyrics.map((line, index) => {
                const isActive = index === activeIndex;
                const isPast = index < activeIndex;

                return (
                  <div
                    key={line.id || `${line.time}-${index}`}
                    ref={isActive ? activeLineRef : null}
                    onClick={() => onSeek?.(line.time)}
                    className={cn(
                      "group relative cursor-pointer py-2 transition-all duration-300 origin-left select-text",
                      isActive
                        ? "scale-100 opacity-100"
                        : isPast
                        ? "opacity-35 hover:opacity-75"
                        : "opacity-40 hover:opacity-80"
                    )}
                  >
                    <span
                      className={cn(
                        "block font-sans text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight transition-all duration-300 leading-snug",
                        isActive
                          ? "text-white drop-shadow-[0_0_24px_rgba(255,255,255,0.45)]"
                          : "text-[#98989d] group-hover:text-white"
                      )}
                    >
                      {line.text}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center text-[#86868b]">
              <Music2 size={48} className="stroke-1 opacity-50 mb-3" />
              <p className="text-lg font-medium">No synced lyrics available</p>
              <p className="text-xs text-[#86868b] mt-1">Enjoy the music</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

FullImmersionLyrics.displayName = "FullImmersionLyrics";
