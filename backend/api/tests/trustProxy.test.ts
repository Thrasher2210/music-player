import { describe, it } from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { DEFAULT_TRUST_PROXY, parseTrustProxy } from "../src/trustProxy.js";

async function resolveIp(
  raw: string | undefined,
  remoteAddress: string,
  xForwardedFor?: string,
): Promise<string> {
  const app = Fastify({ trustProxy: parseTrustProxy(raw) });
  app.get("/ip", async (req) => ({ ip: req.ip }));
  const res = await app.inject({
    method: "GET",
    url: "/ip",
    remoteAddress,
    headers: xForwardedFor ? { "x-forwarded-for": xForwardedFor } : {},
  });
  await app.close();
  return JSON.parse(res.body).ip;
}

describe("parseTrustProxy", () => {
  it("defaults to proxies on the same host or private network", () => {
    assert.deepEqual(parseTrustProxy(undefined), DEFAULT_TRUST_PROXY);
    assert.deepEqual(parseTrustProxy(""), DEFAULT_TRUST_PROXY);
    assert.deepEqual(parseTrustProxy("   "), DEFAULT_TRUST_PROXY);
  });

  it("parses booleans", () => {
    assert.equal(parseTrustProxy("true"), true);
    assert.equal(parseTrustProxy("TRUE"), true);
    assert.equal(parseTrustProxy("false"), false);
    assert.equal(parseTrustProxy("0"), false);
  });

  it("parses a comma separated list of addresses", () => {
    assert.deepEqual(parseTrustProxy("10.0.0.0/8, 127.0.0.1"), ["10.0.0.0/8", "127.0.0.1"]);
    assert.deepEqual(parseTrustProxy("loopback,,"), ["loopback"]);
  });

  it("turns a hop count into a function trusting that many hops", () => {
    const trust = parseTrustProxy("2");
    assert.equal(typeof trust, "function");
    if (typeof trust !== "function") return;
    assert.equal(trust("203.0.113.1", 0), true);
    assert.equal(trust("203.0.113.1", 1), true);
    assert.equal(trust("203.0.113.1", 2), false);
  });
});

describe("trustProxy with Fastify", () => {
  const spoofed = "198.51.100.7";
  const client = "100.70.1.1";

  it("default: takes the address the proxy appended, not what the client prepended", async () => {
    assert.equal(await resolveIp(undefined, "127.0.0.1", `${spoofed}, ${client}`), client);
    assert.equal(await resolveIp(undefined, "10.1.2.3", `${spoofed}, ${client}`), client);
  });

  it("default: ignores X-Forwarded-For from a peer outside the trusted ranges", async () => {
    assert.equal(await resolveIp(undefined, "100.80.5.5", spoofed), "100.80.5.5");
  });

  it("hop count: skips as many proxies as configured", async () => {
    const chain = `${client}, 100.70.2.2`;
    assert.equal(await resolveIp("1", "127.0.0.1", chain), "100.70.2.2");
    assert.equal(await resolveIp("2", "127.0.0.1", chain), client);
  });

  it("false: always uses the socket address", async () => {
    assert.equal(await resolveIp("false", "127.0.0.1", client), "127.0.0.1");
  });
});
