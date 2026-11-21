import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { createMessageHandler } from "../src/messaging/handleMessage";
import { parseAppOrigins } from "../src/security/origins";

const EXTENSION_ORIGIN = "chrome-extension://abcdefghijklmnop";

function setup() {
  const calls: Record<string, unknown[]> = { checkAuth: [], getAccount: [], authenticatedFetch: [] };
  const handler = createMessageHandler({
    allowedOrigins: parseAppOrigins(),
    extensionOrigin: EXTENSION_ORIGIN,
    getVersion: () => "9.9.9",
    checkAuth: async () => {
      calls.checkAuth.push(true);
      return { connected: true };
    },
    getAccount: async () => {
      calls.getAccount.push(true);
      return { name: "someone" };
    },
    authenticatedFetch: async (msg, appOrigin) => {
      calls.authenticatedFetch.push({ msg, appOrigin });
      return { ok: true };
    },
  });
  return { handler, calls };
}

const messages = [
  { type: "ping" },
  { type: "status" },
  { type: "MP_EXT_CHECK_AUTH" },
  { type: "MP_EXT_GET_ACCOUNT" },
  { type: "MP_EXT_AUTHENTICATED_FETCH", url: "https://music.youtube.com/" },
  { type: "MP_EXT_FETCH_REQUEST", url: "https://www.youtube.com/" },
];

describe("createMessageHandler sender check", () => {
  it("rejects every message type from a foreign origin without calling anything", async () => {
    const { handler, calls } = setup();
    for (const sender of [
      { origin: "https://evil.com", url: "https://evil.com/" },
      { origin: "https://evil.nip.io" },
      { url: "http://localhost.evil.com/" },
      {},
      undefined,
    ]) {
      for (const msg of messages) {
        assert.deepEqual(await handler(msg, sender), { error: "origin not allowed" });
      }
    }
    assert.equal(calls.checkAuth.length, 0);
    assert.equal(calls.getAccount.length, 0);
    assert.equal(calls.authenticatedFetch.length, 0);
  });

  it("serves ping, status, auth and account to an allowed app origin", async () => {
    const { handler } = setup();
    const sender = { origin: "http://localhost:3000" };
    assert.deepEqual(await handler("ping", sender), { type: "pong", status: "ok" });
    assert.deepEqual(await handler({ type: "status" }, sender), {
      active: true,
      status: "ready",
      version: "9.9.9",
      dnr: true,
    });
    assert.deepEqual(await handler({ type: "MP_EXT_CHECK_AUTH" }, sender), { connected: true });
    assert.deepEqual(await handler({ type: "MP_EXT_GET_ACCOUNT" }, sender), { name: "someone" });
    assert.equal(await handler({ type: "unknown" }, sender), null);
  });

  it("passes the sender's app origin to authenticatedFetch", async () => {
    const { handler, calls } = setup();
    const msg = { type: "MP_EXT_FETCH_REQUEST", url: "http://localhost:3000/api/yt/stream" };
    await handler(msg, { url: "http://localhost:3000/library" });
    assert.deepEqual(calls.authenticatedFetch, [{ msg, appOrigin: "http://localhost:3000" }]);
  });

  it("passes no app origin when the message comes from the extension itself", async () => {
    const { handler, calls } = setup();
    const msg = { type: "MP_EXT_AUTHENTICATED_FETCH", url: "https://music.youtube.com/" };
    await handler(msg, { url: `${EXTENSION_ORIGIN}/popup.html` });
    assert.deepEqual(calls.authenticatedFetch, [{ msg, appOrigin: null }]);
  });
});
