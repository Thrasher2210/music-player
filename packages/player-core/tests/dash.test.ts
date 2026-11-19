import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  generateDashMpd,
  createDashDataUri,
  AudioFormat,
} from '../src/index';

describe('DASH Manifest Generator', () => {
  it('generates synthetic DASH MPD XML with Opus (251) and AAC (140)', () => {
    const formats: AudioFormat[] = [
      {
        itag: 251,
        mimeType: 'audio/webm; codecs="opus"',
        bitrate: 135000,
        audioSampleRate: '48000',
        audioChannels: 2,
        url: 'https://googlevideo.com/videoplayback?itag=251&sparams=test',
        initRange: { start: '0', end: '740' },
        indexRange: { start: '741', end: '1024' },
      },
      {
        itag: 140,
        mimeType: 'audio/mp4; codecs="mp4a.40.2"',
        bitrate: 128000,
        audioSampleRate: '44100',
        audioChannels: 2,
        url: 'https://googlevideo.com/videoplayback?itag=140&sparams=test',
        initRange: { start: '0', end: '632' },
        indexRange: { start: '633', end: '896' },
      },
    ];

    const xml = generateDashMpd(formats, { durationMs: 243000 });
    assert.ok(xml.includes('<MPD xmlns="urn:mpeg:dash:schema:mpd:2011"'));
    assert.ok(xml.includes('mediaPresentationDuration="PT243.000S"'));
    assert.ok(xml.includes('Representation id="251"'));
    assert.ok(xml.includes('codecs="opus"'));
    assert.ok(xml.includes('Representation id="140"'));
    assert.ok(xml.includes('codecs="mp4a.40.2"'));
    assert.ok(xml.includes('<SegmentBase indexRange="741-1024">'));
    assert.ok(xml.includes('<Initialization range="0-740"/>'));
    // Ensures XML escaping of '&'
    assert.ok(xml.includes('&amp;sparams=test'));

    const dataUri = createDashDataUri(xml);
    assert.ok(dataUri.startsWith('data:application/dash+xml;'));
  });

  it('generates SABR DASH MPD XML with is_sabr: true and sabr: protocol URIs', () => {
    const formats: AudioFormat[] = [
      {
        itag: 251,
        mimeType: 'audio/webm; codecs="opus"',
        bitrate: 160000,
        audioSampleRate: '48000',
        audioChannels: 2,
        is_sabr: true,
        initRange: { start: '0', end: '740' },
        indexRange: { start: '741', end: '1024' },
      },
      {
        itag: 140,
        mimeType: 'audio/mp4; codecs="mp4a.40.2"',
        bitrate: 128000,
        audioSampleRate: '44100',
        audioChannels: 2,
        is_sabr: true,
        initRange: { start: '0', end: '632' },
        indexRange: { start: '633', end: '896' },
      },
    ];

    const xml = generateDashMpd(formats, { is_sabr: true, durationMs: 210000 });
    assert.ok(xml.includes('is_sabr="true"'));
    assert.ok(xml.includes('<BaseURL>sabr://audio?key='));
    assert.ok(xml.includes('Representation id="251"'));
    assert.ok(xml.includes('codecs="opus"'));
    assert.ok(xml.includes('Representation id="140"'));
    assert.ok(xml.includes('codecs="mp4a.40.2"'));
    assert.ok(xml.includes('<SegmentBase indexRange="741-1024">'));
  });
});
