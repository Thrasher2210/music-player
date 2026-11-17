import React from "react";
import { Clock } from "lucide-react";
import { TrackRow, TrackData } from "./TrackRow";
import { cn } from "../utils/cn";

export interface TrackTableProps extends React.HTMLAttributes<HTMLDivElement> {
  tracks: TrackData[];
  currentTrackId?: string | null;
  isPlaying?: boolean;
  onTrackSelect?: (track: TrackData) => void;
  onTrackPlay?: (track: TrackData) => void;
  onTrackPause?: (track: TrackData) => void;
  onLikeToggle?: (track: TrackData, liked: boolean) => void;
  onActionClick?: (track: TrackData, event: React.MouseEvent) => void;
  showHeader?: boolean;
  showAlbum?: boolean;
  showThumbnails?: boolean;
  compact?: boolean;
  emptyMessage?: string;
}

export const TrackTable = React.forwardRef<HTMLDivElement, TrackTableProps>(
  (
    {
      className,
      tracks = [],
      currentTrackId,
      isPlaying = false,
      onTrackSelect,
      onTrackPlay,
      onTrackPause,
      onLikeToggle,
      onActionClick,
      showHeader = true,
      showAlbum = true,
      showThumbnails = true,
      compact = false,
      emptyMessage = "No tracks available",
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn("w-full select-none", className)}
        {...props}
      >
        {/* Table Header */}
        {showHeader && tracks.length > 0 && (
          <div className="flex items-center px-3 pb-2 mb-1 border-b border-white/[0.08] text-xs font-semibold uppercase tracking-wider text-[#86868b]">
            {/* Number Column */}
            <div className="w-8 shrink-0 text-center mr-3">#</div>

            {/* Thumbnail Spacer if thumbnails shown */}
            {showThumbnails && <div className="w-10 shrink-0 mr-3" />}

            {/* Title Column */}
            <div className="flex-1 pr-4">Title</div>

            {/* Album Column */}
            {showAlbum && (
              <div className="hidden md:flex flex-1 items-center pr-4">
                Album
              </div>
            )}

            {/* Duration & Actions Header */}
            <div className="flex shrink-0 items-center justify-end gap-2 pr-1">
              <span className="w-12 text-right flex justify-end">
                <Clock size={14} className="stroke-[2.5]" />
              </span>
              <div className="w-7" />
            </div>
          </div>
        )}

        {/* Track Rows */}
        {tracks.length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {tracks.map((track, idx) => {
              const isCurrent = track.id === currentTrackId;
              return (
                <TrackRow
                  key={track.id || idx}
                  track={track}
                  index={idx}
                  isActive={isCurrent}
                  isPlaying={isCurrent && isPlaying}
                  onSelect={onTrackSelect}
                  onPlay={onTrackPlay || onTrackSelect}
                  onPause={onTrackPause}
                  onLikeToggle={onLikeToggle}
                  onActionClick={onActionClick}
                  showThumbnail={showThumbnails}
                  showAlbum={showAlbum}
                  compact={compact}
                />
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center text-[#86868b] border border-dashed border-white/[0.08] rounded-2xl bg-[#1c1c1e]/40 my-4">
            <span className="text-3xl mb-2 opacity-50">🎵</span>
            <p className="text-sm font-medium">{emptyMessage}</p>
          </div>
        )}
      </div>
    );
  }
);

TrackTable.displayName = "TrackTable";
