import {
  AlbumDetails,
  ArtistDetails,
  RemotePlaylistDetails,
  ShelfItemData,
  Track,
} from '../types';
import { parseShelfItem } from './shelfParsers';

export function parseArtistDetails(
  browseId: string,
  data: any,
  parseSearchResults: (d: any) => Track[]
): ArtistDetails {
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
  const bannerUrl = bannerThumbs.length > 0 ? bannerThumbs[bannerThumbs.length - 1].url : undefined;
  const avatarUrl = bannerThumbs.length > 0 ? bannerThumbs[0].url : undefined;

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
      const shelfTracks = parseSearchResults(shelf);
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

  if (topSongs.length === 0) {
    const allTracks = parseSearchResults(data);
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

export function parseAlbumDetails(
  browseId: string,
  data: any,
  parseSearchResults: (d: any) => Track[]
): AlbumDetails {
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

  const coverThumbs = header?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
  const tracks = parseSearchResults(data);
  const coverUrl =
    (coverThumbs.length > 0 ? coverThumbs[coverThumbs.length - 1].url : undefined) ||
    tracks[0]?.thumbnail;
  for (const t of tracks) {
    if (!t.artist || t.artist === 'Unknown Artist') t.artist = artist;
    if (!t.artistId && artistBrowseId) t.artistId = artistBrowseId;
    t.album = title;
    t.albumId = browseId;
    if (!t.thumbnail && coverUrl) t.thumbnail = coverUrl;
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

export function parsePlaylistDetails(
  playlistId: string,
  data: any,
  parseSearchResults: (d: any) => Track[]
): RemotePlaylistDetails {
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

  const coverThumbs = header?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
  const tracks = parseSearchResults(data);
  const coverUrl =
    (coverThumbs.length > 0 ? coverThumbs[coverThumbs.length - 1].url : undefined) ||
    tracks[0]?.thumbnail;
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
