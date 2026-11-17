import React from "react";
import { Play } from "lucide-react";
import { cn } from "../utils/cn";

export interface MediaCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onPlay"> {
  title: string;
  subtitle?: string;
  imageUrl: string;
  aspect?: "square" | "portrait";
  overlayText?: string;
  onPlay?: () => void;
}

export const MediaCard = React.forwardRef<HTMLDivElement, MediaCardProps>(
  (
    {
      className,
      title,
      subtitle,
      imageUrl,
      aspect = "square",
      overlayText,
      onPlay,
      onClick,
      ...props
    },
    ref
  ) => {
    const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
      onClick?.(e);
      onPlay?.();
    };

    const handlePlayClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onPlay?.();
    };

    return (
      <div
        ref={ref}
        onClick={handleCardClick}
        className={cn(
          "group relative flex flex-col shrink-0 cursor-pointer select-none",
          aspect === "portrait" ? "w-36 sm:w-44 md:w-48" : "w-40 sm:w-48 md:w-52",
          className
        )}
        {...props}
      >
        {/* Artwork Container */}
        <div
          className={cn(
            "relative w-full overflow-hidden rounded-xl md:rounded-2xl bg-[#1c1c1e] border border-white/[0.08] shadow-md transition-all duration-300 group-hover:border-white/[0.18] group-hover:shadow-xl",
            aspect === "portrait" ? "aspect-[3/4]" : "aspect-square"
          )}
        >
          <img
            src={imageUrl}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            loading="lazy"
          />

          {/* Optional Overlay Text / Badge */}
          {overlayText && (
            <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-white/[0.1] text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
              {overlayText}
            </div>
          )}

          {/* Play Button on Hover */}
          {onPlay && (
            <div className="absolute inset-0 flex items-end justify-end p-3 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button
                type="button"
                onClick={handlePlayClick}
                aria-label={`Play ${title}`}
                className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-white text-black shadow-2xl transition-all duration-200 scale-90 group-hover:scale-100 hover:scale-110 active:scale-95"
              >
                <Play size={18} className="fill-current translate-x-0.5" />
              </button>
            </div>
          )}
        </div>

        {/* Text Details */}
        <div className="flex flex-col mt-2.5 px-0.5 min-w-0">
          <span className="truncate text-sm font-semibold text-white tracking-tight group-hover:text-white transition-colors">
            {title}
          </span>
          {subtitle && (
            <span className="truncate text-xs text-[#98989d] mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
      </div>
    );
  }
);

MediaCard.displayName = "MediaCard";
