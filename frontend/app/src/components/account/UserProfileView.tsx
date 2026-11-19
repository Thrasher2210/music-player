'use client';

import React from 'react';
import {
  DialogFooter,
  Button,
  Badge,
  Stack,
  Flex,
  Box,
  Text,
  Separator,
} from '@mp/dying';
import { LogOut, Sparkles } from 'lucide-react';
import { type UserProfile } from '../../stores/authStore';

export interface UserProfileViewProps {
  user: UserProfile | null;
  onLogout: () => void;
  onClose: () => void;
}

export function UserProfileView({ user, onLogout, onClose }: UserProfileViewProps) {
  return (
    <Stack gap="4" className="py-4">
      <Flex
        justify="between"
        align="center"
        className="p-3 rounded-xl bg-surface-active border border-border-subtle"
      >
        <Flex align="center" gap="2">
          <Sparkles size={16} className="text-accent" />
          <Stack gap="1">
            <Text size="xs" weight="semibold">
              GaneGan Unlimited
            </Text>
            <Text size="xs" color="tertiary">
              Ad-free InnerTube streaming & cloud sync
            </Text>
          </Stack>
        </Flex>
        <Badge variant="glass" size="sm">
          Active
        </Badge>
      </Flex>

      <Box className="p-3 rounded-xl bg-surface border border-border-subtle">
        <Stack gap="2">
          <Flex justify="between" align="center">
            <Text size="xs" color="secondary">
              Account Name
            </Text>
            <Text size="xs" weight="medium">
              {user?.name}
            </Text>
          </Flex>
          <Separator />
          <Flex justify="between" align="center">
            <Text size="xs" color="secondary">
              Email Address
            </Text>
            <Text size="xs" weight="medium">
              {user?.email}
            </Text>
          </Flex>
        </Stack>
      </Box>

      <Separator className="my-1" />

      <DialogFooter className="pt-2 flex items-center justify-between">
        <Button
          type="button"
          variant="danger"
          size="sm"
          leftIcon={<LogOut size={14} />}
          onClick={onLogout}
        >
          Sign Out
        </Button>

        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={onClose}
        >
          Done
        </Button>
      </DialogFooter>
    </Stack>
  );
}
