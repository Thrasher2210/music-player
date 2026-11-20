import { parseDuration } from './duration';

export const UNKNOWN_ARTIST = 'Unknown Artist';

interface Run {
  text?: string;
  navigationEndpoint?: { browseEndpoint?: { browseId?: string } };
}

export interface ResponsiveSubtitle {
  artist: string;
  artistId?: string;
  album?: string;
  albumId?: string;
  /** Seconds. 0 when the row does not carry a duration. */
  duration: number;
}

const KIND = /^(song|video|episode|single|ep)$/i;
const CLOCK = /^\d+:\d{2}(:\d{2})?$/;
const METRIC = /\b(plays?|views?|likes?|subscribers?|monthly audience)$/i;

/** "Song • Artist • 3:45" arrives as flat runs; group them by the bullet separators. */
function splitOnBullets(runs: Run[]): Run[][] {
  const segments: Run[][] = [[]];
  for (const run of runs) {
    if (run.text?.trim() === '•') segments.push([]);
    else segments[segments.length - 1].push(run);
  }
  return segments.filter((segment) => segment.length > 0);
}

const textOf = (segment: Run[]): string =>
  segment.map((run) => run.text ?? '').join('').trim();

const browseIdOf = (segment: Run[], prefix: string): string | undefined =>
  segment
    .map((run) => run.navigationEndpoint?.browseEndpoint?.browseId)
    .find((id) => id?.startsWith(prefix));

/** Search rows often leave the artist out of the subtitle, but name it in the play button label. */
function artistFromPlayLabel(renderer: any, title: string): string | undefined {
  const label =
    renderer.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer
      ?.accessibilityPlayData?.accessibilityData?.label;
  const prefix = `Play ${title} - `;
  if (typeof label !== 'string' || !label.startsWith(prefix)) return undefined;
  return label.slice(prefix.length).trim() || undefined;
}

function artistIdFromMenu(renderer: any): string | undefined {
  const items: any[] = renderer.menu?.menuRenderer?.items || [];
  for (const item of items) {
    const id = item.menuNavigationItemRenderer?.navigationEndpoint?.browseEndpoint?.browseId;
    if (typeof id === 'string' && id.startsWith('UC')) return id;
  }
  return undefined;
}

/**
 * Read artist, album and duration from a musicResponsiveListItemRenderer.
 *
 * Layouts seen in live search responses:
 *   Song • Artist, Artist & Artist            (no album, no duration)
 *   Song • 5:16                               (no artist, name is in the play label)
 *   Video • Channel • 82M views               (no duration)
 *   Channel • 26M views • 3:52                (no type label)
 *   Artist • Album • 4:03                     (plain text, no navigation)
 *   Episode • 2d ago • Show name              (podcast episode)
 */
export function readResponsiveSubtitle(renderer: any, title: string): ResponsiveSubtitle {
  const columns: any[] = renderer.flexColumns || [];
  const runs: Run[] = columns[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
  const segments = splitOnBullets(runs);

  let kind: string | undefined;
  if (segments.length > 0 && KIND.test(textOf(segments[0]))) {
    kind = textOf(segments.shift()!).toLowerCase();
  }

  let artist: string | undefined;
  let artistId: string | undefined;
  let album: string | undefined;
  let albumId: string | undefined;
  let duration = 0;
  const loose: Run[][] = [];

  for (const segment of segments) {
    const text = textOf(segment);
    if (CLOCK.test(text)) {
      duration = parseDuration(text);
      continue;
    }
    if (METRIC.test(text)) continue;

    const albumBrowseId = browseIdOf(segment, 'MPREb_');
    if (albumBrowseId) {
      album = text;
      albumId = albumBrowseId;
      continue;
    }

    const channelId = browseIdOf(segment, 'UC');
    const showId = kind === 'episode' ? browseIdOf(segment, 'MPSPPL') : undefined;
    if ((channelId || showId) && artist === undefined) {
      artist = text;
      artistId = channelId;
      continue;
    }
    loose.push(segment);
  }

  // Plain text subtitles with no navigation: first is the artist, second the album.
  if (kind !== 'episode') {
    if (artist === undefined && loose.length > 0) artist = textOf(loose.shift()!);
    if (album === undefined && loose.length > 0) album = textOf(loose.shift()!);
  }

  if (!artist) artist = artistFromPlayLabel(renderer, title);
  if (artist && !artistId && kind !== 'episode') artistId = artistIdFromMenu(renderer);

  if (duration === 0 && columns.length > 2) {
    const last = columns[columns.length - 1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
    if (typeof last === 'string' && CLOCK.test(last.trim())) duration = parseDuration(last);
  }

  return { artist: artist || UNKNOWN_ARTIST, artistId, album, albumId, duration };
}
