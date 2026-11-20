type Rule = Browser.declarativeNetRequest.Rule;
type HeaderInfo = Browser.declarativeNetRequest.ModifyHeaderInfo;

const XHR: `${Browser.declarativeNetRequest.ResourceType}`[] = ["xmlhttprequest"];
const XHR_AND_MEDIA: `${Browser.declarativeNetRequest.ResourceType}`[] = ["xmlhttprequest", "media"];

const set = (header: string, value: string): HeaderInfo => ({ header, operation: "set", value });
const remove = (header: string): HeaderInfo => ({ header, operation: "remove" });

const CORS_RESPONSE: HeaderInfo[] = [
  set("Access-Control-Allow-Origin", "*"),
  set("Access-Control-Allow-Methods", "GET, HEAD, POST, OPTIONS"),
  set("Access-Control-Expose-Headers", "*"),
  set("Access-Control-Allow-Headers", "*"),
];

function impersonate(origin: string): HeaderInfo[] {
  return [set("Origin", origin), set("Referer", `${origin}/`), set("X-Origin", origin)];
}

export const DNR_RULES: Rule[] = [
  // 1. InnerTube Music client impersonation + CORS
  {
    id: 1,
    priority: 1,
    condition: {
      urlFilter: "||music.youtube.com/youtubei/",
      resourceTypes: XHR,
    },
    action: {
      type: "modifyHeaders",
      requestHeaders: impersonate("https://music.youtube.com"),
      responseHeaders: CORS_RESPONSE,
    },
  },
  // 2. InnerTube Web client impersonation + CORS
  {
    id: 2,
    priority: 1,
    condition: {
      urlFilter: "||www.youtube.com/youtubei/",
      resourceTypes: XHR,
    },
    action: {
      type: "modifyHeaders",
      requestHeaders: impersonate("https://www.youtube.com"),
      responseHeaders: CORS_RESPONSE,
    },
  },
  // 3. YouTube.js session bootstrap scripts CORS bypass
  {
    id: 3,
    priority: 1,
    condition: {
      urlFilter: "||www.youtube.com/sw.js_data",
      resourceTypes: XHR,
    },
    action: {
      type: "modifyHeaders",
      responseHeaders: CORS_RESPONSE,
    },
  },
  // 4. YouTube iframe API CORS bypass
  {
    id: 4,
    priority: 1,
    condition: {
      urlFilter: "||www.youtube.com/iframe_api",
      resourceTypes: XHR,
    },
    action: {
      type: "modifyHeaders",
      responseHeaders: CORS_RESPONSE,
    },
  },
  // 5. YouTube player script deciphering CORS bypass
  {
    id: 5,
    priority: 1,
    condition: {
      urlFilter: "||www.youtube.com/s/player/",
      resourceTypes: XHR,
    },
    action: {
      type: "modifyHeaders",
      responseHeaders: CORS_RESPONSE,
    },
  },
  // 6. Audio stream fetching from googlevideo.com
  {
    id: 6,
    priority: 1,
    condition: {
      urlFilter: "||googlevideo.com/",
      resourceTypes: XHR_AND_MEDIA,
    },
    action: {
      type: "modifyHeaders",
      requestHeaders: impersonate("https://www.youtube.com").slice(0, 2),
      responseHeaders: CORS_RESPONSE,
    },
  },
  // 7. Direct Opus URLs minted for VISIONOS must NOT carry Origin or Referer
  {
    id: 7,
    priority: 2,
    condition: {
      urlFilter: "||googlevideo.com/*c=VISIONOS",
      resourceTypes: XHR_AND_MEDIA,
    },
    action: {
      type: "modifyHeaders",
      requestHeaders: [remove("Origin"), remove("Referer")],
      responseHeaders: CORS_RESPONSE,
    },
  },
];

export async function registerDnrRules(): Promise<void> {
  try {
    const existingRules = await browser.declarativeNetRequest.getDynamicRules();
    const existingRuleIds = existingRules.map((rule) => rule.id);
    await browser.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingRuleIds,
      addRules: DNR_RULES,
    });
    console.log("[Music Player Bridge] Declarative Net Request rules active (7 rules)");
  } catch (err) {
    console.error("[Music Player Bridge] Failed to update dynamic DNR rules:", err);
  }
}
