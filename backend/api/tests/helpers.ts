import assert from "node:assert/strict";
import type { FastifyInstance } from "fastify";

export interface AuthUser {
  userId: string;
  email: string;
  name: string;
  sessionToken: string;
  cookieHeader: string;
  headers: {
    origin: string;
    cookie: string;
  };
}

export async function createAuthUser(app: FastifyInstance, emailPrefix: string): Promise<AuthUser> {
  const email = `${emailPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
  const password = "TestPassword123!";
  const name = `Test User ${emailPrefix}`;

  const res = await app.inject({
    method: "POST",
    url: "/api/auth/sign-up/email",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3000",
    },
    payload: { email, password, name },
  });

  assert.equal(res.statusCode, 200, `Sign-up failed with status ${res.statusCode}: ${res.body}`);
  const data = JSON.parse(res.body);
  const setCookie = res.headers["set-cookie"];
  assert.ok(setCookie, "Missing set-cookie header on sign up");
  const cookieHeader = Array.isArray(setCookie) ? setCookie.join("; ") : setCookie;

  return {
    userId: data.user.id,
    email: data.user.email,
    name: data.user.name,
    sessionToken: data.token as string,
    cookieHeader,
    headers: {
      origin: "http://localhost:3000",
      cookie: cookieHeader,
    },
  };
}
