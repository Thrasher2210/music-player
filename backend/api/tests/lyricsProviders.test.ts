import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LrclibProvider } from '../src/lyrics/providers/lrclib.js';
import { InnertubeProvider } from '../src/lyrics/providers/innertube.js';
import { KugouProvider } from '../src/lyrics/providers/kugou.js';

describe('4. LRCLIB Provider', () => {
  it('calls exact match and parses synced lyrics', async () => {
    const mockFetch: typeof fetch = async (url) => {
      const urlStr = url.toString();
      if (urlStr.includes('/api/get')) {
        return new Response(
          JSON.stringify({
            trackName: 'Test Song',
            artistName: 'Test Artist',
            duration: 200,
            syncedLyrics: '[00:05.00]Hello world\n[00:10.00]Second line',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response('Not Found', { status: 404 });
    };

    const provider = new LrclibProvider(mockFetch);
    const result = await provider.fetchLyrics({
      videoId: 'vid1',
      title: 'Test Song',
      artist: 'Test Artist',
      durationSec: 200,
    });

    assert.ok(result);
    assert.equal(result.synced, true);
    assert.equal(result.source, 'lrclib');
    assert.equal(result.lines.length, 2);
    assert.equal(result.lines[0].text, 'Hello world');
  });

  it('falls back to /api/search when exact match returns 404, matching within 4s duration', async () => {
    const mockFetch: typeof fetch = async (url) => {
      const urlStr = url.toString();
      if (urlStr.includes('/api/get')) {
        return new Response('Not Found', { status: 404 });
      }
      if (urlStr.includes('/api/search')) {
        return new Response(
          JSON.stringify([
            {
              trackName: 'Wrong Duration',
              artistName: 'Test Artist',
              duration: 300,
              syncedLyrics: '[00:01.00]Wrong',
            },
            {
              trackName: 'Matched Duration',
              artistName: 'Test Artist',
              duration: 202, // within 4s of 200
              syncedLyrics: '[00:05.00]Search matched line',
            },
          ]),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response('Not Found', { status: 404 });
    };

    const provider = new LrclibProvider(mockFetch);
    const result = await provider.fetchLyrics({
      videoId: 'vid2',
      title: 'Matched Duration',
      artist: 'Test Artist',
      durationSec: 200,
    });

    assert.ok(result);
    assert.equal(result.synced, true);
    assert.equal(result.lines[0].text, 'Search matched line');
  });

  it('handles instrumental tracks', async () => {
    const mockFetch: typeof fetch = async () => {
      return new Response(
        JSON.stringify({
          trackName: 'Instrumental Track',
          instrumental: true,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    };

    const provider = new LrclibProvider(mockFetch);
    const result = await provider.fetchLyrics({
      videoId: 'vid3',
      title: 'Instrumental Track',
      artist: 'Artist',
    });

    assert.ok(result);
    assert.equal(result.synced, false);
    assert.equal(result.plainLyrics, '[Instrumental]');
  });
});

describe('5. InnerTube Provider', () => {
  it('parses YouTube player captions (timed-text json3)', async () => {
    const mockFetch: typeof fetch = async (url) => {
      const urlStr = url.toString();
      if (urlStr.includes('/youtubei/v1/player')) {
        return new Response(
          JSON.stringify({
            captions: {
              playerCaptionsTracklistRenderer: {
                captionTracks: [
                  {
                    baseUrl: 'https://www.youtube.com/api/timedtext?v=test',
                    languageCode: 'en',
                  },
                ],
              },
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }

      if (urlStr.includes('/api/timedtext')) {
        return new Response(
          JSON.stringify({
            events: [
              {
                tStartMs: 5000,
                dDurationMs: 2000,
                segs: [
                  { utf8: 'Hello ', tOffsetMs: 0 },
                  { utf8: 'world', tOffsetMs: 500 },
                ],
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }

      return new Response('Not Found', { status: 404 });
    };

    const provider = new InnertubeProvider(mockFetch);
    const result = await provider.fetchLyrics({ videoId: 'tube1' });

    assert.ok(result);
    assert.equal(result.synced, true);
    assert.equal(result.source, 'innertube');
    assert.equal(result.lines.length, 1);
    assert.equal(result.lines[0].time, 5);
    assert.equal(result.lines[0].text, 'Hello world');
    assert.equal(result.lines[0].words?.length, 2);
  });
});

describe('6. KuGou Provider', () => {
  it('searches, downloads, and decodes base64 LRC lyrics', async () => {
    const lrcText = '[00:08.50]KuGou Synced Line\n[00:15.00]Second Line';
    const base64Lrc = Buffer.from(lrcText, 'utf-8').toString('base64');

    const mockFetch: typeof fetch = async (url) => {
      const urlStr = url.toString();
      if (urlStr.includes('/search/song')) {
        return new Response(
          JSON.stringify({
            data: {
              info: [{ hash: 'HASH123', songname: 'Song', duration: 180 }],
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }

      if (urlStr.includes('krcs.kugou.com/search')) {
        return new Response(
          JSON.stringify({
            candidates: [{ id: 9999, accesskey: 'ACCESSKEY123' }],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }

      if (urlStr.includes('krcs.kugou.com/download')) {
        return new Response(
          JSON.stringify({
            status: 200,
            content: base64Lrc,
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }

      return new Response('Not Found', { status: 404 });
    };

    const provider = new KugouProvider(mockFetch);
    const result = await provider.fetchLyrics({
      videoId: 'kg1',
      title: 'Anime Song',
      artist: 'Anime Artist',
      durationSec: 180,
    });

    assert.ok(result);
    assert.equal(result.synced, true);
    assert.equal(result.source, 'kugou');
    assert.equal(result.lines.length, 2);
    assert.equal(result.lines[0].text, 'KuGou Synced Line');
  });
});
