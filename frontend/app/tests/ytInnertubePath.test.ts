import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isValidInnerTubeKey, parseInnerTubeSubpath } from '../src/lib/yt-proxy/innertubePath';

describe('parseInnerTubeSubpath', () => {
  it('accepts known endpoint shapes', () => {
    assert.equal(parseInnerTubeSubpath(['player']), 'player');
    assert.equal(parseInnerTubeSubpath(['music', 'get_search_suggestions']), 'music/get_search_suggestions');
    assert.equal(parseInnerTubeSubpath(['account', 'account_menu']), 'account/account_menu');
  });

  it('strips a leading youtubei/v1 prefix', () => {
    assert.equal(parseInnerTubeSubpath(['youtubei', 'v1', 'browse']), 'browse');
    assert.equal(parseInnerTubeSubpath(['youtubei', 'v1', 'like', 'like']), 'like/like');
  });

  it('rejects traversal, encoded separators and query characters', () => {
    const bad = [
      ['..', '..', 'robots.txt'],
      ['..%2F..%2Frobots.txt'],
      ['../../robots.txt'],
      ['%2e%2e', 'robots'],
      ['.'],
      ['a?b=c'],
      ['a#b'],
      ['a/b'],
      ['a%2Fb'],
      ['a b'],
      ['player', ''],
      [''],
    ];
    for (const segments of bad) {
      assert.equal(parseInnerTubeSubpath(segments), null, JSON.stringify(segments));
    }
  });

  it('rejects empty paths', () => {
    assert.equal(parseInnerTubeSubpath(undefined), null);
    assert.equal(parseInnerTubeSubpath([]), null);
    assert.equal(parseInnerTubeSubpath(['youtubei', 'v1']), null);
  });
});

describe('isValidInnerTubeKey', () => {
  it('accepts the public key format only', () => {
    assert.equal(isValidInnerTubeKey('AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8'), true);
    assert.equal(isValidInnerTubeKey(''), false);
    assert.equal(isValidInnerTubeKey('short'), false);
    assert.equal(isValidInnerTubeKey('AIzaSyAO_FJ2SlqU8Q4STEHLGCilw&evil=1'), false);
  });
});
