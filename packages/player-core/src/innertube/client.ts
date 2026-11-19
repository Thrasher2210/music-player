import {
  AlbumDetails,
  ArtistDetails,
  HomeFeedData,
  InnerTubeClientName,
  NextRadioData,
  PlayerResponse,
  RemotePlaylistDetails,
  Track,
} from '../types';
import { NativeHttpAdapter, NetworkAdapter } from '../adapters/network';
import {
  INNERTUBE_CONTEXTS,
  INNERTUBE_PUBLIC_KEY,
  InnerTubeClientOptions,
} from './contexts';
import { parseSearchResults } from './searchParsers';
import { parseHomeFeed, parseNextRadio } from './feedParsers';
import {
  parseAlbumDetails,
  parseArtistDetails,
  parsePlaylistDetails,
} from './browseParsers';

export * from './contexts';
export * from './parsers';
export * from './shelfParsers';
export * from './searchParsers';
export * from './feedParsers';
export * from './browseParsers';

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

    return this.network.postJson<PlayerResponse>(endpoint, payload, {
      'Content-Type': 'text/plain',
      'X-YouTube-Client-Name': context.client.clientName,
      'X-YouTube-Client-Version': context.client.clientVersion,
    });
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

    const data = await this.network.postJson<any>(endpoint, payload, {
      'Content-Type': 'text/plain',
      'X-YouTube-Client-Name': context.client.clientName,
      'X-YouTube-Client-Version': context.client.clientVersion,
    });

    return this.parseSearchResults(data);
  }

  /**
   * Fetch YouTube Music Home feed (chips, quick picks, shelves)
   */
  async getHomeFeed(moodParam?: string): Promise<HomeFeedData> {
    const browseId = 'FEmusic_home';
    const data = await this.browse(browseId, moodParam);
    return this.parseHomeFeed(data);
  }

  /**
   * Fetch Up Next radio queue and related content for a given videoId
   */
  async getNextRadio(
    videoId: string,
    playlistId?: string,
    clientName: InnerTubeClientName = 'WEB_REMIX'
  ): Promise<NextRadioData> {
    const context = INNERTUBE_CONTEXTS[clientName];
    const endpoint = `${this.baseUrl}/youtubei/v1/next?key=${INNERTUBE_PUBLIC_KEY}&prettyPrint=false`;

    const payload: Record<string, any> = {
      context,
      videoId,
      enablePersistentPlaylistPanel: true,
      isAudioOnly: true,
    };
    if (playlistId) {
      payload.playlistId = playlistId;
    }

    const data = await this.network.postJson<any>(endpoint, payload, {
      'Content-Type': 'text/plain',
      'X-YouTube-Client-Name': context.client.clientName,
      'X-YouTube-Client-Version': context.client.clientVersion,
    });

    return this.parseNextRadio(data);
  }

  /**
   * Raw browse request against YouTube Music InnerTube API
   */
  async browse(
    browseId: string,
    params?: string,
    clientName: InnerTubeClientName = 'WEB_REMIX'
  ): Promise<any> {
    const context = INNERTUBE_CONTEXTS[clientName];
    const endpoint = `${this.baseUrl}/youtubei/v1/browse?key=${INNERTUBE_PUBLIC_KEY}&prettyPrint=false`;

    const payload: Record<string, any> = {
      context,
      browseId,
    };
    if (params) {
      payload.params = params;
    }

    return this.network.postJson<any>(endpoint, payload, {
      'Content-Type': 'text/plain',
      'X-YouTube-Client-Name': context.client.clientName,
      'X-YouTube-Client-Version': context.client.clientVersion,
    });
  }

  /**
   * Fetch full artist details including top songs, albums, singles, and related artists
   */
  async getArtist(browseId: string): Promise<ArtistDetails> {
    const data = await this.browse(browseId);
    return parseArtistDetails(browseId, data, (d) => this.parseSearchResults(d));
  }

  /**
   * Fetch full album details and tracklist
   */
  async getAlbum(browseId: string): Promise<AlbumDetails> {
    const data = await this.browse(browseId);
    return parseAlbumDetails(browseId, data, (d) => this.parseSearchResults(d));
  }

  /**
   * Fetch full playlist details and tracklist (YouTube or remote)
   */
  async getPlaylist(playlistId: string): Promise<RemotePlaylistDetails> {
    const cleanId = playlistId.replace(/^VL/, '');
    const browseId = `VL${cleanId}`;
    const data = await this.browse(browseId);
    return parsePlaylistDetails(playlistId, data, (d) => this.parseSearchResults(d));
  }

  /**
   * Parse YouTube Music Home feed browse response into chips, quick picks, and shelves
   */
  parseHomeFeed(data: any): HomeFeedData {
    return parseHomeFeed(data);
  }

  /**
   * Parse YouTube Music Next response into Up Next queue and Related shelves
   */
  parseNextRadio(data: any): NextRadioData {
    return parseNextRadio(data);
  }

  /**
   * Robust parser extracting Track[] from various InnerTube response layouts
   */
  parseSearchResults(data: any): Track[] {
    return parseSearchResults(data);
  }
}
