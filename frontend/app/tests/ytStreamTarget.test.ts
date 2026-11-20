import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isValidVideoId, parseStreamTarget } from '../src/lib/yt-proxy/streamTarget';

describe('parseStreamTarget', () => {
  const allowed = [
    'https://rr1---sn-abc.googlevideo.com/videoplayback?itag=251&c=WEB_REMIX',
    'https://redirector.googlevideo.com/videoplayback?id=1',
  ];
  for (const url of allowed) {
    it(`allows ${url}`, () => {
      const result = parseStreamTarget(url);
      assert.equal(result.ok, true);
    });
  }

  const forbidden = [
    'https://www.youtube.com/robots.txt',
    'https://music.youtube.com/youtubei/v1/player',
    'https://evil.com/videoplayback',
    'https://googlevideo.com.evil.com/videoplayback',
    'https://evil.com/.googlevideo.com',
    'https://googlevideo.com/videoplayback',
    'https://user:pass@rr1.googlevideo.com/videoplayback',
    'https://rr1.googlevideo.com:8443/videoplayback',
    'http://rr1.googlevideo.com/videoplayback',
    'file:///etc/passwd',
    'ftp://rr1.googlevideo.com/x',
    'javascript:alert(1)',
  ];
  for (const url of forbidden) {
    it(`rejects ${url} with 403`, () => {
      const result = parseStreamTarget(url);
      assert.equal(result.ok, false);
      assert.equal(!result.ok && result.status, 403);
    });
  }

  for (const value of [null, '']) {
    it(`reports a missing url (${JSON.stringify(value)}) as 400`, () => {
      const result = parseStreamTarget(value);
      assert.equal(!result.ok && result.status, 400);
    });
  }

  for (const value of ['notaurl', '//rr1.googlevideo.com/x', 'rr1.googlevideo.com/x']) {
    it(`reports unparseable url ${value} as 400`, () => {
      const result = parseStreamTarget(value);
      assert.equal(!result.ok && result.status, 400);
    });
  }
});

describe('isValidVideoId', () => {
  it('accepts 11 char ids', () => {
    assert.equal(isValidVideoId('fJ9rUzIMcZQ'), true);
    assert.equal(isValidVideoId('a-b_c-d_e-f'), true);
  });

  it('rejects everything else', () => {
    for (const value of ['', 'short', 'toolongvideoid1', 'fJ9rUzIMc Q', '../etc/pas', null, undefined]) {
      assert.equal(isValidVideoId(value), false, String(value));
    }
  });
});
