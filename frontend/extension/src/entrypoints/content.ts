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

    // Inject into DOM main world as well to guarantee page-level access
    try {
      const script = document.createElement("script");
      script.textContent =
        "window.__MP_EXTENSION_ACTIVE__ = true; window.dispatchEvent(new CustomEvent('mp-extension-active'));";
      (document.head || document.documentElement).appendChild(script);
      script.remove();
    } catch {
      // Ignore if document not ready or CSP blocks inline script
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
      if (event.data.type === "MP_EXT_FETCH_REQUEST") {
        const { requestId, url, method, headers, body } = event.data;
        try {
          const res = await fetch(url, {
            method: method || "GET",
            headers,
            body,
          });

          const contentType = res.headers.get("content-type") || "";
          let data: any;
          if (contentType.includes("application/json")) {
            data = await res.json();
          } else {
            data = await res.text();
          }

          const responseHeaders: Record<string, string> = {};
          res.headers.forEach((val, key) => {
            responseHeaders[key] = val;
          });

          window.postMessage(
            {
              type: "MP_EXT_FETCH_RESPONSE",
              requestId,
              status: res.status,
              statusText: res.statusText,
              headers: responseHeaders,
              data,
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
