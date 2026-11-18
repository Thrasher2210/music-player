import React from "react";
import { cn } from "../utils/cn";

/* -------------------------------------------------------------------------- */
/* BrandLogo Types                                                            */
/* -------------------------------------------------------------------------- */

export type BrandLogoVariant =
  | "mark"
  | "wordmark"
  | "full"
  | "app-icon"
  | "monochrome-tile";

export type BrandLogoSize = "xs" | "sm" | "md" | "lg" | "xl" | number;

export type BrandLogoColor = "brand" | "monochrome" | "white" | "current";

export interface BrandLogoProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "color"> {
  variant?: BrandLogoVariant;
  size?: BrandLogoSize;
  color?: BrandLogoColor;
  showSubtitle?: boolean;
  subtitle?: string;
  badge?: React.ReactNode;
}

const SIZE_MAP: Record<
  "xs" | "sm" | "md" | "lg" | "xl",
  {
    iconSize: number;
    wordmarkClass: string;
    appIconSize: number;
    tileRadius: string;
    gap: string;
  }
> = {
  xs: {
    iconSize: 16,
    wordmarkClass: "text-xs tracking-tight",
    appIconSize: 24,
    tileRadius: "rounded-md",
    gap: "gap-1.5",
  },
  sm: {
    iconSize: 20,
    wordmarkClass: "text-sm tracking-tight",
    appIconSize: 32,
    tileRadius: "rounded-lg",
    gap: "gap-2",
  },
  md: {
    iconSize: 28,
    wordmarkClass: "text-lg tracking-tight",
    appIconSize: 44,
    tileRadius: "rounded-xl",
    gap: "gap-2.5",
  },
  lg: {
    iconSize: 40,
    wordmarkClass: "text-2xl tracking-tight",
    appIconSize: 64,
    tileRadius: "rounded-2xl",
    gap: "gap-3",
  },
  xl: {
    iconSize: 56,
    wordmarkClass: "text-4xl tracking-tight",
    appIconSize: 88,
    tileRadius: "rounded-3xl",
    gap: "gap-4",
  },
};

/* -------------------------------------------------------------------------- */
/* BrandSymbolMark (SVG Icon)                                                */
/* -------------------------------------------------------------------------- */

export interface BrandSymbolMarkProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

export const BrandSymbolMark: React.FC<BrandSymbolMarkProps> = ({
  size = 28,
  className,
  ...props
}) => {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0 select-none", className)}
      {...props}
    >
      {/* Outer stylized 'G' vinyl record arc */}
      <path
        d="M76 28.1 A34 34 0 1 0 84 50 L58 50"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Inner musical eighth-note head & turntable center label */}
      <circle cx="56" cy="53" r="10" fill="currentColor" />
      {/* Musical note stem */}
      <rect x="61" y="30" width="9" height="23" rx="4.5" fill="currentColor" />
    </svg>
  );
};

/* -------------------------------------------------------------------------- */
/* BrandLogo Component                                                        */
/* -------------------------------------------------------------------------- */

export const BrandLogo = React.forwardRef<HTMLDivElement, BrandLogoProps>(
  (
    {
      variant = "mark",
      size = "md",
      color = "brand",
      showSubtitle = false,
      subtitle = "Music",
      badge,
      className,
      ...props
    },
    ref
  ) => {
    // Resolve dimensions based on size
    const isNamedSize = typeof size === "string" && size in SIZE_MAP;
    const sizeConfig = isNamedSize
      ? SIZE_MAP[size as keyof typeof SIZE_MAP]
      : SIZE_MAP.md;

    const numericIconSize = typeof size === "number" ? size : sizeConfig.iconSize;
    const numericAppIconSize =
      typeof size === "number" ? size : sizeConfig.appIconSize;

    // Resolve color styling
    const getAccentColorClass = () => {
      switch (color) {
        case "brand":
          return "text-brand-primary";
        case "white":
          return "text-white";
        case "monochrome":
          return "text-text-primary";
        case "current":
          return "text-current";
        default:
          return "text-brand-primary";
      }
    };

    const accentClass = getAccentColorClass();

    // 1. Mark Only
    if (variant === "mark") {
      return (
        <div
          ref={ref}
          role="img"
          aria-label="GaneGan logo mark"
          className={cn("inline-flex items-center justify-center shrink-0", accentClass, className)}
          {...props}
        >
          <BrandSymbolMark size={numericIconSize} />
        </div>
      );
    }

    // 2. Wordmark Only
    if (variant === "wordmark") {
      return (
        <div
          ref={ref}
          role="img"
          aria-label="GaneGan"
          className={cn(
            "inline-flex flex-col select-none leading-none",
            className
          )}
          {...props}
        >
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "font-sans font-semibold text-text-primary tracking-tight",
                sizeConfig.wordmarkClass
              )}
            >
              <span className={accentClass}>G</span>ane
              <span className={accentClass}>G</span>an
            </span>
            {badge && <div className="shrink-0">{badge}</div>}
          </div>
          {showSubtitle && subtitle && (
            <span className="text-[11px] font-medium text-text-tertiary mt-0.5 tracking-normal">
              {subtitle}
            </span>
          )}
        </div>
      );
    }

    // 3. App Icon (Squircle Badge)
    if (variant === "app-icon") {
      return (
        <div
          ref={ref}
          role="img"
          aria-label="GaneGan app icon"
          style={{ width: numericAppIconSize, height: numericAppIconSize }}
          className={cn(
            "relative inline-flex items-center justify-center shrink-0 select-none overflow-hidden",
            "bg-brand-primary text-white shadow-specular-inset",
            sizeConfig.tileRadius,
            className
          )}
          {...props}
        >
          {/* Subtle specular sheen highlight on top edge */}
          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
          <BrandSymbolMark size={Math.round(numericAppIconSize * 0.62)} />
        </div>
      );
    }

    // 4. Monochrome Tile (Graphite Glass Card Tile)
    if (variant === "monochrome-tile") {
      return (
        <div
          ref={ref}
          role="img"
          aria-label="GaneGan monochrome app icon"
          style={{ width: numericAppIconSize, height: numericAppIconSize }}
          className={cn(
            "relative inline-flex items-center justify-center shrink-0 select-none overflow-hidden",
            "bg-surface text-text-primary border border-border-subtle shadow-specular-inset backdrop-blur-md",
            sizeConfig.tileRadius,
            className
          )}
          {...props}
        >
          <BrandSymbolMark size={Math.round(numericAppIconSize * 0.62)} />
        </div>
      );
    }

    // 5. Full Lockup (Mark + Wordmark)
    return (
      <div
        ref={ref}
        role="img"
        aria-label="GaneGan"
        className={cn("inline-flex items-center select-none", sizeConfig.gap, className)}
        {...props}
      >
        <div className={cn("shrink-0", accentClass)}>
          <BrandSymbolMark size={numericIconSize} />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={cn(
                "font-sans font-semibold text-text-primary tracking-tight truncate",
                sizeConfig.wordmarkClass
              )}
            >
              <span className={accentClass}>G</span>ane
              <span className={accentClass}>G</span>an
            </span>
            {badge && <div className="shrink-0">{badge}</div>}
          </div>
          {showSubtitle && subtitle && (
            <span className="text-[11px] font-medium text-text-tertiary truncate">
              {subtitle}
            </span>
          )}
        </div>
      </div>
    );
  }
);

BrandLogo.displayName = "BrandLogo";

// Alias export
export const GaneGanLogo = BrandLogo;
