import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createDemoCredentials } from '../src/stores/demoCredentials';

describe('createDemoCredentials', () => {
  it('builds a demo email from a random uuid', () => {
    const { email } = createDemoCredentials();
    assert.match(email, /^demo-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}@ganegan\.app$/);
  });

  it('generates a long password from unambiguous characters', () => {
    const { password } = createDemoCredentials();
    assert.equal(password.length, 24);
    assert.match(password, /^[A-HJ-NP-Za-km-z2-9]{24}$/);
  });

  it('never repeats an email or a password', () => {
    const batch = Array.from({ length: 200 }, createDemoCredentials);
    assert.equal(new Set(batch.map((c) => c.email)).size, 200);
    assert.equal(new Set(batch.map((c) => c.password)).size, 200);
  });

  it('does not use the old hardcoded password or the 4 digit email scheme', () => {
    const { email, password } = createDemoCredentials();
    assert.notEqual(password, 'DemoPassword123!');
    assert.doesNotMatch(email, /^listener\.\d{4}@/);
  });

  it('uses every character of the alphabet roughly evenly', () => {
    const counts = new Map<string, number>();
    for (let i = 0; i < 2000; i++) {
      for (const ch of createDemoCredentials().password) counts.set(ch, (counts.get(ch) ?? 0) + 1);
    }
    assert.equal(counts.size, 57);
    const expected = (2000 * 24) / 57;
    for (const n of counts.values()) assert.ok(Math.abs(n - expected) < expected * 0.2, `skewed count ${n}`);
  });
});
