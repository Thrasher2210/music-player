export default defineBackground(() => {
  // Phase 3: yt.fetch bridge (SAPISIDHASH signing, DNR Origin rules,
  // authuser enumeration). Placeholder so the scaffold builds.
  browser.runtime.onMessage.addListener((msg: { type: string }) => {
    if (msg.type === "ping") {
      return Promise.resolve({ type: "pong" });
    }
  });
});
