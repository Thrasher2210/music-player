'use client';

import React, { useState } from 'react';
import {
  Separator,
  Stack,
  Flex,
  Box,
  Text,
  IconButton,
} from '@mp/dying';
import { Copy, Check } from 'lucide-react';
import { type DiagnosticInfo } from '../../stores/playerStore';

export interface StatsForNerdsPanelProps {
  videoId: string;
  trackTitle: string;
  trackArtist: string;
  stats: DiagnosticInfo | null;
}

export function StatsForNerdsPanel({
  videoId,
  trackTitle,
  trackArtist,
  stats,
}: StatsForNerdsPanelProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // fallback
    }
  };

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
  const networkMode =
    stats?.streamingStatus ||
    (stats?.networkAdapter === 'web-extension' ? 'Direct CDN via Extension' : 'Edge Fallback Proxy');
  const bufferedAhead = stats?.bufferedAheadSeconds ?? 0;
  const bufferedPct = Math.min(100, Math.max(0, stats?.bufferedPercent ?? 0));

  return (
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
  );
}
