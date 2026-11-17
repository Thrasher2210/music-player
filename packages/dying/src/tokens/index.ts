/**
 * Dying Design System — Monochrome Graphite Tokens
 * W3C DTCG-compliant token specification
 */

import tokensJson from "./tokens.json" with { type: "json" };

export const dyingTokens = tokensJson;

export const primitiveTokens = {
  colors: {
    canvas: "#141416",
    sidebar: "#121214",
    surface: "#1e1e22",
    surfaceHover: "#28282c",
    surfaceActive: "#2c2c2e",
    border: "rgba(255, 255, 255, 0.08)",
    white: "#ffffff",
    textSecondary: "#98989d",
    textTertiary: "#86868b",
    glassFrosted: "rgba(30, 30, 34, 0.85)",
    // Backward-compatibility aliases
    black: "#141416",
    zinc950: "#121214",
    zinc900: "#1e1e22",
    zinc800: "#28282c",
    emerald500: "#ffffff",
    rose500: "#f43f5e",
  },
  opacities: {
    glassBg: 0.85,
    glassHover: 0.95,
    glassBorder: 0.08,
    textPrimary: 1.0,
    textSecondary: 0.72,
    textMuted: 0.50,
    textDim: 0.35,
  },
  blurs: {
    panel: "24px",
    card: "24px",
    pill: "24px",
    aura: "60px",
  },
  springs: {
    snappy: "cubic-bezier(0.16, 1, 0.3, 1)",
    bounce: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    smooth: "cubic-bezier(0.25, 0.1, 0.25, 1)",
  },
} as const;

export const semanticTokens = {
  surfaces: {
    canvas: primitiveTokens.colors.canvas,
    sidebar: primitiveTokens.colors.sidebar,
    card: primitiveTokens.colors.surface,
    hover: primitiveTokens.colors.surfaceHover,
    activePill: primitiveTokens.colors.surfaceActive,
    border: primitiveTokens.colors.border,
    glass: primitiveTokens.colors.glassFrosted,
    glassHover: primitiveTokens.colors.surfaceHover,
    glassBorder: primitiveTokens.colors.border,
  },
  text: {
    primary: primitiveTokens.colors.white,
    secondary: primitiveTokens.colors.textSecondary,
    tertiary: primitiveTokens.colors.textTertiary,
    kicker: primitiveTokens.colors.textTertiary,
    muted: primitiveTokens.colors.textSecondary,
    accent: primitiveTokens.colors.white,
  },
  feedback: {
    playing: primitiveTokens.colors.white,
    error: primitiveTokens.colors.rose500,
  },
} as const;

export const componentTokens = {
  sidebar: {
    width: "240px",
    background: primitiveTokens.colors.sidebar,
  },
  playerPill: {
    maxWidth: "720px",
    background: primitiveTokens.colors.glassFrosted,
    blur: "24px",
    borderRadius: "16px",
  },
  playerBar: {
    height: "88px",
    background: primitiveTokens.colors.glassFrosted,
    blur: "24px",
  },
  scrubber: {
    trackHeight: "4px",
    thumbSize: "12px",
    hoverTrackHeight: "6px",
  },
  lyrics: {
    activeScale: 1.05,
    activeGlow: "0 0 24px rgba(255, 255, 255, 0.25)",
    inactiveOpacity: primitiveTokens.opacities.textDim,
  },
} as const;
