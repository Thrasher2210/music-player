import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  NativeHttpAdapter,
  DevProxyAdapter,
  WebExtensionAdapter,
  ShakaMseAudioDriver,
  buildSabrFormat,
} from '../src/index';

describe('Drivers & Network Adapters', () => {
  it('verifies adapters instantiate and configure correctly', () => {
    const native = new NativeHttpAdapter();
    assert.equal(native.name, 'native-http');

    const devProxy = new DevProxyAdapter({ proxyBaseUrl: '/api/yt' });
    assert.equal(devProxy.name, 'dev-proxy');

    const extAdapter = new WebExtensionAdapter(5000);
    assert.equal(extAdapter.name, 'web-extension');
  });

  it('buildSabrFormat builds valid SABR formats and ShakaMseAudioDriver initializes cleanly', async () => {
    const sabrFmt = buildSabrFormat({
      itag: 251,
      mimeType: 'audio/webm; codecs="opus"',
      bitrate: 160000,
      audioSampleRate: '48000',
      audioChannels: 2,
    } as any);

    assert.equal(sabrFmt.itag, 251);
    assert.equal(sabrFmt.codecCode, 'o');

    const driver = new ShakaMseAudioDriver();
    assert.equal(driver.name, 'shaka-mse');
    assert.equal(driver.getState(), 'idle');
    await driver.initialize();
    assert.equal(driver.getState(), 'idle');
    await driver.destroy();
  });

  it('reliably resolves proxied stream URLs in DevProxyAdapter', () => {
    const devProxy = new DevProxyAdapter({ proxyBaseUrl: '/api/yt' });
    const rawStreamUrl = 'https://rr1---sn-example.googlevideo.com/videoplayback?itag=251';

    // In non-browser / normal environment, returns proxied URL
    const proxiedUrl = devProxy.resolveStreamUrl(rawStreamUrl);
    assert.ok(proxiedUrl.includes('/api/yt/stream?url='));
    assert.ok(proxiedUrl.includes(encodeURIComponent(rawStreamUrl)));

    // Even when window.__MP_EXTENSION_ACTIVE__ is active, continues to safely route via stream proxy
    const originalWindow = (globalThis as any).window;
    try {
      (globalThis as any).window = {
        location: { origin: 'http://localhost:3000' },
        __MP_EXTENSION_ACTIVE__: true,
      };

      const resolvedUrl = devProxy.resolveStreamUrl(rawStreamUrl);
      assert.ok(resolvedUrl.includes('/api/yt/stream?url='));
      assert.ok(resolvedUrl.includes(encodeURIComponent(rawStreamUrl)));
    } finally {
      if (originalWindow !== undefined) {
        (globalThis as any).window = originalWindow;
      } else {
        delete (globalThis as any).window;
      }
    }
  });

  it('supports setPlaybackRate and getPlaybackRate on ShakaMseAudioDriver syncing with mediaElement', () => {
    const driver = new ShakaMseAudioDriver();
    assert.equal(driver.getPlaybackRate(), 1);

    driver.setPlaybackRate(1.5);
    assert.equal(driver.getPlaybackRate(), 1.5);

    // Test synchronization with mediaElement
    const mockMediaEl = {
      playbackRate: 1.5,
      volume: 1,
    } as HTMLMediaElement;
    (driver as any).mediaElement = mockMediaEl;

    driver.setPlaybackRate(1.25);
    assert.equal(mockMediaEl.playbackRate, 1.25);
    assert.equal(driver.getPlaybackRate(), 1.25);

    mockMediaEl.playbackRate = 0.75;
    assert.equal(driver.getPlaybackRate(), 0.75);
  });
});
