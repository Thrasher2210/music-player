import {
  AlbumDetails,
  ArtistDetails,
  AudioFormat,
  HomeFeedData,
  InnerTubeClientName,
  InnerTubeContext,
  MediaShelfData,
  MoodChipData,
  NextRadioData,
  PlayerResponse,
  RemotePlaylistDetails,
  ShelfItemData,
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

export function parseDuration(timeStr?: string): number {
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
}

export function parseTrackFromRenderer(item: any): Track | null {
  if (!item || typeof item !== 'object') return null;

  // 1. playlistPanelVideoRenderer
  if (item.playlistPanelVideoRenderer) {
    const v = item.playlistPanelVideoRenderer;
    const videoId = v.videoId || v.navigationEndpoint?.watchEndpoint?.videoId;
    const title = v.title?.runs?.[0]?.text || v.title?.simpleText || '';
    const artist =
      v.shortBylineText?.runs?.[0]?.text ||
      v.longBylineText?.runs?.[0]?.text ||
      'Unknown Artist';
    const duration = parseDuration(v.lengthText?.runs?.[0]?.text || v.lengthText?.simpleText);
    const thumbs = v.thumbnail?.thumbnails || [];
    const thumbnail = thumbs.length > 0 ? thumbs[thumbs.length - 1].url : '';
    if (videoId && title) {
      return {
        id: videoId,
        videoId,
        title,
        artist,
        duration,
        thumbnail,
        thumbnails: thumbs,
      };
    }
  }

  // 2. musicResponsiveListItemRenderer
  if (item.musicResponsiveListItemRenderer) {
    const renderer = item.musicResponsiveListItemRenderer;
    const flexColumns = renderer.flexColumns || [];

    let videoId: string | undefined =
      renderer.playlistItemData?.videoId ||
      renderer.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId;

    let title = '';
    const titleRuns = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs;
    if (titleRuns && titleRuns.length > 0) {
      title = titleRuns[0].text;
      if (!videoId && titleRuns[0].navigationEndpoint?.watchEndpoint?.videoId) {
        videoId = titleRuns[0].navigationEndpoint.watchEndpoint.videoId;
      }
    }

    let artist = 'Unknown Artist';
    let artistId: string | undefined;
    let album: string | undefined;
    let albumId: string | undefined;
    let duration = 0;
    const subRuns = flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];

    for (const r of subRuns) {
      const bId = r.navigationEndpoint?.browseEndpoint?.browseId;
      if (bId?.startsWith('UC')) {
        artist = r.text;
        artistId = bId;
      } else if (bId?.startsWith('MPREb_')) {
        album = r.text;
        albumId = bId;
      }
    }

    if (artist === 'Unknown Artist' && subRuns.length > 0) {
      const filtered = subRuns
        .filter((r: any) => r.text && r.text !== ' • ' && r.text !== '•' && !/^(song|video)$/i.test(r.text.trim()));
      if (filtered.length > 0) {
        artist = filtered[0].text;
        artistId = filtered[0].navigationEndpoint?.browseEndpoint?.browseId;
        if (filtered.length > 1 && !album) {
          album = filtered[1].text;
          albumId = filtered[1].navigationEndpoint?.browseEndpoint?.browseId;
        }
      }
    }

    for (const r of subRuns) {
      if (/^\d+:\d+(:\d+)?$/.test(r.text?.trim())) {
        duration = parseDuration(r.text);
        break;
      }
    }

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

    const rawThumbs = renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
    const thumbnail = rawThumbs.length > 0 ? rawThumbs[rawThumbs.length - 1].url : '';

    if (videoId && title) {
      return {
        id: videoId,
        videoId,
        title,
        artist,
        artistId,
        album,
        albumId,
        duration,
        thumbnail,
        thumbnails: rawThumbs,
      };
    }
  }

  // 3. musicTwoRowItemRenderer (when it has a videoId)
  if (item.musicTwoRowItemRenderer) {
    const twoRow = item.musicTwoRowItemRenderer;
    const nav = twoRow.navigationEndpoint || twoRow.title?.runs?.[0]?.navigationEndpoint;
    const videoId = nav?.watchEndpoint?.videoId;
    const title = twoRow.title?.runs?.[0]?.text || twoRow.title?.simpleText || '';
    if (videoId && title) {
      const subRuns = twoRow.subtitle?.runs;
      const artist = subRuns?.[0]?.text || twoRow.subtitle?.simpleText || 'Unknown Artist';
      const thumbs =
        twoRow.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
        twoRow.thumbnail?.thumbnails ||
        [];
      const thumbnail = thumbs.length > 0 ? thumbs[thumbs.length - 1].url : '';
      return {
        id: videoId,
        videoId,
        title,
        artist,
        duration: 0,
        thumbnail,
        thumbnails: thumbs,
      };
    }
  }

  // 4. videoRenderer
  if (item.videoRenderer) {
    const v = item.videoRenderer;
    const videoId = v.videoId;
    const title = v.title?.runs?.[0]?.text || v.title?.simpleText || '';
    const artist =
      v.ownerText?.runs?.[0]?.text ||
      v.shortBylineText?.runs?.[0]?.text ||
      'Unknown Artist';
    const duration = parseDuration(v.lengthText?.simpleText);
    const thumbs = v.thumbnail?.thumbnails || [];
    const thumbnail = thumbs.length > 0 ? thumbs[thumbs.length - 1].url : '';
    if (videoId && title) {
      return {
        id: videoId,
        videoId,
        title,
        artist,
        duration,
        thumbnail,
        thumbnails: thumbs,
      };
    }
  }

  // 5. compactVideoRenderer
  if (item.compactVideoRenderer) {
    const cv = item.compactVideoRenderer;
    const videoId = cv.videoId;
    const title = cv.title?.runs?.[0]?.text || cv.title?.simpleText || '';
    const artist = cv.shortBylineText?.runs?.[0]?.text || 'Unknown Artist';
    const duration = parseDuration(cv.lengthText?.simpleText);
    const thumbs = cv.thumbnail?.thumbnails || [];
    const thumbnail = thumbs.length > 0 ? thumbs[thumbs.length - 1].url : '';
    if (videoId && title) {
      return {
        id: videoId,
        videoId,
        title,
        artist,
        duration,
        thumbnail,
        thumbnails: thumbs,
      };
    }
  }

  return null;
}

