import type { Metadata, Viewport } from "next";
import { ThemeProviderClient } from "../components/ThemeProviderClient";
import "./globals.css";
import "katex/dist/katex.min.css";

export const metadata: Metadata = {
  title: {
    default: "GaneGan — Ad-Free Music Streaming",
    template: "%s · GaneGan",
  },
  description: "Ad-free music streaming with Apple Music aesthetics and your personal library.",
};

export const viewport: Viewport = {
  themeColor: "#141416",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" data-theme="dark" suppressHydrationWarning>
      <body className="min-h-dvh bg-canvas text-text-primary antialiased">
        <ThemeProviderClient>
          {children}
        </ThemeProviderClient>
      </body>
    </html>
  );
}
