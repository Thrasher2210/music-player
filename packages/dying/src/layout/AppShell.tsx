import React from "react";
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
   * Optional custom styling for the scrollable stage.
   */
  stageClassName?: string;
}

/**
 * AppShell: Apple Music dark desktop frame.
 * Features fixed left sidebar, scrollable main stage with auto-spacer,
 * centered floating bottom player dock, and full-screen overlay portal slot.
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
    return (
      <div
        ref={ref}
        className={cn(
          "relative flex h-screen w-full overflow-hidden bg-[#141416] text-[#ffffff] antialiased select-none",
          className
        )}
        {...props}
      >
        {/* Fixed Left Navigation Sidebar Slot */}
        {sidebar && (
          <aside className="relative shrink-0 z-20 h-screen">
            {sidebar}
          </aside>
        )}

        {/* Scrollable Main Content Stage */}
        <div className="relative flex flex-1 flex-col h-screen min-w-0 overflow-hidden">
          <main
            className={cn(
              "relative flex-1 overflow-y-auto overflow-x-hidden scroll-smooth",
              stageClassName
            )}
          >
            {children}

            {/* Bottom spacer ensuring scrollable content clears the floating player dock */}
            {playerDock && <div className="h-32 w-full shrink-0" aria-hidden="true" />}
          </main>
        </div>

        {/* Floating Bottom Player Dock Slot */}
        {playerDock && (
          <div className="pointer-events-none fixed bottom-6 inset-x-0 z-40 flex justify-center px-4">
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
