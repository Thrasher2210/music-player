/**
 * Dying Design System — 3-Tier Semantic Tokens
 * W3C DTCG-compliant token specification
 */

import tokensJson from "./tokens.json" with { type: "json" };

export const dyingTokens = tokensJson;

export const primitiveTokens = {
  colors: {
    black: "#000000",
    white: "#ffffff",
    zinc950: "#09090b",
    zinc900: "#18181b",
    zinc800: "#27272a",
    emerald500: "#10b981",
    rose500: "#f43f5e",
  },
  opacities: {
    glassBg: 0.03,
    glassHover: 0.06,
    glassBorder: 0.08,
    textPrimary: 1.0,
    textSecondary: 0.72,
    textMuted: 0.50,
    textDim: 0.35,
  },
  blurs: {
    panel: "24px",
    card: "16px",
    aura: "120px",
  },
  springs: {
    snappy: "cubic-bezier(0.16, 1, 0.3, 1)",
    bounce: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    smooth: "cubic-bezier(0.25, 0.1, 0.25, 1)",
  },
} as const;

export const semanticTokens = {
  surfaces: {
    canvas: primitiveTokens.colors.black,
    glass: `rgba(255, 255, 255, ${primitiveTokens.opacities.glassBg})`,
    glassHover: `rgba(255, 255, 255, ${primitiveTokens.opacities.glassHover})`,
    glassBorder: `rgba(255, 255, 255, ${primitiveTokens.opacities.glassBorder})`,
  },
  text: {
    primary: primitiveTokens.colors.white, // 21:1 on OLED
    secondary: `rgba(255, 255, 255, ${primitiveTokens.opacities.textSecondary})`, // 9.8:1
    muted: `rgba(255, 255, 255, ${primitiveTokens.opacities.textMuted})`, // 4.6:1 (WCAG AA pass)
    accent: primitiveTokens.colors.emerald500,
  },
} as const;

export const componentTokens = {
  playerBar: {
    height: "88px",
    background: "rgba(0, 0, 0, 0.8)",
    blur: "32px",
  },
  scrubber: {
    trackHeight: "4px",
    thumbSize: "12px",
    hoverTrackHeight: "6px",
  },
  lyrics: {
    activeScale: 1.05,
    activeGlow: "0 0 30px rgba(255, 255, 255, 0.4)",
    inactiveOpacity: primitiveTokens.opacities.textDim,
  },
} as const;
