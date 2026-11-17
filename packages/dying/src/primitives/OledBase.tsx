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
      </div>
    );
  }
);

OledBase.displayName = "OledBase";
