import React from "react";
import { Play } from "lucide-react";
import { cn } from "../utils/cn";

export interface HeroBannerCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onPlay"> {
  kicker: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  onPlay?: () => void;
  aspectRatio?: "16/9" | "2/1" | "auto";
}

export const HeroBannerCard = React.forwardRef<HTMLDivElement, HeroBannerCardProps>(
  (
    {
      className,
      kicker,
      title,
      subtitle,
      imageUrl,
      onPlay,
      aspectRatio = "16/9",
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

    const aspectClasses = {
      "16/9": "aspect-[16/9]",
      "2/1": "aspect-[2/1]",
      auto: "h-64 sm:h-72 md:h-80",
    }[aspectRatio];

    return (
      <div
        ref={ref}
        onClick={handleCardClick}
        className={cn(
          "group relative overflow-hidden rounded-2xl md:rounded-3xl border border-white/[0.08] bg-[#1c1c1e] cursor-pointer select-none transition-all duration-300 shadow-xl hover:shadow-2xl hover:border-white/[0.16]",
          aspectClasses,
          className
        )}
        {...props}
      >
        {/* Background Image with Hover Scale */}
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={imageUrl}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            loading="lazy"
          />
        </div>

        {/* Ambient Dark Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent opacity-60" />

        {/* Content Box */}
        <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-6 md:p-8 z-10">
          <div className="flex items-end justify-between gap-4">
            <div className="flex flex-col gap-1 min-w-0 max-w-[85%]">
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-[#86868b] group-hover:text-[#98989d] transition-colors">
                {kicker}
              </span>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight line-clamp-2 drop-shadow-sm">
                {title}
              </h2>
              <p className="text-xs sm:text-sm text-[#98989d] line-clamp-2 mt-0.5">
                {subtitle}
              </p>
            </div>

            {/* Play Button */}
            {onPlay && (
              <button
                type="button"
                onClick={handlePlayClick}
                aria-label={`Play ${title}`}
                className="flex h-11 w-11 sm:h-12 sm:w-12 md:h-14 md:w-14 shrink-0 items-center justify-center rounded-full bg-white text-black shadow-2xl transition-all duration-300 opacity-90 group-hover:opacity-100 group-hover:scale-110 active:scale-95"
              >
                <Play size={20} className="fill-current translate-x-0.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
);

HeroBannerCard.displayName = "HeroBannerCard";
