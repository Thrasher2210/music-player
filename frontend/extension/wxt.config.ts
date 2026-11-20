import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "GaneGan — YouTube Music Bridge",
    description:
      "Bridges your YouTube session to GaneGan for ad-free music, personalized mixes, and synced playlists.",
    icons: {
      16: "icons/icon-16.png",
      32: "icons/icon-32.png",
      48: "icons/icon-48.png",
      128: "icons/icon-128.png",
    },
    permissions: ["cookies", "declarativeNetRequest", "storage"],
    host_permissions: [
      "https://music.youtube.com/*",
      "https://www.youtube.com/*",
      "https://youtube.com/*",
      "https://*.googlevideo.com/*",
    ],
    // Origins allowed to message the extension (page bridge target)
    externally_connectable: {
      matches: ["http://localhost:3000/*", "https://app.example.com/*"],
    },
  },
  // Rebuild when the app's bridge code changes during development
  srcDir: "src",
});
