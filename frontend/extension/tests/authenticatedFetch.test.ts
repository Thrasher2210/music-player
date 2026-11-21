import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";

import { authenticatedFetch } from "../src/auth/youtubeAuth";

interface FetchCall {
  url: string;
  headers: Record<string, string>;
  credentials?: string;
}

const globals = globalThis as any;
const originalFetch = globals.fetch;
const originalBrowser = globals.browser;
let calls: FetchCall[];

beforeEach(() => {
  calls = [];
  globals.browser = {
    cookies: { get: async () => ({ name: "SAPISID", value: "secret-sapisid" }) },
  };
  globals.fetch = async (url: URL | string, init: RequestInit) => {
    calls.push({
      url: String(url),
      headers: init.headers as Record<string, string>,
      credentials: init.credentials,
    });
    return new Response("{}", { headers: { "content-type": "application/json" } });
  };
});

afterEach(() => {
  globals.fetch = originalFetch;
  globals.browser = originalBrowser;
});

describe("authenticatedFetch", () => {
  it("refuses targets outside YouTube and googlevideo without fetching or signing", async () => {
    for (const url of [
      "http://localhost:5432/",
      "http://127.0.0.1:3000/",
      "https://192.168.1.1.nip.io/admin",
      "https://youtube.com.evil.com/collect",
      "https://evilyoutube.com/",
      "http://www.youtube.com/",
      "not a url",
    ]) {
      const res = await authenticatedFetch({ url }, null);
      assert.equal(res.ok, false, url);
      assert.equal(res.status, 0, url);
      assert.equal(res.error, "fetch target not allowed", url);
    }
    assert.equal(calls.length, 0);
  });

  it("signs YouTube requests for the target origin and includes credentials", async () => {
    const res = await authenticatedFetch({ url: "https://music.youtube.com/youtubei/v1/browse", body: { a: 1 } }, null);
    assert.equal(res.ok, true);
    assert.equal(calls.length, 1);
    assert.match(calls[0].headers["Authorization"], /^SAPISIDHASH \d+_[0-9a-f]{40}$/);
    assert.equal(calls[0].headers["X-Origin"], "https://music.youtube.com");
    assert.equal(calls[0].credentials, "include");
  });

  it("resolves relative paths against music.youtube.com", async () => {
    await authenticatedFetch({ url: "/youtubei/v1/browse" }, null);
    assert.equal(calls[0].url, "https://music.youtube.com/youtubei/v1/browse");
  });

  it("does not sign googlevideo requests", async () => {
    await authenticatedFetch({ url: "https://rr1---sn-abc.googlevideo.com/videoplayback?itag=251" }, null);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].headers["Authorization"], undefined);
  });

  it("fetches the page's own origin without credentials or signing, and nothing else", async () => {
    const own = "http://localhost:3000";
    const res = await authenticatedFetch({ url: `${own}/api/yt/stream?url=x`, headers: { Range: "bytes=0-1" } }, own);
    assert.equal(res.ok, true);
    assert.equal(calls[0].credentials, "omit");
    assert.equal(calls[0].headers["Authorization"], undefined);

    const other = await authenticatedFetch({ url: "http://localhost:5432/" }, own);
    assert.equal(other.error, "fetch target not allowed");
    assert.equal(calls.length, 1);
  });
});
