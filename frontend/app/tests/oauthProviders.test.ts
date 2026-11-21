import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseOAuthProviders } from '../src/app/login/oauthProviders';

describe('parseOAuthProviders', () => {
  it('defaults to Google only when the variable is not set', () => {
    assert.deepEqual(parseOAuthProviders(undefined), ['google']);
  });

  it('shows no buttons for an empty value', () => {
    assert.deepEqual(parseOAuthProviders(''), []);
  });

  it('parses a comma list, ignoring case, spaces and unknown names', () => {
    assert.deepEqual(parseOAuthProviders(' Discord , google,twitter '), ['google', 'discord']);
  });

  it('keeps a stable order and drops duplicates', () => {
    assert.deepEqual(parseOAuthProviders('apple,github,github,google'), ['google', 'github', 'apple']);
  });
});
