import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../src/server.js";
import { auth, trustedOrigins } from "../src/auth.js";

describe("Better Auth Integration Tests", () => {
  let app: FastifyInstance;

  before(async () => {
    app = await buildServer({ logger: false });
    await app.ready();
  });

  after(async () => {
    await app.close();
  });

  it("verifies CORS configuration includes trusted origins and credentials", async () => {
    assert.ok(trustedOrigins.includes("http://localhost:3000"));
    assert.ok(trustedOrigins.includes("http://localhost:4000"));

    const res = await app.inject({
      method: "OPTIONS",
      url: "/api/playlists",
      headers: {
        origin: "http://localhost:3000",
        "access-control-request-method": "GET",
      },
    });

    assert.equal(res.headers["access-control-allow-origin"], "http://localhost:3000");
    assert.equal(res.headers["access-control-allow-credentials"], "true");
  });

  it("registers Better Auth hook and responds on /api/auth/ok", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/auth/ok",
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.ok, true);
  });

  describe("Authentication Flow (Sign Up, Sign In, Session, Sign Out)", () => {
    const testEmail = `auth-test-${Date.now()}@example.com`;
    const testPassword = "SuperSecurePassword123!";
    const testName = "Auth Tester";

    let sessionToken: string;
    let sessionCookie: string;

    it("signs up with email and password", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/sign-up/email",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        payload: {
          email: testEmail,
          password: testPassword,
          name: testName,
        },
      });

      assert.equal(res.statusCode, 200);
      const data = JSON.parse(res.body);
      assert.ok(data.user);
      assert.equal(data.user.email, testEmail);
      assert.equal(data.user.name, testName);
      assert.ok(data.token);

      const setCookie = res.headers["set-cookie"];
      assert.ok(setCookie);
      const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
      assert.match(cookieStr, /better-auth\.session_token=/);
    });

    it("prevents duplicate sign-up with same email", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/sign-up/email",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        payload: {
          email: testEmail,
          password: testPassword,
          name: "Duplicate User",
        },
      });

      // Better Auth returns 400 or 422 for existing user
      assert.ok(res.statusCode >= 400 && res.statusCode < 500);
    });

    it("signs in with valid email/password and returns session cookie and token", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/sign-in/email",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        payload: {
          email: testEmail,
          password: testPassword,
        },
      });

      assert.equal(res.statusCode, 200);
      const data = JSON.parse(res.body);
      assert.ok(data.token);
      assert.equal(data.user.email, testEmail);

      sessionToken = data.token;
      const setCookie = res.headers["set-cookie"];
      assert.ok(setCookie);
      sessionCookie = Array.isArray(setCookie) ? setCookie.join("; ") : setCookie;
      assert.match(sessionCookie, /better-auth\.session_token=/);
    });

    it("queries session using the session cookie", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/auth/get-session",
        headers: {
          origin: "http://localhost:3000",
          cookie: sessionCookie,
        },
      });

      assert.equal(res.statusCode, 200);
      const data = JSON.parse(res.body);
      assert.ok(data);
      assert.equal(data.user?.email, testEmail);
      assert.equal(data.session?.token, sessionToken);
    });

    it("queries session using Bearer authorization header with session token", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/auth/get-session",
        headers: {
          origin: "http://localhost:3000",
          authorization: `Bearer ${sessionToken}`,
        },
      });

      assert.equal(res.statusCode, 200);
      const data = JSON.parse(res.body);
      assert.ok(data);
      assert.equal(data.user?.email, testEmail);
      assert.equal(data.session?.token, sessionToken);
    });

    it("allows access to protected routes with authenticated session", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/playlists",
        headers: {
          origin: "http://localhost:3000",
          cookie: sessionCookie,
        },
      });

      assert.equal(res.statusCode, 200);
      const data = JSON.parse(res.body);
      assert.ok(Array.isArray(data.playlists));
    });

    it("rejects protected routes when unauthenticated", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/playlists",
        headers: {
          origin: "http://localhost:3000",
        },
      });

      assert.equal(res.statusCode, 401);
    });

    it("signs out and revokes the active session", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/sign-out",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: sessionCookie,
        },
      });

      assert.equal(res.statusCode, 200);

      // Verify get-session returns null with old cookie
      const sessionRes = await app.inject({
        method: "GET",
        url: "/api/auth/get-session",
        headers: {
          origin: "http://localhost:3000",
          cookie: sessionCookie,
        },
      });

      assert.equal(sessionRes.statusCode, 200);
      const data = JSON.parse(sessionRes.body);
      assert.equal(data, null);

      // Verify protected route now rejects the old session cookie
      const protectedRes = await app.inject({
        method: "GET",
        url: "/api/playlists",
        headers: {
          origin: "http://localhost:3000",
          cookie: sessionCookie,
        },
      });

      assert.equal(protectedRes.statusCode, 401);
    });
  });

  describe("Error Handling on Invalid Credentials", () => {
    it("returns error on sign in with wrong password", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/sign-in/email",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        payload: {
          email: "some-user@example.com",
          password: "wrongpassword123",
        },
      });

      assert.ok(res.statusCode === 400 || res.statusCode === 401);
      const data = JSON.parse(res.body);
      assert.ok(data.message || data.error || data.code);
    });

    it("returns error on sign in with non-existent user", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/sign-in/email",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        payload: {
          email: `non-existent-${Date.now()}@example.com`,
          password: "password123",
        },
      });

      assert.ok(res.statusCode === 400 || res.statusCode === 401);
    });

    it("returns error on sign in with empty body / invalid payload", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/sign-in/email",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        payload: {},
      });

      assert.ok(res.statusCode >= 400 && res.statusCode < 500);
    });
  });
});
