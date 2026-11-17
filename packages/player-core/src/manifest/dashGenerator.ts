import { AudioFormat } from '../types';

export interface DashGeneratorOptions {
  durationMs?: number;
  minBufferTimeSeconds?: number;
}

/**
 * Escapes characters for safe inclusion in XML
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Formats duration in milliseconds into ISO 8601 duration string (e.g. PT184.250S)
 */
function formatIsoDuration(ms: number): string {
  const seconds = Math.max(0, ms / 1000);
  return `PT${seconds.toFixed(3)}S`;
}

/**
 * Parses mimeType and codecs from format string like:
 * audio/webm; codecs="opus"
 * audio/mp4; codecs="mp4a.40.2"
 */
function parseMimeAndCodecs(rawMimeType: string, itag: number): { mime: string; codecs: string } {
  let mime = 'audio/mp4';
  let codecs = 'mp4a.40.2';

  if (rawMimeType) {
    const parts = rawMimeType.split(';');
    mime = parts[0].trim();
    if (parts.length > 1) {
      const match = parts[1].match(/codecs=["']?([^"']+)["']?/);
      if (match) {
        codecs = match[1];
      }
    }
  }

  // Fallback defaults based on known itags if not parsed
  if (itag === 251 || itag === 250 || itag === 249) {
    mime = 'audio/webm';
    codecs = 'opus';
  } else if (itag === 140 || itag === 139) {
    mime = 'audio/mp4';
    codecs = 'mp4a.40.2';
  }

  return { mime, codecs };
}

/**
 * Generate synthetic in-memory DASH MPD XML string from googlevideo audio adaptiveFormats
 * Prioritizes Opus (itag 251) and AAC (itag 140).
 */
export function generateDashMpd(
  formats: AudioFormat[],
  options: DashGeneratorOptions = {}
): string {
  // Filter for valid audio formats with URLs
  const candidateFormats = formats.filter((f) => Boolean(f.url));

  if (candidateFormats.length === 0) {
    throw new Error('[DashGenerator] Cannot generate DASH MPD: No audio formats with valid URLs provided');
  }

  // Prefer itag 251 (Opus) and itag 140 (AAC), but accept other audio itags if needed
  const selectedFormats = candidateFormats
    .filter((f) => [251, 140, 250, 249, 139, 171].includes(f.itag) || f.mimeType?.startsWith('audio/'))
    .sort((a, b) => {
      const getPriority = (itag: number) => {
        if (itag === 251) return 1; // Opus 160kbps
        if (itag === 140) return 2; // AAC 128kbps
        if (itag === 250) return 3; // Opus 70kbps
        if (itag === 249) return 4; // Opus 50kbps
        return 10;
      };
      return getPriority(a.itag) - getPriority(b.itag);
    });

  const finalFormats = selectedFormats.length > 0 ? selectedFormats : candidateFormats;

  // Determine media duration
  let durationMs = options.durationMs;
  if (!durationMs) {
    for (const f of finalFormats) {
      if (f.approxDurationMs) {
        const parsed = parseInt(f.approxDurationMs, 10);
        if (!isNaN(parsed) && parsed > 0) {
          durationMs = parsed;
          break;
        }
      }
    }
  }
  const isoDuration = formatIsoDuration(durationMs || 180000);
  const minBufferTime = options.minBufferTimeSeconds ? `PT${options.minBufferTimeSeconds}S` : 'PT1.5S';

  const representationsXml = finalFormats
    .map((fmt) => {
      const { mime, codecs } = parseMimeAndCodecs(fmt.mimeType, fmt.itag);
      const bandwidth = fmt.bitrate || fmt.averageBitrate || (fmt.itag === 251 ? 160000 : 128000);
      const sampleRate = fmt.audioSampleRate || (fmt.itag === 251 ? '48000' : '44100');
      const channels = fmt.audioChannels || 2;
      const escapedUrl = escapeXml(fmt.url!);

      let segmentXml = '';
      if (fmt.initRange && fmt.indexRange) {
        segmentXml = `
        <SegmentBase indexRange="${fmt.indexRange.start}-${fmt.indexRange.end}">
          <Initialization range="${fmt.initRange.start}-${fmt.initRange.end}"/>
        </SegmentBase>`;
      }

      return `      <Representation id="${fmt.itag}"
                      mimeType="${mime}"
                      codecs="${codecs}"
                      bandwidth="${bandwidth}"
                      audioSamplingRate="${sampleRate}">
        <AudioChannelConfiguration schemeIdUri="urn:mpeg:dash:23003:3:audio_channel_configuration:2011" value="${channels}"/>
        <BaseURL>${escapedUrl}</BaseURL>${segmentXml}
      </Representation>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<MPD xmlns="urn:mpeg:dash:schema:mpd:2011"
     profiles="urn:mpeg:dash:profile:isoff-on-demand:2011"
     type="static"
     minBufferTime="${minBufferTime}"
     mediaPresentationDuration="${isoDuration}">
  <Period id="0" start="PT0S">
    <AdaptationSet id="0" contentType="audio" subsegmentAlignment="true">
${representationsXml}
    </AdaptationSet>
  </Period>
</MPD>`;
}

/**
 * Creates a browser Blob URL for the DASH MPD XML string
 */
export function createDashBlobUrl(mpdXml: string): string {
  if (typeof window === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined') {
    return createDashDataUri(mpdXml);
  }
  const blob = new Blob([mpdXml], { type: 'application/dash+xml;charset=utf-8' });
  return URL.createObjectURL(blob);
}

/**
 * Creates a base64 Data URI for the DASH MPD XML string (SSR & fallback safe)
 */
export function createDashDataUri(mpdXml: string): string {
  const globalAny = typeof globalThis !== 'undefined' ? (globalThis as any) : undefined;
  if (globalAny && typeof globalAny.Buffer !== 'undefined') {
    return `data:application/dash+xml;base64,${globalAny.Buffer.from(mpdXml, 'utf-8').toString('base64')}`;
  }
  if (typeof btoa !== 'undefined') {
    return `data:application/dash+xml;base64,${btoa(unescape(encodeURIComponent(mpdXml)))}`;
  }
  return `data:application/dash+xml;utf-8,${encodeURIComponent(mpdXml)}`;
}
