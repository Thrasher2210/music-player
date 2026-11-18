"use client";

import React from "react";
import { Monitor, Sun, Moon } from "lucide-react";
import { useTheme, type Theme } from "../tokens/ThemeProvider";
import { cn } from "../utils/cn";

export interface ThemeSwitcherProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: Theme;
  onThemeChange?: (theme: Theme) => void;
  showLabel?: boolean;
  size?: "sm" | "md";
}

interface ThemeOption {
  id: Theme;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const THEME_OPTIONS: ThemeOption[] = [
  { id: "system", label: "System theme", icon: Monitor },
  { id: "light", label: "Light theme", icon: Sun },
  { id: "dark", label: "Dark theme", icon: Moon },
];

export const ThemeSwitcher = React.forwardRef<HTMLDivElement, ThemeSwitcherProps>(
  (
    {
      className,
      value,
      onThemeChange,
      showLabel = false,
      size = "sm",
      ...props
    },
    ref
  ) => {
    let themeContext: ReturnType<typeof useTheme> | null = null;
    try {
      // Safe fallback if used outside ThemeProvider
      themeContext = useTheme();
    } catch {
      themeContext = null;
    }

    const currentTheme: Theme = value ?? themeContext?.theme ?? "system";

    const handleSelect = (themeId: Theme) => {
      if (onThemeChange) {
        onThemeChange(themeId);
      } else if (themeContext) {
        themeContext.setTheme(themeId);
      } else if (typeof document !== "undefined") {
        const root = document.documentElement;
        if (themeId === "system") {
          const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
          root.setAttribute("data-theme", isDark ? "dark" : "light");
          if (isDark) root.classList.add("dark");
          else root.classList.remove("dark");
        } else {
          root.setAttribute("data-theme", themeId);
          if (themeId === "light") root.classList.remove("dark");
          else root.classList.add("dark");
        }
      }
    };

    const iconSize = size === "sm" ? 14 : 16;
    const buttonSize = size === "sm" ? "h-6 w-6" : "h-7 w-7";

    return (
      <div
        ref={ref}
        className={cn("flex flex-col items-center gap-1.5 select-none", className)}
        {...props}
      >
        <div
          role="radiogroup"
          aria-label="Theme switcher"
          className="inline-flex items-center rounded-full border border-border-subtle bg-surface/80 p-0.5 backdrop-blur-md shadow-sm"
        >
          {THEME_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected =
              currentTheme === option.id ||
              (option.id === "dark" && currentTheme === "oled");

            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={option.label}
                onClick={() => handleSelect(option.id)}
                className={cn(
                  "relative inline-flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-1 focus-visible:ring-offset-canvas",
                  buttonSize,
                  isSelected
                    ? "bg-white text-black shadow-sm font-semibold scale-100"
                    : "text-text-tertiary hover:text-text-primary hover:bg-white/[0.08] active:scale-95"
                )}
              >
                <Icon size={iconSize} className="shrink-0" />
              </button>
            );
          })}
        </div>

        {showLabel && (
          <span className="text-xs text-text-secondary font-medium tracking-tight">
            Selected theme: {currentTheme}
          </span>
        )}
      </div>
    );
  }
);

ThemeSwitcher.displayName = "ThemeSwitcher";
