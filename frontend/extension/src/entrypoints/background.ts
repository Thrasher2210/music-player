import { registerDnrRules } from "../rules/dnr";
import {
  checkAuth,
  getAccount,
  authenticatedFetch,
} from "../auth/youtubeAuth";

export default defineBackground(() => {
  // Register dynamic DNR rules on background startup & install
  registerDnrRules();
  browser.runtime.onInstalled?.addListener(() => {
    registerDnrRules();
  });

  async function handleMessage(msg: any, _sender: any): Promise<any> {
    const type = typeof msg === "string" ? msg : msg?.type;

    if (type === "ping") {
      return { type: "pong", status: "ok" };
    }
    if (type === "status") {
      return {
        active: true,
        status: "ready",
        version: browser.runtime.getManifest().version,
        dnr: true,
      };
    }
    if (type === "MP_EXT_CHECK_AUTH") {
      return await checkAuth();
    }
    if (type === "MP_EXT_GET_ACCOUNT") {
      return await getAccount();
    }
    if (type === "MP_EXT_AUTHENTICATED_FETCH") {
      return await authenticatedFetch(msg);
    }
    return null;
  }

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
