export default defineBackground(() => {
  const DNR_RULES: Browser.declarativeNetRequest.Rule[] = [
    {
      id: 1,
      priority: 1,
      action: {
        type: "modifyHeaders",
        responseHeaders: [
          {
            header: "Access-Control-Allow-Origin",
            operation: "set",
            value: "*",
          },
          {
            header: "Access-Control-Allow-Methods",
            operation: "set",
            value: "GET, HEAD, OPTIONS",
          },
          {
            header: "Access-Control-Expose-Headers",
            operation: "set",
            value: "Content-Length, Content-Range, Accept-Ranges",
          },
          {
            header: "Access-Control-Allow-Headers",
            operation: "set",
            value: "*",
          },
        ],
      },
      condition: {
        requestDomains: ["googlevideo.com"],
      },
    },
    {
      id: 2,
      priority: 1,
      action: {
        type: "modifyHeaders",
        requestHeaders: [
          {
            header: "Origin",
            operation: "remove",
          },
          {
            header: "Referer",
            operation: "set",
            value: "https://music.youtube.com/",
          },
        ],
      },
      condition: {
        requestDomains: ["googlevideo.com", "youtube.com"],
      },
    },
    {
      id: 3,
      priority: 2,
      action: {
        type: "modifyHeaders",
        requestHeaders: [
          {
            header: "Origin",
            operation: "remove",
          },
          {
            header: "Referer",
            operation: "remove",
          },
        ],
      },
      condition: {
        urlFilter: "||googlevideo.com/*c=VISIONOS",
      },
    },
  ];

  async function registerDnrRules() {
    try {
      const existingRules = await browser.declarativeNetRequest.getDynamicRules();
      const existingRuleIds = existingRules.map((rule) => rule.id);
      await browser.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existingRuleIds,
        addRules: DNR_RULES,
      });
      console.log("[Music Player Bridge] Declarative Net Request rules active");
    } catch (err) {
      console.error("[Music Player Bridge] Failed to update dynamic DNR rules:", err);
    }
  }

  // Register dynamic DNR rules on background startup & install
  registerDnrRules();
  browser.runtime.onInstalled?.addListener(() => {
    registerDnrRules();
  });

  // Runtime messaging handlers (ping, status)
  function handleMessage(
    msg: any,
    _sender: any,
    sendResponse?: (response?: any) => void
  ) {
    const type = typeof msg === "string" ? msg : msg?.type;
    let response: any = null;

    if (type === "ping") {
      response = { type: "pong", status: "ok" };
    } else if (type === "status") {
      response = {
        active: true,
        status: "ready",
        version: browser.runtime.getManifest().version,
        dnr: true,
      };
    }

    if (response) {
      if (sendResponse) {
        sendResponse(response);
      }
      return Promise.resolve(response);
    }
  }

  browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    handleMessage(msg, sender, sendResponse);
    return true;
  });

  if (browser.runtime.onMessageExternal) {
    browser.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
      handleMessage(msg, sender, sendResponse);
      return true;
    });
  }
});
