import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { lyricsResponseSchema } from '@mp/api-contract';
import {
  cleanTitle,
  cleanArtist,
  sanitizeTrackMetadata,
} from '../src/lyrics/sanitizer.js';
import { parseLrc, parseTimeToSeconds } from '../src/lyrics/parser.js';

describe('1. lyricsResponseSchema (Shared Contract)', () => {
  it('validates a complete synced lyrics payload with syllable words', () => {
    const payload = {
      videoId: 'dQw4w9WgXcQ',
      synced: true,
      lines: [
        {
          time: 12.34,
          timeMs: 12340,
          text: 'Never gonna give you up',
          words: [
            { time: 12.34, text: 'Never ' },
            { time: 12.8, text: 'gonna ' },
            { time: 13.2, text: 'give ' },
            { time: 13.5, text: 'you ' },
            { time: 13.8, text: 'up' },
          ],
        },
      ],
      plainLyrics: 'Never gonna give you up',
      source: 'lrclib',
    };

    const parsed = lyricsResponseSchema.parse(payload);
    assert.equal(parsed.videoId, 'dQw4w9WgXcQ');
    assert.equal(parsed.synced, true);
    assert.equal(parsed.lines.length, 1);
    assert.equal(parsed.lines[0].time, 12.34);
    assert.equal(parsed.lines[0].timeMs, 12340);
    assert.equal(parsed.lines[0].words?.length, 5);
    assert.equal(parsed.source, 'lrclib');
  });

  it('validates unsynced plain lyrics', () => {
    const payload = {
      videoId: 'abc12345',
      synced: false,
      lines: [],
      plainLyrics: 'Just plain lyrics here',
      source: 'innertube',
    };

    const parsed = lyricsResponseSchema.parse(payload);
    assert.equal(parsed.synced, false);
    assert.equal(parsed.lines.length, 0);
    assert.equal(parsed.plainLyrics, 'Just plain lyrics here');
    assert.equal(parsed.source, 'innertube');
  });

  it('rejects invalid videoId or negative time', () => {
    assert.throws(() => {
      lyricsResponseSchema.parse({
        videoId: '',
        synced: true,
        lines: [],
        source: 'none',
      });
    });
  });
});

describe('2. Sanitizer (clean YouTube title noise and extract artist/title)', () => {
  it('cleans typical YouTube noise tags: (Official Music Video), [HD], [4K], etc.', () => {
    const raw = 'Never Gonna Give You Up (Official Music Video) [HD] [4K]';
    assert.equal(cleanTitle(raw), 'Never Gonna Give You Up');
  });

  it('cleans Asian brackets 【MV】 and CJK video markers', () => {
    const raw = '【MV】Blueming (Official Video)';
    assert.equal(cleanTitle(raw), 'Blueming');
  });

  it('cleans featuring info from title', () => {
    const raw = 'Fortnight (feat. Post Malone)';
    assert.equal(cleanTitle(raw), 'Fortnight');
  });

  it('extracts artist and title from "Artist - Title" format when artist is missing', () => {
    const metadata = sanitizeTrackMetadata({
      title: 'Rick Astley - Never Gonna Give You Up (Official Video)',
      artist: '',
    });

    assert.equal(metadata.cleanArtist, 'Rick Astley');
    assert.equal(metadata.cleanTitle, 'Never Gonna Give You Up');
  });

  it('strips redundant artist from title if already provided', () => {
    const metadata = sanitizeTrackMetadata({
      title: 'Queen - Bohemian Rhapsody (Remastered 2021)',
      artist: 'Queen',
    });

    assert.equal(metadata.cleanArtist, 'Queen');
    assert.equal(metadata.cleanTitle, 'Bohemian Rhapsody');
  });

  it('cleans YouTube "- Topic" artist suffix', () => {
    assert.equal(cleanArtist('Daft Punk - Topic'), 'Daft Punk');
    assert.equal(cleanArtist('Taylor Swift VEVO'), 'Taylor Swift');
  });
});

describe('3. LRC Parser', () => {
  it('parses timestamps into seconds and milliseconds correctly', () => {
    const p1 = parseTimeToSeconds('01', '05', '50');
    assert.equal(p1.timeSec, 65.5);
    assert.equal(p1.timeMs, 65500);

    const p2 = parseTimeToSeconds('00', '12', '123');
    assert.equal(p2.timeSec, 12.123);
    assert.equal(p2.timeMs, 12123);
  });

  it('parses standard synced LRC lines', () => {
    const lrc = `
[00:10.00]First line
[00:15.50]Second line
[00:20.00]Third line
    `;

    const parsed = parseLrc(lrc);
    assert.equal(parsed.synced, true);
    assert.equal(parsed.lines.length, 3);
    assert.equal(parsed.lines[0].time, 10.0);
    assert.equal(parsed.lines[0].text, 'First line');
    assert.equal(parsed.lines[1].time, 15.5);
    assert.equal(parsed.lines[1].text, 'Second line');
  });

  it('handles multi-timestamp lines [mm:ss.xx][mm:ss.xx]Text', () => {
    const lrc = `[00:10.00][00:30.00]Chorus line`;
    const parsed = parseLrc(lrc);

    assert.equal(parsed.synced, true);
    assert.equal(parsed.lines.length, 2);
    assert.equal(parsed.lines[0].time, 10.0);
    assert.equal(parsed.lines[0].text, 'Chorus line');
    assert.equal(parsed.lines[1].time, 30.0);
    assert.equal(parsed.lines[1].text, 'Chorus line');
  });

  it('parses inline syllable tags <mm:ss.xx>word into words array', () => {
    const lrc = `[00:12.00]<00:12.00>Never <00:12.50>gonna <00:13.00>give <00:13.50>you <00:14.00>up`;
    const parsed = parseLrc(lrc);

    assert.equal(parsed.synced, true);
    assert.equal(parsed.lines.length, 1);
    const line = parsed.lines[0];
    assert.equal(line.time, 12.0);
    assert.equal(line.text, 'Never gonna give you up');
    assert.ok(line.words);
    assert.equal(line.words.length, 5);
    assert.equal(line.words[0].text.trim(), 'Never');
    assert.equal(line.words[0].time, 12.0);
    assert.equal(line.words[1].text.trim(), 'gonna');
    assert.equal(line.words[1].time, 12.5);
    assert.equal(line.words[4].text.trim(), 'up');
    assert.equal(line.words[4].time, 14.0);
  });

  it('applies [offset:+/-ms] tag to all lines', () => {
    const lrc = `
[offset:500]
[00:10.00]Offset line
    `;
    const parsed = parseLrc(lrc);
    assert.equal(parsed.lines[0].time, 10.5);
    assert.equal(parsed.lines[0].timeMs, 10500);
  });

  it('falls back to unsynced plain lyrics when no timestamps exist', () => {
    const plain = `Line one\nLine two\nLine three`;
    const parsed = parseLrc(plain);
    assert.equal(parsed.synced, false);
    assert.equal(parsed.lines.length, 0);
    assert.equal(parsed.plainLyrics, 'Line one\nLine two\nLine three');
  });
});
