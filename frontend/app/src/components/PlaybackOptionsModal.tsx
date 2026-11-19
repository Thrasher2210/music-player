'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Badge,
  Separator,
  Stack,
  Flex,
  Box,
  Text,
  IconButton,
} from '@mp/dying';
import {
  SlidersHorizontal,
  Gauge,
  Moon,
  Activity,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { usePlayerStore, type SleepTimerMode, type DiagnosticInfo } from '../stores/playerStore';

export interface PlaybackOptionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0] as const;

interface TimerPreset {
  label: string;
  mode: SleepTimerMode;
}

const TIMER_PRESETS: TimerPreset[] = [
  { label: '15m', mode: '15m' },
  { label: '30m', mode: '30m' },
  { label: '45m', mode: '45m' },
  { label: '60m', mode: '60m' },
  { label: 'End of Song', mode: 'end_of_track' },
  { label: 'Off', mode: 'off' },
];

function formatCountdown(totalSeconds: number | null): string {
  if (totalSeconds === null || totalSeconds <= 0) return '0:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
}

export const PlaybackOptionsModal: React.FC<PlaybackOptionsModalProps> = ({
  open,
  onOpenChange,
}) => {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const playbackRate = usePlayerStore((s) => s.playbackRate ?? 1.0);
  const setPlaybackRate = usePlayerStore((s) => s.setPlaybackRate);

  const sleepTimerMode = usePlayerStore((s) => s.sleepTimerMode);
  const sleepTimerRemaining = usePlayerStore((s) => s.sleepTimerRemaining);
  const setSleepTimer = usePlayerStore((s) => s.setSleepTimer);

  const getDiagnosticInfo = usePlayerStore((s) => s.getDiagnosticInfo);

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [stats, setStats] = useState<DiagnosticInfo | null>(null);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    if (!open) return;
    try {
      setStats(getDiagnosticInfo());
    } catch {
      // safe fallback
    }

    const interval = setInterval(() => {
      try {
        setStats(getDiagnosticInfo());
      } catch {
        // safe fallback
      }
    }, 500);

    return () => clearInterval(interval);
  }, [open, getDiagnosticInfo]);

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // fallback
    }
  };

  const isTimerActive = sleepTimerMode && sleepTimerMode !== 'off';

  const videoId = currentTrack?.videoId || currentTrack?.id || 'N/A';
  const trackTitle = currentTrack?.title || 'No active track';
  const trackArtist = currentTrack?.artist || 'Unknown artist';

  const activeCodec = stats?.codec || (stats?.activeItag === 140 ? 'AAC (itag 140)' : 'Opus (itag 251)');
  const formattedBitrate = stats?.bitrate
    ? `${Math.round(stats.bitrate / 1000)} kbps`
    : stats?.activeItag === 140
    ? '128 kbps'
    : '160 kbps';

  const formattedSampleRate = stats?.sampleRate
    ? `${(stats.sampleRate / 1000).toFixed(1)} kHz`
    : stats?.activeItag === 140
    ? '44.1 kHz'
    : '48.0 kHz';

  const activeClientName = stats?.activeClient || 'WEB_REMIX';
  const networkMode = stats?.streamingStatus || (stats?.networkAdapter === 'web-extension' ? 'Direct CDN via Extension' : 'Edge Fallback Proxy');
  const playbackState = stats?.playbackState || 'idle';
  const bufferedAhead = stats?.bufferedAheadSeconds ?? 0;
  const bufferedPct = Math.min(100, Math.max(0, stats?.bufferedPercent ?? 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md select-none">
        <DialogHeader>
          <Flex align="center" gap="2">
            <SlidersHorizontal className="h-5 w-5 text-accent" />
            <Stack gap="0">
              <DialogTitle className="text-lg font-bold text-text-primary">
                Playback Options
              </DialogTitle>
              <DialogDescription className="text-xs text-text-secondary">
                Audio tempo, sleep timer, and technical diagnostics.
              </DialogDescription>
            </Stack>
          </Flex>
        </DialogHeader>

        <Stack gap="4" className="py-2">
          {/* SECTION 1: Playback Speed */}
          <Stack gap="2">
            <Flex justify="between" align="center">
              <Flex align="center" gap="2">
                <Gauge className="h-4 w-4 text-text-secondary" />
                <Text size="xs" weight="semibold" className="text-text-primary">
                  Playback Speed
                </Text>
              </Flex>
              <Badge variant="glass" size="sm" className="font-mono font-medium">
                {playbackRate}×
              </Badge>
            </Flex>

            <Flex gap="2" className="flex-wrap">
              {SPEED_OPTIONS.map((rate) => {
                const isSelected = playbackRate === rate;
                return (
                  <Button
                    key={rate}
                    variant={isSelected ? 'primary' : 'ghost'}
                    size="xs"
                    onClick={() => setPlaybackRate(rate)}
                    className="font-mono text-xs px-2.5 h-7 min-w-[42px] rounded-full"
                  >
                    {rate}×
                  </Button>
                );
              })}
            </Flex>
          </Stack>

          <Separator />

          {/* SECTION 2: Sleep Timer */}
          <Stack gap="2">
            <Flex justify="between" align="center">
              <Flex align="center" gap="2">
                <Moon className="h-4 w-4 text-text-secondary" />
                <Text size="xs" weight="semibold" className="text-text-primary">
                  Sleep Timer
                </Text>
              </Flex>
              {isTimerActive && (
                <Flex align="center" gap="2">
                  <Badge variant="accent" size="sm" className="font-mono text-[11px]">
                    {sleepTimerMode === 'end_of_track'
                      ? 'End of song'
                      : formatCountdown(sleepTimerRemaining)}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setSleepTimer('off')}
                    className="h-6 px-1.5 text-[11px] text-text-tertiary hover:text-white"
                  >
                    Cancel
                  </Button>
                </Flex>
              )}
            </Flex>

            <Flex gap="2" className="flex-wrap">
              {TIMER_PRESETS.map((preset) => {
                const isSelected = sleepTimerMode === preset.mode;
                return (
                  <Button
                    key={preset.mode}
                    variant={isSelected ? 'secondary' : 'ghost'}
                    size="xs"
                    onClick={() => setSleepTimer(preset.mode)}
                    className="text-xs px-2.5 h-7 rounded-full"
                  >
                    {preset.label}
                  </Button>
                );
              })}
            </Flex>
          </Stack>

          <Separator />

          {/* SECTION 3: Stats for Nerds Collapsible Accordion */}
          <Stack gap="2">
            <Flex
              justify="between"
              align="center"
              onClick={() => setShowStats(!showStats)}
              className="cursor-pointer py-1 select-none"
            >
              <Flex align="center" gap="2">
                <Activity className="h-4 w-4 text-text-secondary" />
                <Text size="xs" weight="semibold" className="text-text-primary">
                  Stats for Nerds
                </Text>
              </Flex>
              <Flex align="center" gap="2">
                <Badge variant={playbackState === 'playing' ? 'success' : 'glass'} size="sm">
                  {playbackState.toUpperCase()}
                </Badge>
                {showStats ? (
                  <ChevronUp className="h-4 w-4 text-text-tertiary" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-text-tertiary" />
                )}
              </Flex>
            </Flex>

            {showStats && (
              <Box className="p-3.5 rounded-xl bg-surface-active border border-border-subtle animate-in fade-in-50 duration-150">
                <Stack gap="2" className="text-xs font-mono">
                  {/* Track info */}
                  <Box>
                    <Text size="xs" weight="semibold" className="text-text-primary font-sans truncate">
                      {trackTitle}
                    </Text>
                    <Text size="xs" className="text-text-tertiary font-sans truncate">
                      {trackArtist}
                    </Text>
                  </Box>

                  <Separator />

                  {/* Video ID */}
                  <Flex justify="between" align="center">
                    <Text size="xs" className="text-text-tertiary">
                      Video ID
                    </Text>
                    <Flex align="center" gap="1">
                      <Text size="xs" className="text-text-primary font-mono select-all">
                        {videoId}
                      </Text>
                      <IconButton
                        aria-label="Copy Video ID"
                        variant="ghost"
                        size="xs"
                        icon={
                          copiedField === 'videoId' ? (
                            <Check size={12} className="text-accent" />
                          ) : (
                            <Copy size={12} />
                          )
                        }
                        onClick={() => copyToClipboard(videoId, 'videoId')}
                      />
                    </Flex>
                  </Flex>

                  {/* Codec */}
                  <Flex justify="between" align="center">
                    <Text size="xs" className="text-text-tertiary">
                      Codec
                    </Text>
                    <Text size="xs" weight="medium" className="text-text-primary">
                      {activeCodec}
                    </Text>
                  </Flex>

                  {/* Bitrate & Sample Rate */}
                  <Flex justify="between" align="center">
                    <Text size="xs" className="text-text-tertiary">
                      Format
                    </Text>
                    <Text size="xs" weight="medium" className="text-text-primary">
                      {formattedBitrate} • {formattedSampleRate}
                    </Text>
                  </Flex>

                  {/* InnerTube Client */}
                  <Flex justify="between" align="center">
                    <Text size="xs" className="text-text-tertiary">
                      Client
                    </Text>
                    <Text size="xs" weight="medium" className="text-accent">
                      {activeClientName}
                    </Text>
                  </Flex>

                  {/* Network Pipeline */}
                  <Flex justify="between" align="center">
                    <Text size="xs" className="text-text-tertiary">
                      Pipeline
                    </Text>
                    <Text size="xs" weight="medium" className="text-text-secondary text-right truncate max-w-[200px]">
                      {networkMode}
                    </Text>
                  </Flex>

                  {/* Buffer Ahead */}
                  <Flex justify="between" align="center">
                    <Text size="xs" className="text-text-tertiary">
                      Buffer
                    </Text>
                    <Text size="xs" weight="medium" className="text-text-primary">
                      {bufferedAhead.toFixed(1)}s ({bufferedPct.toFixed(0)}%)
                    </Text>
                  </Flex>
                </Stack>
              </Box>
            )}
          </Stack>
        </Stack>

        <DialogFooter className="pt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
