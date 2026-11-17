import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "GaneGan — Ad-Free Music Streaming",
    template: "%s · GaneGan",
  },
  description: "Ad-free music streaming with Apple Music aesthetics and your personal library.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-dvh bg-neutral-950 text-neutral-100 antialiased">
        {children}
      </body>
    </html>
  );
}
