import React from "react";
import { DropdownMenu as RadixMenu } from "radix-ui";
import { cn } from "../utils/cn";

export const DropdownMenu = RadixMenu.Root;
export const DropdownMenuTrigger = RadixMenu.Trigger;

export const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof RadixMenu.Content>,
  React.ComponentPropsWithoutRef<typeof RadixMenu.Content>
>(({ className, sideOffset = 6, align = "end", ...props }, ref) => (
  <RadixMenu.Portal>
    <RadixMenu.Content
      ref={ref}
      sideOffset={sideOffset}
      align={align}
      className={cn(
        "z-50 min-w-[12rem] overflow-hidden rounded-xl border border-border-subtle bg-surface/95 p-1 text-text-primary shadow-2xl backdrop-blur-xl",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        className
      )}
      {...props}
    />
  </RadixMenu.Portal>
));
DropdownMenuContent.displayName = "DropdownMenuContent";

export interface DropdownMenuItemProps
  extends React.ComponentPropsWithoutRef<typeof RadixMenu.Item> {
  icon?: React.ReactNode;
  destructive?: boolean;
}

export const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof RadixMenu.Item>,
  DropdownMenuItemProps
>(({ className, icon, destructive = false, children, ...props }, ref) => (
  <RadixMenu.Item
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none transition-colors",
      "data-[highlighted]:bg-surface-hover data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      destructive ? "text-status-error" : "text-text-primary",
      className
    )}
    {...props}
  >
    {icon && (
      <span aria-hidden="true" className="shrink-0 text-text-secondary">
        {icon}
      </span>
    )}
    {children}
  </RadixMenu.Item>
));
DropdownMenuItem.displayName = "DropdownMenuItem";

export const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof RadixMenu.Label>,
  React.ComponentPropsWithoutRef<typeof RadixMenu.Label>
>(({ className, ...props }, ref) => (
  <RadixMenu.Label
    ref={ref}
    className={cn(
      "px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-text-kicker",
      className
    )}
    {...props}
  />
));
DropdownMenuLabel.displayName = "DropdownMenuLabel";

export const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof RadixMenu.Separator>,
  React.ComponentPropsWithoutRef<typeof RadixMenu.Separator>
>(({ className, ...props }, ref) => (
  <RadixMenu.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-border-subtle", className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";
