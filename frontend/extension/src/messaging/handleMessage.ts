import { getSenderOrigin, isAllowedOrigin, isAllowedSender, type SenderInfo } from "../security/origins";

export interface MessageHandlerDeps {
  allowedOrigins: readonly string[];
  extensionOrigin: string;
  getVersion: () => string;
  checkAuth: () => Promise<unknown>;
  getAccount: () => Promise<unknown>;
  authenticatedFetch: (msg: any, appOrigin: string | null) => Promise<unknown>;
}

export function createMessageHandler(deps: MessageHandlerDeps) {
  return async function handleMessage(msg: any, sender: SenderInfo | undefined): Promise<any> {
    if (!isAllowedSender(sender, deps.extensionOrigin, deps.allowedOrigins)) {
      return { error: "origin not allowed" };
    }

    const type = typeof msg === "string" ? msg : msg?.type;

    if (type === "ping") {
      return { type: "pong", status: "ok" };
    }
    if (type === "status") {
      return {
        active: true,
        status: "ready",
        version: deps.getVersion(),
        dnr: true,
      };
    }
    if (type === "MP_EXT_CHECK_AUTH") {
      return await deps.checkAuth();
    }
    if (type === "MP_EXT_GET_ACCOUNT") {
      return await deps.getAccount();
    }
    if (type === "MP_EXT_AUTHENTICATED_FETCH" || type === "MP_EXT_FETCH_REQUEST") {
      const origin = getSenderOrigin(sender);
      const appOrigin = isAllowedOrigin(origin ?? undefined, deps.allowedOrigins) ? origin : null;
      return await deps.authenticatedFetch(msg, appOrigin);
    }
    return null;
  };
}
