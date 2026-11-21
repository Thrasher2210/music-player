import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { toRecentlyPlayed } from '../src/stores/library/recentlyPlayed';
import type { PlayHistoryItem } from '../src/stores/library/types';

const play = (videoId: string, minutesAgo: number, extra: Partial<PlayHistoryItem> = {}): PlayHistoryItem => ({
  videoId,
  playedAt: new Date(Date.UTC(2026, 0, 1, 12, 0) - minutesAgo * 60_000).toISOString(),
  msPlayed: 30000,
  title: `Title ${videoId}`,
  artist: 'Artist',
  albumArt: `https://example.com/${videoId}.jpg`,
  durationSec: 200,
  ...extra,
});

describe('toRecentlyPlayed', () => {
  it('lists each track once, most recent play first', () => {
    const tracks = toRecentlyPlayed([play('a', 30), play('b', 20), play('a', 10), play('c', 40)]);
    assert.deepEqual(tracks.map((t) => t.videoId), ['a', 'b', 'c']);
  });

  it('sorts by play time rather than trusting the input order', () => {
    const tracks = toRecentlyPlayed([play('old', 50), play('new', 1), play('mid', 25)]);
    assert.deepEqual(tracks.map((t) => t.videoId), ['new', 'mid', 'old']);
  });

  it('maps the stored details onto a track', () => {
    const [track] = toRecentlyPlayed([play('a', 1)]);
    assert.deepEqual(track, {
      id: 'a',
      videoId: 'a',
      title: 'Title a',
      artist: 'Artist',
      duration: 200,
      thumbnail: 'https://example.com/a.jpg',
    });
  });

  it('skips plays without a title and artist and falls back for missing art and duration', () => {
    const tracks = toRecentlyPlayed([
      play('hidden', 1, { title: null, artist: null }),
      play('bare', 2, { albumArt: null, durationSec: null }),
    ]);
    assert.equal(tracks.length, 1);
    assert.equal(tracks[0].videoId, 'bare');
    assert.equal(tracks[0].thumbnail, '');
    assert.equal(tracks[0].duration, 0);
  });

  it('caps the list and returns an empty list for no history', () => {
    const many = Array.from({ length: 30 }, (_, i) => play(`v${i}`, i));
    assert.equal(toRecentlyPlayed(many).length, 20);
    assert.equal(toRecentlyPlayed(many, 5).length, 5);
    assert.deepEqual(toRecentlyPlayed([]), []);
  });
});
