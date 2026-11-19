'use client';

import React from 'react';
import { ExternalLink, RefreshCw, Music2 } from 'lucide-react';
import {
  DialogFooter,
  Button,
  Card,
  Stack,
  Flex,
  Box,
  Text,
} from '@mp/dying';

export interface StageSignedOutProps {
  onCheckStatus: () => void;
  isChecking: boolean;
}

export const StageSignedOut: React.FC<StageSignedOutProps> = ({
  onCheckStatus,
  isChecking,
}) => {
  return (
    <Stack gap="4" className="py-2">
      <Card variant="default" className="p-4 border-border-subtle bg-surface-active/30">
        <Flex align="center" gap="3" className="mb-2">
          <Box className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Music2 size={20} />
          </Box>
          <Stack gap="1">
            <Text size="sm" weight="semibold" className="text-text-primary">
              Sign in to YouTube Music
            </Text>
            <Text size="xs" variant="secondary">
              Your extension is connected. Sign in on YouTube Music to sync your personal library.
            </Text>
          </Stack>
        </Flex>
      </Card>

      <DialogFooter className="pt-2 flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={onCheckStatus}
          isLoading={isChecking}
          loadingText="Checking..."
          leftIcon={<RefreshCw size={16} />}
        >
          Check Status
        </Button>
        <Button
          variant="primary"
          onClick={() => window.open('https://music.youtube.com', '_blank', 'noopener,noreferrer')}
          rightIcon={<ExternalLink size={16} />}
        >
          Open YouTube Music
        </Button>
      </DialogFooter>
    </Stack>
  );
};
