import { Track } from '../types';
import { parseDuration } from './duration';
import { readResponsiveSubtitle } from './subtitleRuns';

export { parseShelfItem } from './shelfParsers';
export { parseDuration } from './duration';

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

    const { artist, artistId, album, albumId, duration } = readResponsiveSubtitle(renderer, title);

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
