import { Track } from '../types';
import { parseDuration } from './parsers';

/**
 * Robust parser extracting Track[] from various InnerTube response layouts
 */
export function parseSearchResults(data: any): Track[] {
  const tracks: Track[] = [];
  if (!data) return tracks;

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
