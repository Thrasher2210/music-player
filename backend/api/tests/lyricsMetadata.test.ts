import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { OembedMetadataResolver } from '../src/lyrics/metadata.js';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

describe('10. oEmbed metadata resolver', () => {
  it('returns the real title and channel name for a video id', async () => {
    let requestedUrl = '';
    const resolver = new OembedMetadataResolver((async (input: any) => {
      requestedUrl = String(input);
      return jsonResponse({ title: 'Bohemian Rhapsody', author_name: 'Queen Official' });
    }) as typeof fetch);

    const metadata = await resolver.resolve('fJ9rUzIMcZQ');

    assert.deepEqual(metadata, { title: 'Bohemian Rhapsody', artist: 'Queen Official' });
    const url = new URL(requestedUrl);
    assert.equal(url.origin + url.pathname, 'https://www.youtube.com/oembed');
    assert.equal(url.searchParams.get('url'), 'https://www.youtube.com/watch?v=fJ9rUzIMcZQ');
    assert.equal(url.searchParams.get('format'), 'json');
  });

  it('encodes the video id so it cannot inject extra query parameters', async () => {
    let requestedUrl = '';
    const resolver = new OembedMetadataResolver((async (input: any) => {
      requestedUrl = String(input);
      return jsonResponse({ title: 'x' });
    }) as typeof fetch);

    await resolver.resolve('abc&format=xml');

    const url = new URL(requestedUrl);
    assert.equal(url.searchParams.get('format'), 'json');
    assert.equal(url.searchParams.get('url'), 'https://www.youtube.com/watch?v=abc%26format%3Dxml');
  });

  it('returns null when the video does not exist or is not embeddable', async () => {
    const resolver = new OembedMetadataResolver((async () =>
      new Response('Not Found', { status: 404 })) as typeof fetch);

    assert.equal(await resolver.resolve('aaaaaaaaaaa'), null);
  });

  it('returns null when the response has no usable title', async () => {
    const resolver = new OembedMetadataResolver((async () =>
      jsonResponse({ title: '  ', author_name: 'Someone' })) as typeof fetch);

    assert.equal(await resolver.resolve('aaaaaaaaaaa'), null);
  });

  it('returns null when the body is not JSON', async () => {
    const resolver = new OembedMetadataResolver((async () =>
      new Response('<html></html>', { status: 200 })) as typeof fetch);

    assert.equal(await resolver.resolve('aaaaaaaaaaa'), null);
  });

  it('returns null when the request fails or times out', async () => {
    const resolver = new OembedMetadataResolver((async () => {
      throw new Error('network down');
    }) as typeof fetch);

    assert.equal(await resolver.resolve('aaaaaaaaaaa'), null);
  });

  it('falls back to an empty artist when the channel name is missing', async () => {
    const resolver = new OembedMetadataResolver((async () =>
      jsonResponse({ title: 'Queen - Bohemian Rhapsody' })) as typeof fetch);

    assert.deepEqual(await resolver.resolve('aaaaaaaaaaa'), {
      title: 'Queen - Bohemian Rhapsody',
      artist: '',
    });
  });
});
