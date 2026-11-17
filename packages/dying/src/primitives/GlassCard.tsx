import React from "react";
import { cn } from "../utils/cn";

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  active?: boolean;
  glowOnHover?: boolean;
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      className,
      children,
      interactive = true,
      active = false,
      glowOnHover = true,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "group relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#1e1e22] p-4 backdrop-blur-2xl transition-all duration-300",
          // Top specular highlight reflection
          "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/[0.16] before:to-transparent",
          // Interactive states
          interactive && [
            "cursor-pointer",
            "hover:bg-[#28282c] hover:border-white/[0.14] hover:shadow-xl hover:shadow-black/60",
            "active:scale-[0.98] active:bg-[#2c2c2e]",
          ],
          // Active state
          active && "border-white/[0.22] bg-[#2c2c2e] shadow-lg shadow-white/[0.02]",
          // Monochrome ambient glow on hover
          glowOnHover && [
            "after:pointer-events-none after:absolute after:inset-0 after:-z-10 after:rounded-xl after:opacity-0 after:transition-opacity after:duration-500",
            "after:bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.06),transparent_70%)]",
            "hover:after:opacity-100",
          ],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = "GlassCard";
