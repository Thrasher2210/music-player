import React from "react";
import { cn } from "../utils/cn";

export interface OledBaseProps extends React.HTMLAttributes<HTMLDivElement> {
  grain?: boolean;
}

export const OledBase = React.forwardRef<HTMLDivElement, OledBaseProps>(
  ({ className, children, grain = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative min-h-screen w-full bg-[#000000] text-neutral-100 antialiased selection:bg-white/20 selection:text-white",
          className
        )}
        {...props}
      >
        {children}
        {grain && (
          <div
            className="pointer-events-none fixed inset-0 z-50 opacity-[0.015]"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
            }}
          />
        )}
      </div>
    );
  }
);

OledBase.displayName = "OledBase";
