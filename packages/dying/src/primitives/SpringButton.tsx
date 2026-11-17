import React from "react";
import { motion, type HTMLMotionProps, AnimatePresence } from "framer-motion";
import { Play, Pause } from "lucide-react";
import { cn } from "../utils/cn";

export interface SpringButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: "primary" | "glass" | "ghost" | "playPause" | "outline";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  isPlaying?: boolean;
  glow?: boolean;
  children?: React.ReactNode;
}

export const SpringButton = React.forwardRef<HTMLButtonElement, SpringButtonProps>(
  (
    {
      className,
      children,
      variant = "glass",
      size = "md",
      isPlaying = false,
      glow = false,
      disabled,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      xs: "h-7 px-2.5 text-xs rounded-lg gap-1.5",
      sm: "h-9 px-3 text-xs rounded-xl gap-2",
      md: "h-11 px-4 text-sm rounded-xl gap-2.5",
      lg: "h-13 px-5 text-base rounded-2xl gap-3",
      xl: "h-16 px-6 text-lg rounded-full gap-3",
    };

    const iconOnlySizes = {
      xs: "h-7 w-7 p-0 rounded-lg",
      sm: "h-9 w-9 p-0 rounded-xl",
      md: "h-11 w-11 p-0 rounded-full",
      lg: "h-14 w-14 p-0 rounded-full",
      xl: "h-16 w-16 p-0 rounded-full",
    };

    const variantClasses = {
      primary:
        "bg-white text-black font-semibold hover:bg-neutral-200 shadow-lg shadow-white/10 active:bg-neutral-300",
      glass:
        "border border-white/[0.08] bg-white/[0.04] text-white backdrop-blur-xl hover:bg-white/[0.08] hover:border-white/[0.16] shadow-md shadow-black/40 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/[0.2] before:to-transparent",
      ghost:
        "bg-transparent text-neutral-400 hover:text-white hover:bg-white/[0.05]",
      outline:
        "border border-white/[0.14] bg-transparent text-white hover:bg-white/[0.04] hover:border-white/[0.25]",
      playPause:
        "bg-white text-black font-bold shadow-xl shadow-white/10 hover:scale-105 active:scale-95",
    };

    const isIconOnly =
      variant === "playPause" ||
      (React.Children.count(children) === 1 &&
        React.isValidElement(children) &&
        typeof (children as React.ReactElement<any>).type !== "string");

    const playPauseIconSizes = {
      xs: 12,
      sm: 15,
      md: 18,
      lg: 22,
      xl: 26,
    };

    return (
      <motion.button
        ref={ref}
        whileHover={disabled ? undefined : { scale: 1.04 }}
        whileTap={disabled ? undefined : { scale: 0.94 }}
        transition={{
          type: "spring",
          stiffness: 450,
          damping: 24,
        }}
        disabled={disabled}
        className={cn(
          "relative inline-flex items-center justify-center select-none overflow-hidden font-medium transition-colors cursor-pointer",
          isIconOnly ? iconOnlySizes[size] : sizeClasses[size],
          variantClasses[variant],
          glow &&
            "shadow-[0_0_24px_rgba(255,255,255,0.25)] hover:shadow-[0_0_32px_rgba(255,255,255,0.4)]",
          disabled && "cursor-not-allowed opacity-40 hover:scale-100",
          className
        )}
        {...props}
      >
        {variant === "playPause" ? (
          <AnimatePresence mode="wait" initial={false}>
            {isPlaying ? (
              <motion.span
                key="pause"
                initial={{ opacity: 0, scale: 0.6, rotate: -45 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.6, rotate: 45 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                className="flex items-center justify-center"
              >
                <Pause
                  size={playPauseIconSizes[size]}
                  className="fill-current"
                />
              </motion.span>
            ) : (
              <motion.span
                key="play"
                initial={{ opacity: 0, scale: 0.6, rotate: 45 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.6, rotate: -45 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                className="flex items-center justify-center translate-x-0.5"
              >
                <Play
                  size={playPauseIconSizes[size]}
                  className="fill-current"
                />
              </motion.span>
            )}
          </AnimatePresence>
        ) : (
          children
        )}
      </motion.button>
    );
  }
);

SpringButton.displayName = "SpringButton";
