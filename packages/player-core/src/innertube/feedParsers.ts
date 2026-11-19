import {
  HomeFeedData,
  MediaShelfData,
  MoodChipData,
  NextRadioData,
  ShelfItemData,
  Track,
} from '../types';
import { parseTrackFromRenderer } from './parsers';
import { parseShelfItem } from './shelfParsers';
import { parseSearchResults } from './searchParsers';

/**
 * Parse YouTube Music Home feed browse response into chips, quick picks, and shelves
 */
export function parseHomeFeed(data: any): HomeFeedData {
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
    quickPicks = parseSearchResults(data);
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
export function parseNextRadio(data: any): NextRadioData {
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
    const fallbackTracks = parseSearchResults(data);
    for (const t of fallbackTracks) {
      if (!seenQueueIds.has(t.videoId)) {
        seenQueueIds.add(t.videoId);
        queue.push(t);
      }
    }
  }

  return { queue, related };
}
