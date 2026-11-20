'use client';

import React from 'react';
import { RefreshCw, Download, FolderDown, Chrome, UploadCloud } from 'lucide-react';
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
        <Text size="xs" variant="secondary" className="block mb-4">
          The GaneGan Companion Extension enables high-fidelity YouTube Music streaming and library synchronization without CORS restrictions.
        </Text>

        <Box className="mb-4">
          <a
            href="/downloads/ganegan-extension.zip"
            download="ganegan-extension.zip"
            className="block w-full no-underline"
          >
            <Button
              variant="primary"
              fullWidth
              leftIcon={<Download size={16} />}
            >
              Download Extension (.zip)
            </Button>
          </a>
        </Box>

        <Stack gap="3">
          <Flex align="start" gap="3">
            <Box className="p-2 rounded-xl bg-surface border border-border-subtle text-text-primary mt-0.5">
              <FolderDown size={16} />
            </Box>
            <Stack gap="1">
              <Text size="xs" weight="medium" className="text-text-primary">
                1. Download & Extract
              </Text>
              <Text size="xs" variant="secondary">
                Click the download button above and extract the zip file into a folder on your computer.
              </Text>
            </Stack>
          </Flex>

          <Flex align="start" gap="3">
            <Box className="p-2 rounded-xl bg-surface border border-border-subtle text-text-primary mt-0.5">
              <Chrome size={16} />
            </Box>
            <Stack gap="1">
              <Text size="xs" weight="medium" className="text-text-primary">
                2. Open Extensions Manager
              </Text>
              <Text size="xs" variant="secondary">
                Go to <code className="text-text-primary bg-surface px-1 py-0.5 rounded text-[11px]">chrome://extensions</code> in your browser and toggle Developer mode ON.
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
                Click &ldquo;Load unpacked&rdquo; in the top-left and select the extracted folder.
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
          variant="secondary"
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
