import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type { Track } from '@mp/player-core';
import type { LyricsResponse } from '@mp/api-contract';
import { fetchLyricsService } from '../src/stores/player/playbackServices';
import { lyricsCache } from '../src/stores/player/engineContext';
import { stubFetch } from './fetchStub';

const sampleTrack: Track = {
  id: 'vid-123',
  videoId: 'vid-123',
  title: 'Test Song',
  artist: 'Test Artist',
  duration: 180,
  thumbnail: 'https://example.com/thumb.jpg',
};

const sampleLyrics: LyricsResponse = {
  videoId: 'vid-123',
  synced: true,
  lines: [
    { time: 10, text: 'Hello world' },
    { time: 20, text: 'Second line' },
  ],
  source: 'lrclib',
};

describe('fetchLyricsService API URL resolution', () => {
  const originalEnv = process.env.NEXT_PUBLIC_API_URL;

  beforeEach(() => {
    lyricsCache.clear();
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_API_URL = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_API_URL;
    }
    lyricsCache.clear();
  });

  test('uses relative /api/lyrics URL by default when NEXT_PUBLIC_API_URL is unset', async () => {
    delete process.env.NEXT_PUBLIC_API_URL;

    const { calls, restore } = stubFetch(() => {
      return new Response(JSON.stringify(sampleLyrics), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    try {
      const stateUpdates: any[] = [];
      const set = (partial: any) => stateUpdates.push(partial);
      const get = () => ({ currentTrack: sampleTrack }) as any;

      const result = await fetchLyricsService(sampleTrack, set, get);

      assert.equal(calls.length, 1);
      assert.ok(
        calls[0].url.startsWith('/api/lyrics?'),
        `Expected relative URL starting with /api/lyrics?, got: ${calls[0].url}`
      );
      assert.ok(calls[0].url.includes('videoId=vid-123'));
      assert.ok(calls[0].url.includes('title=Test%20Song'));
      assert.ok(calls[0].url.includes('artist=Test%20Artist'));
      assert.ok(calls[0].url.includes('durationSec=180'));
      assert.deepEqual(result, sampleLyrics);
    } finally {
      restore();
    }
  });

  test('uses relative /api/lyrics URL when NEXT_PUBLIC_API_URL is empty string', async () => {
    process.env.NEXT_PUBLIC_API_URL = '';

    const { calls, restore } = stubFetch(() => {
      return new Response(JSON.stringify(sampleLyrics), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    try {
      const stateUpdates: any[] = [];
      const set = (partial: any) => stateUpdates.push(partial);
      const get = () => ({ currentTrack: sampleTrack }) as any;

      await fetchLyricsService(sampleTrack, set, get);

      assert.equal(calls.length, 1);
      assert.ok(
        calls[0].url.startsWith('/api/lyrics?'),
        `Expected relative URL, got: ${calls[0].url}`
      );
    } finally {
      restore();
    }
  });

  test('respects custom NEXT_PUBLIC_API_URL and strips trailing slash if provided', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.custombackend.com/';

    const { calls, restore } = stubFetch(() => {
      return new Response(JSON.stringify(sampleLyrics), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    try {
      const stateUpdates: any[] = [];
      const set = (partial: any) => stateUpdates.push(partial);
      const get = () => ({ currentTrack: sampleTrack }) as any;

      await fetchLyricsService(sampleTrack, set, get);

      assert.equal(calls.length, 1);
      assert.ok(
        calls[0].url.startsWith('https://api.custombackend.com/api/lyrics?'),
        `Expected custom base URL, got: ${calls[0].url}`
      );
    } finally {
      restore();
    }
  });

  test('returns cached lyrics immediately without making a network request', async () => {
    lyricsCache.set('vid-123', sampleLyrics);

    const { calls, restore } = stubFetch(() => {
      throw new Error('Should not be called');
    });

    try {
      const stateUpdates: any[] = [];
      const set = (partial: any) => stateUpdates.push(partial);
      const get = () => ({ currentTrack: sampleTrack }) as any;

      const result = await fetchLyricsService(sampleTrack, set, get);

      assert.equal(calls.length, 0);
      assert.deepEqual(result, sampleLyrics);
    } finally {
      restore();
    }
  });

  test('handles HTTP error responses gracefully', async () => {
    delete process.env.NEXT_PUBLIC_API_URL;

    const { restore } = stubFetch(() => {
      return new Response('Not Found', { status: 404 });
    });

    try {
      const stateUpdates: any[] = [];
      const set = (partial: any) => stateUpdates.push(partial);
      const get = () => ({ currentTrack: sampleTrack }) as any;

      const result = await fetchLyricsService(sampleTrack, set, get);

      assert.equal(result, null);
      const lastUpdate = stateUpdates[stateUpdates.length - 1];
      assert.equal(lastUpdate.lyrics, null);
      assert.equal(lastUpdate.isLyricsLoading, false);
      assert.ok(lastUpdate.lyricsError?.includes('404'));
    } finally {
      restore();
    }
  });
});
