import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { parseSearchResults } from '../src/innertube/searchParsers';
import { parseTrackFromRenderer } from '../src/innertube/parsers';
import { parseDuration } from '../src/innertube/duration';

type Run = { text: string; browseId?: string };

const run = (text: string, browseId?: string): Run => ({ text, browseId });
const dot = (): Run => run(' • ');

const toRuns = (runs: Run[]) =>
  runs.map((r) => ({
    text: r.text,
    ...(r.browseId ? { navigationEndpoint: { browseEndpoint: { browseId: r.browseId } } } : {}),
  }));

interface RowOptions {
  videoId?: string;
  /** Accessibility label of the play button, e.g. "Play Title - Artist". */
  playLabel?: string;
  /** Channel id behind the "Go to artist" menu entry. */
  menuArtistId?: string;
  extraColumn?: string;
}

function row(title: string, subtitle: Run[], options: RowOptions = {}) {
  const { videoId = 'vid00000001', playLabel, menuArtistId, extraColumn } = options;
  const columns: unknown[] = [
    { musicResponsiveListItemFlexColumnRenderer: { text: { runs: [{ text: title }] } } },
    { musicResponsiveListItemFlexColumnRenderer: { text: { runs: toRuns(subtitle) } } },
  ];
  if (extraColumn) {
    columns.push({ musicResponsiveListItemFlexColumnRenderer: { text: { runs: [{ text: extraColumn }] } } });
  }
  return {
    musicResponsiveListItemRenderer: {
      playlistItemData: { videoId },
      flexColumns: columns,
      overlay: playLabel
        ? {
            musicItemThumbnailOverlayRenderer: {
              content: {
                musicPlayButtonRenderer: {
                  accessibilityPlayData: { accessibilityData: { label: playLabel } },
                },
              },
            },
          }
        : undefined,
      menu: {
        menuRenderer: {
          items: [
            { menuNavigationItemRenderer: { text: { runs: [{ text: 'Go to album' }] }, navigationEndpoint: { browseEndpoint: { browseId: 'MPREb_album' } } } },
            ...(menuArtistId
              ? [{ menuNavigationItemRenderer: { text: { runs: [{ text: 'Go to artist' }] }, navigationEndpoint: { browseEndpoint: { browseId: menuArtistId } } } }]
              : []),
          ],
        },
      },
    },
  };
}

const parse = (...rows: unknown[]) => parseSearchResults({ contents: rows });

describe('search result subtitle parsing', () => {
  it('recovers the artist from the play label when the subtitle only has a duration', () => {
    const [track] = parse(
      row('Gulon Mein Rang Bhare', [run('Song'), dot(), run('5:16')], {
        playLabel: 'Play Gulon Mein Rang Bhare - Arijit Singh',
        menuArtistId: 'UCartist1',
        extraColumn: '5.9M plays',
      })
    );
    assert.equal(track.artist, 'Arijit Singh');
    assert.equal(track.artistId, 'UCartist1');
    assert.equal(track.duration, 316);
    assert.equal(track.album, undefined);
  });

  it('never puts a clock time in the artist field', () => {
    const [track] = parse(row('Untitled', [run('Song'), dot(), run('4:12')]));
    assert.equal(track.artist, 'Unknown Artist');
    assert.equal(track.duration, 252);
  });

  it('keeps every artist of a multi-artist song and links the first one', () => {
    const [track] = parse(
      row('Tu Mil Jaaye', [
        run('Song'),
        dot(),
        run('Sachin-Jigar', 'UCfirst'),
        run(', '),
        run('Ed Sheeran'),
        run(', '),
        run('Arijit Singh', 'UClast'),
        run(' & '),
        run('Madhubanti Bagchi'),
      ])
    );
    assert.equal(track.artist, 'Sachin-Jigar, Ed Sheeran, Arijit Singh & Madhubanti Bagchi');
    assert.equal(track.artistId, 'UCfirst');
  });

  it('reads the channel of a video row and ignores the view count', () => {
    const [track] = parse(
      row('Some Video', [run('Video'), dot(), run('Red Flag Gamer', 'UCchannel'), dot(), run('82M views')])
    );
    assert.equal(track.artist, 'Red Flag Gamer');
    assert.equal(track.artistId, 'UCchannel');
    assert.equal(track.duration, 0);
  });

  it('reads the duration when there is no type label', () => {
    const [track] = parse(
      row('Blinding Lights (slowed)', [run('PLAYYYPRETEND', 'UCchannel'), dot(), run('26M views'), dot(), run('3:52')])
    );
    assert.equal(track.artist, 'PLAYYYPRETEND');
    assert.equal(track.duration, 232);
  });

  it('reads plain text artist, album and duration', () => {
    const [track] = parse(
      row('Midnight City', [run('M83'), dot(), run("Hurry Up, We're Dreaming"), dot(), run('4:03')])
    );
    assert.equal(track.artist, 'M83');
    assert.equal(track.album, "Hurry Up, We're Dreaming");
    assert.equal(track.duration, 243);
  });

  it('reads a linked album and hours-long durations', () => {
    const [track] = parse(
      row('Long Mix', [run('Song'), dot(), run('DJ', 'UCdj'), dot(), run('The Album', 'MPREb_abc'), dot(), run('1:02:03')])
    );
    assert.equal(track.album, 'The Album');
    assert.equal(track.albumId, 'MPREb_abc');
    assert.equal(track.duration, 3723);
  });

  it('names a podcast episode after its show, not the type label or date', () => {
    const [track] = parse(
      row('Episode 8', [run('Episode'), dot(), run('2d ago'), dot(), run('Some Show', 'MPSPPL_show')])
    );
    assert.equal(track.artist, 'Some Show');
    assert.equal(track.artistId, undefined);
    assert.equal(track.album, undefined);
    assert.equal(track.duration, 0);
  });

  it('skips rows that are not playable', () => {
    const notPlayable = {
      musicResponsiveListItemRenderer: {
        flexColumns: [
          { musicResponsiveListItemFlexColumnRenderer: { text: { runs: [{ text: 'Atif Aslam' }] } } },
          { musicResponsiveListItemFlexColumnRenderer: { text: { runs: [{ text: 'Artist' }] } } },
        ],
      },
    };
    assert.deepEqual(parse(notPlayable), []);
  });

  it('parses home and radio rows the same way', () => {
    const track = parseTrackFromRenderer(
      row('Gulon Mein Rang Bhare', [run('Song'), dot(), run('5:16')], {
        playLabel: 'Play Gulon Mein Rang Bhare - Arijit Singh',
      })
    );
    assert.equal(track?.artist, 'Arijit Singh');
    assert.equal(track?.duration, 316);
  });
});

describe('parseDuration', () => {
  it('parses minutes and hours, and rejects text', () => {
    assert.equal(parseDuration('3:45'), 225);
    assert.equal(parseDuration('1:02:03'), 3723);
    assert.equal(parseDuration('5.9M plays'), 0);
    assert.equal(parseDuration(undefined), 0);
  });
});
