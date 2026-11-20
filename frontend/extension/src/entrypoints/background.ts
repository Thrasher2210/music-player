import { registerDnrRules } from "../rules/dnr";
import {
  checkAuth,
  getAccount,
  authenticatedFetch,
} from "../auth/youtubeAuth";
import { createMessageHandler } from "../messaging/handleMessage";
import { APP_ORIGINS } from "../security/appOrigins";
import { originOf } from "../security/origins";

export default defineBackground(() => {
  // Register dynamic DNR rules on background startup & install
  registerDnrRules();
  browser.runtime.onInstalled?.addListener(() => {
    registerDnrRules();
  });

  const handleMessage = createMessageHandler({
    allowedOrigins: APP_ORIGINS,
    extensionOrigin: originOf(browser.runtime.getURL("/")) ?? "",
    getVersion: () => browser.runtime.getManifest().version,
    checkAuth,
    getAccount,
    authenticatedFetch,
  });

  browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    handleMessage(msg, sender)
      .then((res) => {
        sendResponse(res);
      })
      .catch((err) => {
        sendResponse({ error: err?.message || String(err) });
      });
    return true;
  });

  if (browser.runtime.onMessageExternal) {
    browser.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
      handleMessage(msg, sender)
        .then((res) => {
          sendResponse(res);
        })
        .catch((err) => {
          sendResponse({ error: err?.message || String(err) });
        });
      return true;
    });
  }
});
