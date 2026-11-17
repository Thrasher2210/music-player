import React, { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "../utils/cn";

export interface AppShellProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Fixed left navigation sidebar slot.
   */
  sidebar?: React.ReactNode;

  /**
   * Floating bottom player dock slot (e.g. FloatingPlayerPill).
   */
  playerDock?: React.ReactNode;

  /**
   * Full immersion overlay slot (e.g. SyncedLyrics immersion view or modals).
   */
  overlay?: React.ReactNode;

  /**
   * Main scrollable stage content.
   */
  children: React.ReactNode;

  /**
   * Optional custom styling for the inner content container.
   */
  stageClassName?: string;
}

/**
 * AppShell: Apple Music dark responsive frame.
 * Features:
 * - Desktop: fixed 240px left sidebar rail.
 * - Mobile/Tablet: slide-over drawer with backdrop blur and hamburger button.
 * - Full-width scrollable main stage with scrollbar locked cleanly to the right edge.
 * - Centered floating bottom player dock.
 * - Full-screen overlay portal slot (e.g. Synced Lyrics).
 */
export const AppShell = React.forwardRef<HTMLDivElement, AppShellProps>(
  (
    {
      className,
      sidebar,
      playerDock,
      overlay,
      children,
      stageClassName,
      ...props
    },
    ref
  ) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex h-screen w-full overflow-hidden bg-[#141416] text-[#ffffff] antialiased select-none",
          className
        )}
        {...props}
      >
        {/* Desktop Fixed Left Navigation Sidebar Rail */}
        {sidebar && (
          <aside className="relative shrink-0 z-20 h-screen hidden lg:flex">
            {sidebar}
          </aside>
        )}

        {/* Mobile Slide-Over Drawer with Backdrop Blur Overlay */}
        {sidebar && (
          <div
            className={cn(
              "fixed inset-0 z-50 lg:hidden transition-all duration-300",
              isMobileMenuOpen
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none"
            )}
          >
            {/* Backdrop Overlay */}
            <div
              className="absolute inset-0 bg-black/75 backdrop-blur-md transition-opacity"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Drawer Content */}
            <div
              className={cn(
                "relative z-10 h-full w-[260px] max-w-[85vw] bg-[#121214] border-r border-white/[0.08] shadow-2xl transition-transform duration-300 ease-out flex flex-col",
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
              )}
            >
              <div className="absolute top-3.5 right-3 z-30">
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                  aria-label="Close navigation menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div
                className="h-full overflow-y-auto"
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("a, button")) {
                    setIsMobileMenuOpen(false);
                  }
                }}
              >
                {sidebar}
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Main Content Stage */}
        <div className="relative flex flex-1 flex-col h-screen min-w-0 overflow-hidden">
          {/* Mobile Top Header (lg:hidden) */}
          <header className="lg:hidden flex items-center justify-between h-14 px-4 border-b border-white/[0.08] bg-[#121214] shrink-0 z-30 select-none">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
              <span>GaneGan</span>
            </div>
            <div className="w-9" aria-hidden="true" />
          </header>

          {/* Full-width scrollable viewport (scrollbar stays at the far right edge) */}
          <main className="relative flex-1 w-full overflow-y-auto overflow-x-hidden scroll-smooth">
            {/* Responsive centered content container */}
            <div
              className={cn(
                "w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10 py-6 md:py-8",
                stageClassName
              )}
            >
              {children}
            </div>

            {/* Bottom spacer ensuring scrollable content clears the floating player dock */}
            {playerDock && <div className="h-28 sm:h-32 w-full shrink-0" aria-hidden="true" />}
          </main>
        </div>

        {/* Floating Bottom Player Dock Slot */}
        {playerDock && (
          <div className="pointer-events-none fixed bottom-3 sm:bottom-6 inset-x-0 z-40 flex justify-center px-2 sm:px-4">
            {playerDock}
          </div>
        )}

        {/* Full Immersion Overlay Slot (e.g. Synced Lyrics / Modals) */}
        {overlay && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {overlay}
          </div>
        )}
      </div>
    );
  }
);

AppShell.displayName = "AppShell";
