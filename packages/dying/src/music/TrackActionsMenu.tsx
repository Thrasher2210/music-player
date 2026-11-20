import React from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "../components/Menu";
import { cn } from "../utils/cn";

export interface TrackActionsMenuProps {
  /** Accessible name of the trigger button. */
  label: string;
  /** Icon rendered inside the trigger button. */
  icon: React.ReactNode;
  /** Classes for the trigger button. */
  className?: string;
  /** `DropdownMenuItem`s shown when the menu opens. */
  children: React.ReactNode;
}

const stopBubbling = (e: React.SyntheticEvent) => e.stopPropagation();

/**
 * Menu trigger for a track row. Menu content renders in a portal, but React
 * events still bubble to the row, so clicks and keys are stopped here to keep
 * choosing an item from also selecting the row.
 */
export function TrackActionsMenu({
  label,
  icon,
  className,
  children,
}: TrackActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={stopBubbling}
          onKeyDown={stopBubbling}
          className={cn(
            "data-[state=open]:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
            className
          )}
        >
          {icon}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent onClick={stopBubbling} onKeyDown={stopBubbling}>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
