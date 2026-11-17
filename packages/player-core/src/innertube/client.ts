import {
  AudioFormat,
  InnerTubeClientName,
  InnerTubeContext,
  PlayerResponse,
  Track,
} from '../types';
import { NativeHttpAdapter, NetworkAdapter } from '../adapters/network';

export const INNERTUBE_PUBLIC_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';

export const INNERTUBE_CONTEXTS: Record<InnerTubeClientName, InnerTubeContext> = {
  VISIONOS: {
    client: {
      clientName: 'VISIONOS',
      clientVersion: '1.02',
      hl: 'en',
      gl: 'US',
      deviceMake: 'Apple',
      osName: 'visionOS',
      platform: 'MOBILE',
    },
  },
  IOS: {
    client: {
      clientName: 'iOS',
      clientVersion: '20.11.6',
      hl: 'en',
      gl: 'US',
      deviceMake: 'Apple',
      osName: 'iOS',
      platform: 'MOBILE',
    },
  },
  WEB_REMIX: {
    client: {
      clientName: 'WEB_REMIX',
      clientVersion: '1.20240101.01.00',
      hl: 'en',
      gl: 'US',
      osName: 'Windows',
      osVersion: '10.0',
      platform: 'DESKTOP',
    },
  },
  WEB: {
    client: {
      clientName: 'WEB',
      clientVersion: '2.20240101.01.00',
      hl: 'en',
      gl: 'US',
      osName: 'Windows',
      osVersion: '10.0',
      platform: 'DESKTOP',
    },
  },
  MWEB: {
    client: {
      clientName: 'MWEB',
      clientVersion: '2.20240101.01.00',
      hl: 'en',
      gl: 'US',
      osName: 'Android',
      osVersion: '14',
      platform: 'MOBILE',
    },
  },
};

export interface InnerTubeClientOptions {
  networkAdapter?: NetworkAdapter;
  baseUrl?: string;
}

export class InnerTubeClient {
  private network: NetworkAdapter;
  private baseUrl: string;

  constructor(options: InnerTubeClientOptions = {}) {
    this.network = options.networkAdapter || new NativeHttpAdapter();
    this.baseUrl = options.baseUrl || 'https://music.youtube.com';
  }

  setNetworkAdapter(adapter: NetworkAdapter): void {
    this.network = adapter;
  }

  getNetworkAdapter(): NetworkAdapter {
    return this.network;
  }

  /**
   * Fetch player streaming metadata for a videoId using text/plain JSON POST
   */
  async getPlayer(
    videoId: string,
    clientName: InnerTubeClientName = 'VISIONOS'
  ): Promise<PlayerResponse> {
    const context = INNERTUBE_CONTEXTS[clientName];
    const endpoint = `${this.baseUrl}/youtubei/v1/player?key=${INNERTUBE_PUBLIC_KEY}&prettyPrint=false`;

    const payload = {
      context,
      videoId,
      contentCheckOk: true,
      racyCheckOk: true,
      playbackContext: {
        contentPlaybackContext: {
          signatureTimestamp: 19800,
        },
      },
    };

    const data = await this.network.postJson<PlayerResponse>(endpoint, payload, {
      'Content-Type': 'text/plain',
      'X-YouTube-Client-Name': context.client.clientName,
      'X-YouTube-Client-Version': context.client.clientVersion,
    });

    return data;
  }

  /**
   * Search InnerTube and parse matching tracks
   */
  async search(
    query: string,
    clientName: InnerTubeClientName = 'WEB_REMIX',
    params?: string
  ): Promise<Track[]> {
    const context = INNERTUBE_CONTEXTS[clientName];
    const endpoint = `${this.baseUrl}/youtubei/v1/search?key=${INNERTUBE_PUBLIC_KEY}&prettyPrint=false`;

    const payload: Record<string, any> = {
      context,
      query,
    };
    if (params) {
      payload.params = params;
    }

    const rawResponse = await this.network.postJson<any>(endpoint, payload, {
      'Content-Type': 'text/plain',
      'X-YouTube-Client-Name': context.client.clientName,
      'X-YouTube-Client-Version': context.client.clientVersion,
    });

    return this.parseSearchResults(rawResponse);
  }

  /**
   * Robust parser extracting Track[] from various InnerTube response layouts
   */
  parseSearchResults(data: any): Track[] {
    const tracks: Track[] = [];
    if (!data) return tracks;

    // Helper to parse time string (e.g. "3:42" or "1:02:15") into total seconds
    const parseDuration = (timeStr?: string): number => {
      if (!timeStr) return 0;
      const parts = timeStr.trim().split(':').map((p) => parseInt(p, 10));
      if (parts.some((n) => isNaN(n))) return 0;
      if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
      }
      if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
      return 0;
    };

