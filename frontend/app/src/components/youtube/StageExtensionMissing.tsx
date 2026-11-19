'use client';

import React from 'react';
import { RefreshCw, FolderDown, Chrome, UploadCloud } from 'lucide-react';
import {
  DialogFooter,
  Button,
  Card,
  Stack,
  Flex,
  Box,
  Text,
} from '@mp/dying';

export interface StageExtensionMissingProps {
  onVerify: () => void;
  onCancel: () => void;
  isChecking: boolean;
}

export const StageExtensionMissing: React.FC<StageExtensionMissingProps> = ({
  onVerify,
  onCancel,
  isChecking,
}) => {
  return (
    <Stack gap="4" className="py-2">
      <Card variant="default" className="p-4 border-border-subtle bg-surface-active/40">
        <Text size="sm" weight="semibold" className="text-text-primary block mb-1">
          Install Browser Extension
        </Text>
        <Text size="xs" variant="secondary" className="block mb-3">
          The GaneGan Companion Extension enables high-fidelity YouTube Music streaming and library synchronization without CORS restrictions.
        </Text>

        <Stack gap="3">
          <Flex align="start" gap="3">
            <Box className="p-2 rounded-xl bg-surface border border-border-subtle text-text-primary mt-0.5">
              <FolderDown size={16} />
            </Box>
            <Stack gap="1">
              <Text size="xs" weight="medium" className="text-text-primary">
                1. Locate or Build Extension
              </Text>
              <Text size="xs" variant="secondary">
                Pre-built at `frontend/extension/.output/chrome-mv3` (or run `pnpm --filter @mp/extension build`).
              </Text>
            </Stack>
          </Flex>

          <Flex align="start" gap="3">
            <Box className="p-2 rounded-xl bg-surface border border-border-subtle text-text-primary mt-0.5">
              <Chrome size={16} />
            </Box>
            <Stack gap="1">
              <Text size="xs" weight="medium" className="text-text-primary">
                2. Open chrome://extensions
              </Text>
              <Text size="xs" variant="secondary">
                Open your Chromium extensions manager and toggle Developer mode on.
              </Text>
            </Stack>
          </Flex>

          <Flex align="start" gap="3">
            <Box className="p-2 rounded-xl bg-surface border border-border-subtle text-text-primary mt-0.5">
              <UploadCloud size={16} />
            </Box>
            <Stack gap="1">
              <Text size="xs" weight="medium" className="text-text-primary">
                3. Load Unpacked
              </Text>
              <Text size="xs" variant="secondary">
                Select `frontend/extension/.output/chrome-mv3` to activate the bridge.
              </Text>
            </Stack>
          </Flex>
        </Stack>
      </Card>

      <DialogFooter className="pt-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={onVerify}
          isLoading={isChecking}
          loadingText="Verifying..."
          leftIcon={<RefreshCw size={16} />}
        >
          Verify Connection
        </Button>
      </DialogFooter>
    </Stack>
  );
};
