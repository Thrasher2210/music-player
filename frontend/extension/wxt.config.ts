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
  },
  hooks: {
    // Origins allowed to message the extension (page bridge target). Reuses the
    // content script matches so both come from VITE_APP_ORIGINS, which Vite
    // only resolves for entrypoints and not in this config file.
    "build:manifestGenerated": (_wxt, manifest) => {
      manifest.externally_connectable = {
        matches: manifest.content_scripts?.flatMap((script) => script.matches ?? []) ?? [],
      };
    },
  },
  // Rebuild when the app's bridge code changes during development
  srcDir: "src",
});
