import React from "react";
import { cn } from "../utils/cn";

export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "subtle" | "default" | "elevated" | "heavy";
  specular?: boolean;
  border?: boolean;
}

export const GlassPanel = React.forwardRef<HTMLDivElement, GlassPanelProps>(
  (
    {
      className,
      children,
      variant = "default",
      specular = true,
      border = true,
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      subtle: "bg-white/[0.02] backdrop-blur-xl",
      default: "bg-white/[0.035] backdrop-blur-2xl",
      elevated: "bg-white/[0.06] backdrop-blur-3xl shadow-2xl shadow-black/80",
      heavy: "bg-black/40 bg-white/[0.08] backdrop-blur-3xl shadow-2xl shadow-black/90",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative overflow-hidden rounded-2xl transition-all duration-300",
          variantStyles[variant],
          border && "border border-white/[0.08]",
          specular &&
            "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/[0.18] before:to-transparent",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassPanel.displayName = "GlassPanel";
