import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { resolveAuthSecret } from '../src/authSecret.js';

const STRONG_SECRET = 'k3J9xQ2mZpL7vR4tY8wN5bC1dF6gH0sA';

describe('resolveAuthSecret', () => {
  describe('production', () => {
    it('returns a strong secret as is', () => {
      const env = { NODE_ENV: 'production', BETTER_AUTH_SECRET: STRONG_SECRET };
      assert.equal(resolveAuthSecret(env), STRONG_SECRET);
    });

    it('throws when the secret is missing', () => {
      assert.throws(() => resolveAuthSecret({ NODE_ENV: 'production' }), /BETTER_AUTH_SECRET/);
    });

    it('throws when the secret is empty', () => {
      assert.throws(
        () => resolveAuthSecret({ NODE_ENV: 'production', BETTER_AUTH_SECRET: '' }),
        /BETTER_AUTH_SECRET/,
      );
    });

    it('throws when the secret is shorter than 32 characters', () => {
      assert.throws(
        () => resolveAuthSecret({ NODE_ENV: 'production', BETTER_AUTH_SECRET: 'too-short' }),
        /at least 32 characters/,
      );
    });

    it('throws when the secret is the .env.example placeholder', () => {
      assert.throws(
        () =>
          resolveAuthSecret({
            NODE_ENV: 'production',
            BETTER_AUTH_SECRET: 'change-me-generate-with-openssl-rand-base64-32',
          }),
        /BETTER_AUTH_SECRET/,
      );
    });
  });

  describe('development and test', () => {
    it('returns the configured secret without warning', () => {
      const warn = mock.method(console, 'warn', () => {});
      try {
        const env = { NODE_ENV: 'development', BETTER_AUTH_SECRET: 'short-but-allowed-locally' };
        assert.equal(resolveAuthSecret(env), 'short-but-allowed-locally');
        assert.equal(warn.mock.callCount(), 0);
      } finally {
        warn.mock.restore();
      }
    });

    it('falls back to the dev secret and warns once outside tests', () => {
      const warn = mock.method(console, 'warn', () => {});
      try {
        const secret = resolveAuthSecret({ NODE_ENV: 'development' });
        assert.ok(secret.length >= 32);
        assert.equal(warn.mock.callCount(), 1);
      } finally {
        warn.mock.restore();
      }
    });

    it('treats an empty secret as missing', () => {
      const warn = mock.method(console, 'warn', () => {});
      try {
        const secret = resolveAuthSecret({ NODE_ENV: 'development', BETTER_AUTH_SECRET: '' });
        assert.ok(secret.length >= 32);
        assert.equal(warn.mock.callCount(), 1);
      } finally {
        warn.mock.restore();
      }
    });

    it('falls back silently in the test environment', () => {
      const warn = mock.method(console, 'warn', () => {});
      try {
        const secret = resolveAuthSecret({ NODE_ENV: 'test' });
        assert.ok(secret.length >= 32);
        assert.equal(warn.mock.callCount(), 0);
      } finally {
        warn.mock.restore();
      }
    });
  });
});
