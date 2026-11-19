import { Track } from '../types';
export { parseShelfItem } from './shelfParsers';

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