export function parseShelfItem(item: any): ShelfItemData | null {
  if (!item || typeof item !== 'object') return null;

  // 1. musicTwoRowItemRenderer
  if (item.musicTwoRowItemRenderer) {
    const r = item.musicTwoRowItemRenderer;
    const title = r.title?.runs?.[0]?.text || r.title?.simpleText || '';
    const subRuns = r.subtitle?.runs;
    const subtitle = subRuns ? subRuns.map((s: any) => s.text).join('') : r.subtitle?.simpleText || '';

    const thumbs =
      r.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
      r.thumbnail?.thumbnails ||
      [];
    const thumbnail = thumbs.length > 0 ? thumbs[thumbs.length - 1].url : '';

    const nav = r.navigationEndpoint || r.title?.runs?.[0]?.navigationEndpoint;
    const videoId = nav?.watchEndpoint?.videoId;
    const browseId = nav?.browseEndpoint?.browseId;

    let type: 'song' | 'album' | 'playlist' | 'artist' = 'song';
    if (browseId) {
      if (browseId.startsWith('MPREb_') || browseId.startsWith('FEmusic_library_corpus_track')) {
        type = 'album';
      } else if (browseId.startsWith('VL') || browseId.startsWith('RDCLAK') || browseId.startsWith('PL')) {
        type = 'playlist';
      } else if (browseId.startsWith('UC') || browseId.startsWith('FEmusic_library_corpus_artists')) {
        type = 'artist';
      } else if (/\balbum\b/i.test(subtitle) || /\bsingle\b/i.test(subtitle) || /\bep\b/i.test(subtitle)) {
        type = 'album';
      } else if (/\bplaylist\b/i.test(subtitle)) {
        type = 'playlist';
      } else if (/\bartist\b/i.test(subtitle)) {
        type = 'artist';
      } else {
        type = videoId ? 'song' : 'album';
      }
    } else if (videoId) {
      type = 'song';
    } else if (/\bartist\b/i.test(subtitle)) {
      type = 'artist';
    } else if (/\bplaylist\b/i.test(subtitle)) {
      type = 'playlist';
    } else if (/\balbum\b/i.test(subtitle)) {
      type = 'album';
    }

    const id = videoId || browseId || (title ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : `item_${Math.random().toString(36).substring(2, 7)}`);

    if (title) {
      return {
        id,
        type,
        title,
        subtitle,
        thumbnail,
        videoId,
        browseId,
      };
    }
  }

  // 2. musicResponsiveListItemRenderer
  if (item.musicResponsiveListItemRenderer) {
    const r = item.musicResponsiveListItemRenderer;
    const flexColumns = r.flexColumns || [];

    let videoId: string | undefined =
      r.playlistItemData?.videoId ||
      r.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId;

    let title = '';
    const titleRuns = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs;
    if (titleRuns && titleRuns.length > 0) {
      title = titleRuns[0].text;
      if (!videoId && titleRuns[0].navigationEndpoint?.watchEndpoint?.videoId) {
        videoId = titleRuns[0].navigationEndpoint.watchEndpoint.videoId;
      }
    }

    let subtitle = '';
    const subRuns = flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs;
    if (subRuns && subRuns.length > 0) {
      subtitle = subRuns.map((s: any) => s.text).join('');
    }

    const browseId =
      titleRuns?.[0]?.navigationEndpoint?.browseEndpoint?.browseId ||
      subRuns?.[0]?.navigationEndpoint?.browseEndpoint?.browseId;

    const rawThumbs = r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
    const thumbnail = rawThumbs.length > 0 ? rawThumbs[rawThumbs.length - 1].url : '';

    let type: 'song' | 'album' | 'playlist' | 'artist' = 'song';
    if (videoId) {
      type = 'song';
    } else if (browseId?.startsWith('UC') || /\bartist\b/i.test(subtitle)) {
      type = 'artist';
    } else if (browseId?.startsWith('MPREb_') || /\balbum\b/i.test(subtitle) || /\bsingle\b/i.test(subtitle)) {
      type = 'album';
    } else if (browseId?.startsWith('VL') || browseId?.startsWith('PL') || /\bplaylist\b/i.test(subtitle)) {
      type = 'playlist';
    }

    const id = videoId || browseId || (title ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : `item_${Math.random().toString(36).substring(2, 7)}`);

    if (title) {
      return {
        id,
        type,
        title,
        subtitle,
        thumbnail,
        videoId,
        browseId,
      };
    }
  }

  // 3. compactVideoRenderer / videoRenderer
  const vr = item.videoRenderer || item.compactVideoRenderer;
  if (vr) {
    const videoId = vr.videoId;
    const title = vr.title?.runs?.[0]?.text || vr.title?.simpleText || '';
    const subtitle = vr.ownerText?.runs?.[0]?.text || vr.shortBylineText?.runs?.[0]?.text || '';
    const thumbs = vr.thumbnail?.thumbnails || [];
    const thumbnail = thumbs.length > 0 ? thumbs[thumbs.length - 1].url : '';
    const id = videoId || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (title) {
      return {
        id,
        type: 'song',
        title,
        subtitle,
        thumbnail,
        videoId,
      };
    }
  }

  return null;
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
   * Fetch YouTube Music Home feed with optional mood filter (e.g. Energize, Workout, Relax)
   */
  async getHomeFeed(moodParam?: string): Promise<HomeFeedData> {
    const context = INNERTUBE_CONTEXTS['WEB_REMIX'];
    const endpoint = `${this.baseUrl}/youtubei/v1/browse?key=${INNERTUBE_PUBLIC_KEY}&prettyPrint=false`;

    const payload: Record<string, any> = {
      context,
      browseId: 'FEmusic_home',
    };
    if (moodParam) {
      payload.params = moodParam;
    }

    const rawResponse = await this.network.postJson<any>(endpoint, payload, {
      'Content-Type': 'text/plain',
      'X-YouTube-Client-Name': context.client.clientName,
      'X-YouTube-Client-Version': context.client.clientVersion,
    });

    return this.parseHomeFeed(rawResponse);
  }

  /**
   * Fetch Up Next radio queue and related content for a given videoId
   */
  async getNextRadio(
    videoId: string,
    playlistId?: string
  ): Promise<{ queue: Track[]; related: ShelfItemData[] }> {
    const context = INNERTUBE_CONTEXTS['WEB_REMIX'];
    const endpoint = `${this.baseUrl}/youtubei/v1/next?key=${INNERTUBE_PUBLIC_KEY}&prettyPrint=false`;

    const payload: Record<string, any> = {
      context,
      videoId,
      playlistId: playlistId || `RDAMVM${videoId}`,
      isAudioOnly: true,
    };

    const rawResponse = await this.network.postJson<any>(endpoint, payload, {
      'Content-Type': 'text/plain',
      'X-YouTube-Client-Name': context.client.clientName,
      'X-YouTube-Client-Version': context.client.clientVersion,
    });

    return this.parseNextRadio(rawResponse);
  }

  /**
   * Generic browse request to YouTube Music browse endpoint
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

    // Extract header metadata
    const header =
      data.header?.musicImmersiveHeaderRenderer ||
      data.header?.musicVisualHeaderRenderer ||
      data.header?.musicHeaderRenderer;

    const name =
      header?.title?.runs?.[0]?.text ||
      header?.title?.simpleText ||
      'Unknown Artist';

    const subscribers =
      header?.subscriptionButton?.subscribeButtonRenderer?.subscriberCountText?.runs?.[0]?.text ||
      header?.subscriberCountText?.runs?.[0]?.text ||
      header?.subscriberCountText?.simpleText ||
      undefined;

    const bannerThumbs =
      header?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
      header?.foregroundThumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
      [];
    const bannerUrl =
      bannerThumbs.length > 0 ? bannerThumbs[bannerThumbs.length - 1].url : undefined;
    const avatarUrl =
      bannerThumbs.length > 0 ? bannerThumbs[0].url : undefined;

    const description =
      header?.description?.runs?.[0]?.text ||
      header?.description?.simpleText ||
      undefined;

    const topSongs: Track[] = [];
    const albums: ShelfItemData[] = [];
    const singles: ShelfItemData[] = [];
    const relatedArtists: ShelfItemData[] = [];

    const contents =
      data.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents ||
      data.contents?.twoColumnBrowseResultsRenderer?.secondaryContents?.sectionListRenderer?.contents ||
      [];

    for (const section of contents) {
      const shelf = section.musicShelfRenderer;
      const carousel = section.musicCarouselShelfRenderer;

      const title = (
        shelf?.title?.runs?.[0]?.text ||
        carousel?.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.[0]?.text ||
        ''
      ).toLowerCase();

      if (shelf && (/top songs|songs/i.test(title) || topSongs.length === 0)) {
        const shelfTracks = this.parseSearchResults(shelf);
        for (const t of shelfTracks) {
          if (!t.artist || t.artist === 'Unknown Artist') t.artist = name;
          if (!t.artistId) t.artistId = browseId;
          topSongs.push(t);
        }
      }

      if (carousel) {
        const items = carousel.contents || [];
        const parsedItems: ShelfItemData[] = [];
        for (const item of items) {
          const sItem = parseShelfItem(item);
          if (sItem) parsedItems.push(sItem);
        }

        if (/album/i.test(title)) {
          albums.push(...parsedItems);
        } else if (/single|ep/i.test(title)) {
          singles.push(...parsedItems);
        } else if (/fans might also like|similar|related/i.test(title)) {
          relatedArtists.push(...parsedItems);
        }
      }
    }

    // Fallback if topSongs was not found in a named shelf
    if (topSongs.length === 0) {
      const allTracks = this.parseSearchResults(data);
      for (const t of allTracks.slice(0, 10)) {
        if (!t.artist || t.artist === 'Unknown Artist') t.artist = name;
        if (!t.artistId) t.artistId = browseId;
        topSongs.push(t);
      }
    }

    return {
      id: browseId,
      name,
      subscribers,
      bannerUrl,
      avatarUrl,
      description,
      topSongs,
      albums,
      singles,
      relatedArtists,
    };
  }

  /**
   * Fetch full album details and tracklist
   */
  async getAlbum(browseId: string): Promise<AlbumDetails> {
    const data = await this.browse(browseId);

    // Locate header
    let header: any =
      data.header?.musicResponsiveHeaderRenderer ||
      data.header?.musicDetailHeaderRenderer;

    if (!header) {
      const firstSection =
        data.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0];
      if (firstSection?.musicResponsiveHeaderRenderer) {
        header = firstSection.musicResponsiveHeaderRenderer;
      }
    }

    const title =
      header?.title?.runs?.[0]?.text ||
      header?.title?.simpleText ||
      'Unknown Album';

    const straplineRuns = header?.straplineTextOne?.runs || [];
    const subtitleRuns = header?.subtitle?.runs || [];

    const artistRun = straplineRuns[0] || subtitleRuns.find((r: any) => r.navigationEndpoint?.browseEndpoint?.browseId?.startsWith('UC'));
    const artist = artistRun?.text || 'Unknown Artist';
    const artistBrowseId = artistRun?.navigationEndpoint?.browseEndpoint?.browseId;

    let year: string | undefined;
    for (const r of [...subtitleRuns, ...straplineRuns]) {
      const match = r.text?.match(/\b(19|20)\d{2}\b/);
      if (match) {
        year = match[0];
        break;
      }
    }

    const coverThumbs =
      header?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
    const coverUrl =
      coverThumbs.length > 0 ? coverThumbs[coverThumbs.length - 1].url : undefined;

    const tracks = this.parseSearchResults(data);
    for (const t of tracks) {
      if (!t.artist || t.artist === 'Unknown Artist') {
        t.artist = artist;
      }
      if (!t.artistId && artistBrowseId) {
        t.artistId = artistBrowseId;
      }
      t.album = title;
      t.albumId = browseId;
      if (!t.thumbnail && coverUrl) {
        t.thumbnail = coverUrl;
      }
    }

    return {
      id: browseId,
      title,
      artist,
      artistBrowseId,
      year,
      coverUrl,
      trackCount: tracks.length,
      tracks,
    };
  }

  /**
   * Fetch full playlist details and tracklist (YouTube or remote)
   */
  async getPlaylist(playlistId: string): Promise<RemotePlaylistDetails> {
    const cleanId = playlistId.replace(/^VL/, '');
    const browseId = `VL${cleanId}`;
    const data = await this.browse(browseId);

    let header: any =
      data.header?.musicResponsiveHeaderRenderer ||
      data.header?.musicDetailHeaderRenderer;

    if (!header) {
      const firstSection =
        data.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0];
      if (firstSection?.musicResponsiveHeaderRenderer) {
        header = firstSection.musicResponsiveHeaderRenderer;
      }
    }

    const title =
      header?.title?.runs?.[0]?.text ||
      header?.title?.simpleText ||
      'Playlist';

    const author =
      header?.straplineTextOne?.runs?.[0]?.text ||
      header?.subtitle?.runs?.[0]?.text ||
      undefined;

    const description =
      header?.description?.runs?.[0]?.text ||
      header?.description?.simpleText ||
      undefined;

    const coverThumbs =
      header?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
    const coverUrl =
      coverThumbs.length > 0 ? coverThumbs[coverThumbs.length - 1].url : undefined;

    const tracks = this.parseSearchResults(data);
    return {
      id: playlistId,
      title,
      description,
      author,
      coverUrl,
      trackCount: tracks.length,
      tracks,
    };
  }

  /**
   * Parse YouTube Music Home feed browse response into chips, quick picks, and shelves
   */
  parseHomeFeed(data: any): HomeFeedData {
    if (!data || typeof data !== 'object') {
      return { chips: [], quickPicks: [], shelves: [] };
    }

    // 1. Parse mood chips
    const chips: MoodChipData[] = [];
    const seenChipIds = new Set<string>();

    const extractChips = (node: any) => {
      if (!node || typeof node !== 'object') return;
      if (node.chipCloudChipRenderer) {
        const c = node.chipCloudChipRenderer;
        const title = c.text?.runs?.[0]?.text || c.text?.simpleText || '';
        const params = c.navigationEndpoint?.browseEndpoint?.params || undefined;
        const isActive = Boolean(c.isSelected);
        const id = c.uniqueId || params || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        if (title && !seenChipIds.has(id)) {
          seenChipIds.add(id);
          chips.push({ id, title, params, isActive });
        }
        return;
      }
      if (Array.isArray(node)) {
        for (const item of node) extractChips(item);
        return;
      }
      for (const key of Object.keys(node)) {
        extractChips(node[key]);
      }
    };
    extractChips(data);

    // 2. Parse shelves and quick picks
    const shelves: MediaShelfData[] = [];
    let quickPicks: Track[] = [];

    const processShelf = (shelfNode: any) => {
      const header = shelfNode.header?.musicCarouselShelfBasicHeaderRenderer || shelfNode.header;
      const title =
        header?.title?.runs?.[0]?.text ||
        header?.title?.simpleText ||
        shelfNode.title?.runs?.[0]?.text ||
        shelfNode.title?.simpleText ||
        '';

      const subtitle =
        header?.strapline?.runs?.[0]?.text ||
        header?.strapline?.simpleText ||
        shelfNode.strapline?.runs?.[0]?.text ||
        shelfNode.subtitle?.runs?.[0]?.text ||
        undefined;

      const rawItems = shelfNode.contents || [];
      const shelfItems: ShelfItemData[] = [];
      const shelfTracks: Track[] = [];

      for (const item of rawItems) {
        const shelfItem = parseShelfItem(item);
        if (shelfItem) {
          shelfItems.push(shelfItem);
        }
        const track = parseTrackFromRenderer(item);
        if (track) {
          shelfTracks.push(track);
        }
      }

      if (shelfItems.length > 0 || title) {
        const id =
          shelfNode.id ||
          (title ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : `shelf_${shelves.length + 1}`);

        shelves.push({
          id,
          title,
          subtitle,
          items: shelfItems,
        });

        const isQuickPickShelf =
          /quick\s*pick/i.test(title) ||
          /listen\s*again/i.test(title) ||
          /mixed\s*for\s*you/i.test(title) ||
          /start\s*radio/i.test(title);

        if (isQuickPickShelf && quickPicks.length === 0 && shelfTracks.length > 0) {
          quickPicks = shelfTracks;
        }
      }
    };

    const findShelves = (node: any) => {
      if (!node || typeof node !== 'object') return;

      if (node.musicCarouselShelfRenderer) {
        processShelf(node.musicCarouselShelfRenderer);
        return;
      }
      if (node.musicShelfRenderer) {
        processShelf(node.musicShelfRenderer);
        return;
      }

      if (Array.isArray(node)) {
        for (const child of node) findShelves(child);
        return;
      }

      for (const key of Object.keys(node)) {
        if (key === 'chipCloudRenderer') continue;
        findShelves(node[key]);
      }
    };
    findShelves(data);

    // Fallback: if no explicitly titled quick pick shelf was matched, take first shelf with song tracks
    if (quickPicks.length === 0) {
      for (const shelf of shelves) {
        const songItems = shelf.items.filter((item) => item.type === 'song' && item.videoId);
        if (songItems.length > 0) {
          quickPicks = songItems.map((item) => ({
            id: item.videoId!,
            videoId: item.videoId!,
            title: item.title,
            artist: item.subtitle.split('•')[0].trim() || 'Unknown Artist',
            duration: 0,
            thumbnail: item.thumbnail,
          }));
          break;
        }
      }
    }

    // Secondary fallback: parse all tracks from response if still empty
    if (quickPicks.length === 0) {
      quickPicks = this.parseSearchResults(data);
    }

    return {
      chips,
      quickPicks,
      shelves,
    };
  }

  /**
   * Parse YouTube Music Next response into Up Next queue and Related shelves
   */
  parseNextRadio(data: any): { queue: Track[]; related: ShelfItemData[] } {
    if (!data || typeof data !== 'object') {
      return { queue: [], related: [] };
    }

    const queue: Track[] = [];
    const seenQueueIds = new Set<string>();

    const related: ShelfItemData[] = [];
    const seenRelatedIds = new Set<string>();

    // 1. Extract queue items from playlistPanelVideoRenderer
    const findQueue = (node: any) => {
      if (!node || typeof node !== 'object') return;

      if (node.playlistPanelVideoRenderer) {
        const track = parseTrackFromRenderer(node);
        if (track && !seenQueueIds.has(track.videoId)) {
          seenQueueIds.add(track.videoId);
          queue.push(track);
        }
        return;
      }

      if (node.playlistPanelVideoWrapperRenderer) {
        const primary = node.playlistPanelVideoWrapperRenderer.primaryRenderer;
        if (primary) findQueue(primary);
        return;
      }

      if (Array.isArray(node)) {
        for (const child of node) findQueue(child);
        return;
      }

      for (const key of Object.keys(node)) {
        findQueue(node[key]);
      }
    };

    const tabs =
      data.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer
        ?.watchNextTabbedResultsRenderer?.tabs;

    if (Array.isArray(tabs) && tabs.length > 0) {
      // Tab 0 is typically UP NEXT
      findQueue(tabs[0]);
    } else {
      findQueue(data);
    }

    // 2. Extract related items from Related tab or shelves in response
    const processRelatedItem = (itemNode: any) => {
      const item = parseShelfItem(itemNode);
      if (item && !seenRelatedIds.has(item.id)) {
        seenRelatedIds.add(item.id);
        related.push(item);
      }
    };

    const findRelated = (node: any) => {
      if (!node || typeof node !== 'object') return;

      if (node.musicTwoRowItemRenderer || node.musicResponsiveListItemRenderer) {
        processRelatedItem(node);
        return;
      }

      if (Array.isArray(node)) {
        for (const child of node) findRelated(child);
        return;
      }

      for (const key of Object.keys(node)) {
        if (key === 'playlistPanelRenderer' || key === 'musicQueueRenderer') {
          continue;
        }
        findRelated(node[key]);
      }
    };

    if (Array.isArray(tabs)) {
      const relatedTab =
        tabs.find((t: any) => {
          const title =
            t.tabRenderer?.title?.runs?.[0]?.text ||
            t.tabRenderer?.title?.simpleText ||
            t.tabRenderer?.title;
          return typeof title === 'string' && /related/i.test(title);
        }) || tabs[2];

      if (relatedTab) {
        findRelated(relatedTab);
      } else {
        findRelated(data);
      }
    } else {
      findRelated(data);
    }

    // Fallback: if queue is empty, try parseSearchResults
    if (queue.length === 0) {
      const fallbackTracks = this.parseSearchResults(data);
      for (const t of fallbackTracks) {
        if (!seenQueueIds.has(t.videoId)) {
          seenQueueIds.add(t.videoId);
          queue.push(t);
        }
      }
    }

    return { queue, related };
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

        // Extract artist, album & duration from columns
        let artist = 'Unknown Artist';
        let artistId: string | undefined;
        let album: string | undefined;
        let albumId: string | undefined;
        let duration = 0;
        const subRuns =
          flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];

        for (const r of subRuns) {
          const bId = r.navigationEndpoint?.browseEndpoint?.browseId;
          if (bId?.startsWith('UC')) {
            artist = r.text;
            artistId = bId;
          } else if (bId?.startsWith('MPREb_')) {
            album = r.text;
            albumId = bId;
          }
        }

        if (artist === 'Unknown Artist' && subRuns.length > 0) {
          const filtered = subRuns
            .filter((r: any) => r.text && r.text !== ' • ' && r.text !== '•' && !/^(song|video)$/i.test(r.text.trim()));
          if (filtered.length > 0) {
            artist = filtered[0].text;
            artistId = filtered[0].navigationEndpoint?.browseEndpoint?.browseId;
            if (filtered.length > 1 && !album) {
              album = filtered[1].text;
              albumId = filtered[1].navigationEndpoint?.browseEndpoint?.browseId;
            }
          }
        }

        for (const r of subRuns) {
          if (/^\d+:\d+(:\d+)?$/.test(r.text?.trim())) {
            duration = parseDuration(r.text);
            break;
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
            artistId,
            album,
            albumId,
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
