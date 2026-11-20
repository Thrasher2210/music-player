export default defineContentScript({
  matches: [
    "http://localhost:3000/*",
    "http://127.0.0.1:3000/*",
    "https://app.example.com/*",
  ],
  runAt: "document_start",
  main() {
    // Set property on window in extension context
    (window as any).__MP_EXTENSION_ACTIVE__ = true;

    // Notify the page via postMessage without injecting inline scripts (preserves strict CSP)
    const announceReady = () => {
      window.postMessage({ type: "MP_EXTENSION_READY", active: true }, "*");
    };
    announceReady();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", announceReady, { once: true });
    }

    const FORWARDED_TYPES = [
      "MP_EXT_CHECK_AUTH",
      "MP_EXT_GET_ACCOUNT",
      "MP_EXT_AUTHENTICATED_FETCH",
    ];

    // Bridge for window messages
    window.addEventListener("message", async (event) => {
      if (event.source !== window || !event.data) {
        return;
      }

      // 1. Direct fetch bridge for MP_EXT_FETCH_REQUEST (WebExtensionAdapter)
      // Forwarded to background script to bypass CORS via host_permissions
      if (event.data.type === "MP_EXT_FETCH_REQUEST") {
        const { requestId } = event.data;
        try {
          const res = await browser.runtime.sendMessage(event.data);
          const resObj = res && typeof res === "object" ? res : { data: res };
          window.postMessage(
            {
              ...resObj,
              type: "MP_EXT_FETCH_RESPONSE",
              requestId,
            },
            "*"
          );
        } catch (err: any) {
          window.postMessage(
            {
              type: "MP_EXT_FETCH_RESPONSE",
              requestId,
              status: 0,
              statusText: "Error",
              headers: {},
              data: null,
              error: err?.message || "Extension fetch failed",
            },
            "*"
          );
        }
        return;
      }

      // 2. Auth & authenticated fetch messages forwarded to background script
      if (FORWARDED_TYPES.includes(event.data.type)) {
        const { type, requestId } = event.data;
        try {
          const response = await browser.runtime.sendMessage(event.data);
          const resObj =
            response && typeof response === "object"
              ? response
              : { data: response };

          window.postMessage(
            {
              ...resObj,
              type: `${type}_RESPONSE`,
              requestId,
            },
            "*"
          );
        } catch (err: any) {
          window.postMessage(
            {
              type: `${type}_RESPONSE`,
              requestId,
              error: err?.message || "Extension message failed",
            },
            "*"
          );
        }
      }
    });

    console.log(
      "[Music Player Bridge] Content script loaded, __MP_EXTENSION_ACTIVE__ = true"
    );
  },
});
