import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "Music Player Bridge",
    description:
      "Bridges your YouTube session to the Music Player web app. Cookies never leave your browser.",
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
