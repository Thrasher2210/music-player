import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  InnerTubeClient,
  WebExtensionAdapter,
  parseLikedVideos,
  parseLibraryPlaylists,
  Track,
  RemotePlaylistDetails,
} from '../src/index';
import { mockLikedVideosResponse, mockLibraryLandingResponse } from './fixtures/mockLibrary';

describe('PlayerCore - Library & Authenticated InnerTube Methods', () => {
  it('parses liked videos response into Track[]', () => {
    const tracks: Track[] = parseLikedVideos(mockLikedVideosResponse);
    assert.equal(tracks.length, 1);
    assert.equal(tracks[0].videoId, 'liked123');
    assert.equal(tracks[0].title, 'Starboy');
    assert.equal(tracks[0].artist, 'The Weeknd');
    assert.equal(tracks[0].album, 'Starboy Album');
    assert.equal(tracks[0].duration, 230);
    assert.equal(tracks[0].thumbnail, 'https://example.com/thumb_starboy.jpg');
  });

  it('parses library landing response into RemotePlaylistDetails[]', () => {
    const playlists: RemotePlaylistDetails[] = parseLibraryPlaylists(mockLibraryLandingResponse);
    assert.equal(playlists.length, 2);

    assert.equal(playlists[0].id, 'PLmidnight123');
    assert.equal(playlists[0].title, 'Midnight Chill');
    assert.equal(playlists[0].author, 'Alex Curator');
    assert.equal(playlists[0].trackCount, 24);
    assert.equal(playlists[0].coverUrl, 'https://example.com/cover_midnight.jpg');

    assert.equal(playlists[1].id, 'PLcoding456');
    assert.equal(playlists[1].title, 'Coding Beats');
    assert.equal(playlists[1].author, 'Dev Beats');
    assert.equal(playlists[1].trackCount, 60);
    assert.equal(playlists[1].coverUrl, 'https://example.com/cover_coding.jpg');
  });

  it('getLikedVideos and getLibraryPlaylists fetch and parse successfully via InnerTubeClient', async () => {
    const mockAdapter = {
      name: 'mock-auth',
      fetch: async () => new Response('{}'),
      postJson: async <T>(_url: string, body: any): Promise<T> => {
        if (body.browseId === 'FEmusic_liked_videos') {
          return mockLikedVideosResponse as any;
        }
        if (body.browseId === 'FEmusic_library_landing') {
          return mockLibraryLandingResponse as any;
        }
        return {} as any;
      },
    };

    const client = new InnerTubeClient({ networkAdapter: mockAdapter as any });
    const liked = await client.getLikedVideos();
    assert.equal(liked.length, 1);
    assert.equal(liked[0].videoId, 'liked123');

    const playlists = await client.getLibraryPlaylists();
    assert.equal(playlists.length, 2);
    assert.equal(playlists[0].title, 'Midnight Chill');
  });

  it('delegates to fetchAuthenticated if networkAdapter supports it', async () => {
    let authenticatedCallMade = false;
    let requestedEndpoint = '';

    const authAdapter = {
      name: 'web-extension',
      fetch: async () => new Response('{}'),
      postJson: async <T>(): Promise<T> => ({} as any),
      fetchAuthenticated: async <T>(endpoint: string, body: any): Promise<T> => {
        authenticatedCallMade = true;
        requestedEndpoint = endpoint;
        if (body.browseId === 'FEmusic_liked_videos') {
          return mockLikedVideosResponse as any;
        }
        return {} as any;
      },
    };

    const client = new InnerTubeClient({ networkAdapter: authAdapter as any });
    const liked = await client.getLikedVideos();

    assert.equal(authenticatedCallMade, true);
    assert.ok(requestedEndpoint.includes('/youtubei/v1/browse'));
    assert.equal(liked.length, 1);
    assert.equal(liked[0].videoId, 'liked123');
  });

  it('setLikeStatus invokes like and removelike endpoints with target videoId', async () => {
    const calls: { url: string; body: any }[] = [];

    const mockAdapter = {
      name: 'mock',
      fetch: async () => new Response('{}'),
      postJson: async <T>(url: string, body: any): Promise<T> => {
        calls.push({ url, body });
        return { actions: [] } as any;
      },
    };

    const client = new InnerTubeClient({ networkAdapter: mockAdapter as any });
    const likeSuccess = await client.setLikeStatus('vid123', 'LIKE');
    const removeSuccess = await client.setLikeStatus('vid123', 'INDIFFERENT');

    assert.equal(likeSuccess, true);
    assert.equal(removeSuccess, true);
    assert.equal(calls.length, 2);
    assert.ok(calls[0].url.includes('/youtubei/v1/like/like'));
    assert.equal(calls[0].body.target.videoId, 'vid123');
    assert.ok(calls[1].url.includes('/youtubei/v1/like/removelike'));
    assert.equal(calls[1].body.target.videoId, 'vid123');
  });

  it('WebExtensionAdapter checks active state and simulates message handlers', async () => {
    const listeners: ((e: any) => void)[] = [];
    const fakeWindow: any = {
      __MP_EXTENSION_ACTIVE__: false,
      addEventListener: (_type: string, fn: any) => listeners.push(fn),
      removeEventListener: (_type: string, fn: any) => {
        const idx = listeners.indexOf(fn);
        if (idx !== -1) listeners.splice(idx, 1);
      },
      postMessage: (msg: any) => {
        setTimeout(() => {
          if (msg.type === 'MP_EXT_CHECK_AUTH') {
            for (const fn of [...listeners]) {
              fn({ source: fakeWindow, data: { type: 'MP_EXT_CHECK_AUTH_RESPONSE', requestId: msg.requestId, active: true } });
            }
          } else if (msg.type === 'MP_EXT_GET_ACCOUNT') {
            for (const fn of [...listeners]) {
              fn({
                source: fakeWindow,
                data: {
                  type: 'MP_EXT_GET_ACCOUNT_RESPONSE',
                  requestId: msg.requestId,
                  connected: true,
                  hasCookie: true,
                  account: { name: 'Test User', handle: '@testuser' },
                },
              });
            }
          }
        }, 10);
      },
    };

    (globalThis as any).window = fakeWindow;

    const adapter = new WebExtensionAdapter(1000);
    const isInstalled = await adapter.checkExtension();
    assert.equal(isInstalled, true);

    const authStatus = await adapter.getYouTubeAuthStatus();
    assert.equal(authStatus.connected, true);
    assert.equal(authStatus.hasCookie, true);
    assert.equal(authStatus.account?.name, 'Test User');

    delete (globalThis as any).window;
  });
});
