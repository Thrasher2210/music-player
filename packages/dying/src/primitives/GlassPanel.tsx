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
      subtle: "bg-[#1e1e22]/50 backdrop-blur-xl",
      default: "bg-[rgba(30,30,34,0.85)] backdrop-blur-2xl",
      elevated: "bg-[#1e1e22] backdrop-blur-3xl shadow-2xl shadow-black/80",
      heavy: "bg-[#141416]/95 backdrop-blur-3xl shadow-2xl shadow-black/90",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative overflow-hidden rounded-2xl transition-all duration-300",
          variantStyles[variant],
          border && "border border-white/[0.08]",
          specular &&
            "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/[0.16] before:to-transparent",
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