    const processItem = (item: any) => {
      // 1. YouTube Music Responsive List Item
      if (item.musicResponsiveListItemRenderer) {
        const renderer = item.musicResponsiveListItemRenderer;
        const flexColumns = renderer.flexColumns || [];

        // Extract videoId
        let videoId: string | undefined =
          renderer.playlistItemData?.videoId ||
          renderer.overlay?.musicItemThumbnailOverlayRenderer?.content
            ?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId;

        // Extract title
        let title = '';
        const titleRuns =
          flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs;
        if (titleRuns && titleRuns.length > 0) {
          title = titleRuns[0].text;
          if (!videoId && titleRuns[0].navigationEndpoint?.watchEndpoint?.videoId) {
            videoId = titleRuns[0].navigationEndpoint.watchEndpoint.videoId;
          }
        }

        // Extract artist & duration from second column
        let artist = 'Unknown Artist';
        let duration = 0;
        const subRuns =
          flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs;
        if (subRuns && subRuns.length > 0) {
          const runTexts: string[] = subRuns
            .map((r: any) => r.text)
            .filter((t: string) => t && t !== ' • ' && t !== '•');

          if (runTexts.length > 0) {
            artist = runTexts[0];
          }

          // Check if any run is a duration e.g. "3:42"
          for (const text of runTexts) {
            if (/^\d+:\d+(:\d+)?$/.test(text.trim())) {
              duration = parseDuration(text);
              break;
            }
          }
        }

        // Check additional columns for duration if not found
        if (duration === 0 && flexColumns.length > 2) {
          const extraRuns =
            flexColumns[flexColumns.length - 1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs;
          if (extraRuns && extraRuns.length > 0) {
            const lastText = extraRuns[0].text;
            if (/^\d+:\d+(:\d+)?$/.test(lastText.trim())) {
              duration = parseDuration(lastText);
            }
          }
        }

        // Extract thumbnails
        const rawThumbs =
          renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
        const thumbnail =
          rawThumbs.length > 0 ? rawThumbs[rawThumbs.length - 1].url : '';

        if (videoId && title) {
          tracks.push({
            id: videoId,
            videoId,
            title,
            artist,
            duration,
            thumbnail,
            thumbnails: rawThumbs,
          });
        }
        return;
      }

      // 2. YouTube Standard Video Renderer
      if (item.videoRenderer) {
        const v = item.videoRenderer;
        const videoId = v.videoId;
        const title = v.title?.runs?.[0]?.text || v.title?.simpleText || '';
        const artist =
          v.ownerText?.runs?.[0]?.text ||
          v.shortBylineText?.runs?.[0]?.text ||
          'Unknown Artist';
        const lengthStr = v.lengthText?.simpleText || '';
        const duration = parseDuration(lengthStr);
        const thumbs = v.thumbnail?.thumbnails || [];
        const thumbnail = thumbs.length > 0 ? thumbs[thumbs.length - 1].url : '';

        if (videoId && title) {
          tracks.push({
            id: videoId,
            videoId,
            title,
            artist,
            duration,
            thumbnail,
            thumbnails: thumbs,
          });
        }
        return;
      }

      // 3. Compact Video Renderer
      if (item.compactVideoRenderer) {
        const cv = item.compactVideoRenderer;
        const videoId = cv.videoId;
        const title = cv.title?.runs?.[0]?.text || cv.title?.simpleText || '';
        const artist =
          cv.shortBylineText?.runs?.[0]?.text || 'Unknown Artist';
        const lengthStr = cv.lengthText?.simpleText || '';
        const duration = parseDuration(lengthStr);
        const thumbs = cv.thumbnail?.thumbnails || [];
        const thumbnail = thumbs.length > 0 ? thumbs[thumbs.length - 1].url : '';

        if (videoId && title) {
          tracks.push({
            id: videoId,
            videoId,
            title,
            artist,
            duration,
            thumbnail,
            thumbnails: thumbs,
          });
        }
        return;
      }
    };

    // Deep crawler to find candidate items across any InnerTube response tree
    const walkNodes = (node: any) => {
      if (!node || typeof node !== 'object') return;

      if (Array.isArray(node)) {
        for (const element of node) {
          walkNodes(element);
        }
        return;
      }

      processItem(node);

      for (const key of Object.keys(node)) {
        if (
          key === 'musicResponsiveListItemRenderer' ||
          key === 'videoRenderer' ||
          key === 'compactVideoRenderer'
        ) {
          continue;
        }
        walkNodes(node[key]);
      }
    };

    walkNodes(data);
    return tracks;
  }
}
