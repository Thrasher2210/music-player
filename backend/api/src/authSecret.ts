const DEV_SECRET = "mp-dev-secret-key-at-least-32-chars-long";
const MIN_SECRET_LENGTH = 32;

/**
 * Resolves the Better Auth signing secret.
 * Production refuses to start without a real secret; dev and test fall back to
 * a fixed local one so a fresh checkout still boots.
 */
export function resolveAuthSecret(env: NodeJS.ProcessEnv = process.env): string {
  const secret = env.BETTER_AUTH_SECRET;

  if (env.NODE_ENV === "production") {
    if (!secret || secret.length < MIN_SECRET_LENGTH || /^change-me/i.test(secret)) {
      throw new Error(
        "BETTER_AUTH_SECRET must be set to a random value of at least 32 characters in production " +
          "(generate one with `openssl rand -base64 32`)",
      );
    }
    return secret;
  }

  if (secret) return secret;

  if (env.NODE_ENV !== "test") {
    console.warn("[auth] BETTER_AUTH_SECRET is not set, using the insecure development secret");
  }
  return DEV_SECRET;
}
