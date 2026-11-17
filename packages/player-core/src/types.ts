/**
 * Core type definitions for @mp/player-core
 */

export type InnerTubeClientName = 'VISIONOS' | 'IOS' | 'WEB_REMIX' | 'WEB' | 'MWEB';

export interface InnerTubeContext {
  client: {
    clientName: string;
    clientVersion: string;
    hl?: string;
    gl?: string;
    osName?: string;
    osVersion?: string;
    platform?: string;
    deviceMake?: string;
    deviceModel?: string;
    originalUrl?: string;
    visitorData?: string;
  };
}

export interface Thumbnail {
  url: string;
  width?: number;
  height?: number;
}

export interface Track {
  id: string;
  videoId: string;
  title: string;
  artist: string;
  album?: string;
  duration: number; // in seconds
  thumbnail: string;
  thumbnails?: Thumbnail[];
}

export interface AudioFormat {
  itag: number;
  mimeType: string;
  bitrate: number;
  averageBitrate?: number;
  contentLength?: string;
  approxDurationMs?: string;
  url?: string;
  cipher?: string;
  signatureCipher?: string;
  initRange?: {
    start: string;
    end: string;
  };
  indexRange?: {
    start: string;
    end: string;
  };
  audioSampleRate?: string;
  audioChannels?: number;
  loudnessDb?: number;
}

export interface PlayabilityStatus {
  status: 'OK' | 'UNPLAYABLE' | 'LOGIN_REQUIRED' | 'ERROR' | string;
  reason?: string;
  playableInEmbed?: boolean;
}

export interface StreamingData {
  expiresInSeconds?: string;
  formats?: AudioFormat[];
  adaptiveFormats?: AudioFormat[];
  dashManifestUrl?: string;
  hlsManifestUrl?: string;
}

export interface PlayerResponse {
  playabilityStatus: PlayabilityStatus;
  videoDetails?: {
    videoId: string;
    title: string;
    lengthSeconds: string;
    channelId?: string;
    author?: string;
    thumbnail?: {
      thumbnails: Thumbnail[];
    };
  };
  streamingData?: StreamingData;
}

export interface ClientVerdict {
  client: InnerTubeClientName;
  playable: boolean;
  benchedUntil?: number;
  reason?: string;
}

export type PlaybackState =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'buffering'
  | 'ended'
  | 'error';

export type RepeatMode = 'off' | 'all' | 'one';
