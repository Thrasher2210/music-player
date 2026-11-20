export interface VideoMetadata {
  title: string;
  artist: string;
}

export interface MetadataResolver {
  resolve(videoId: string): Promise<VideoMetadata | null>;
}

const OEMBED_ENDPOINT = 'https://www.youtube.com/oembed';
const OEMBED_TIMEOUT_MS = 3000;

/**
 * Looks up the real title and channel name of a video through YouTube oEmbed,
 * so lyrics are never stored against metadata supplied by the client.
 */
export class OembedMetadataResolver implements MetadataResolver {
  private fetchFn: typeof fetch;

  constructor(customFetch?: typeof fetch) {
    this.fetchFn = customFetch ?? fetch;
  }

  async resolve(videoId: string): Promise<VideoMetadata | null> {
    const params = new URLSearchParams({
      url: `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
      format: 'json',
    });

    try {
      const res = await this.fetchFn(`${OEMBED_ENDPOINT}?${params.toString()}`, {
        signal: AbortSignal.timeout(OEMBED_TIMEOUT_MS),
      });
      if (!res.ok) return null;

      const data = (await res.json()) as { title?: unknown; author_name?: unknown };
      if (typeof data.title !== 'string' || !data.title.trim()) return null;

      return {
        title: data.title,
        artist: typeof data.author_name === 'string' ? data.author_name : '',
      };
    } catch {
      return null;
    }
  }
}
