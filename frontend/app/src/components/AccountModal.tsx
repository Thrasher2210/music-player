'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Avatar,
  Flex,
  Stack,
} from '@mp/dying';
import { useAuthStore } from '../stores/authStore';
import { UserProfileView } from './account/UserProfileView';
import { AuthFormView } from './account/AuthFormView';

export interface AccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({ open, onOpenChange }) => {
  const { user, isAuthenticated, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    onOpenChange(false);
  };

  const initial = (user?.name || 'G')[0].toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md select-none">
        <DialogHeader>
          <Flex align="center" gap="3">
            <Avatar fallback={initial} size="md" />
            <Stack gap="1">
              <DialogTitle className="text-lg font-bold text-text-primary">
                {isAuthenticated ? user?.name : 'Account Profile'}
              </DialogTitle>
              <DialogDescription className="text-xs text-text-secondary">
                {isAuthenticated
                  ? user?.email
                  : 'Sign in or create an account to sync your playlists & likes'}
              </DialogDescription>
            </Stack>
          </Flex>
        </DialogHeader>

        {isAuthenticated ? (
          <UserProfileView
            user={user}
            onLogout={handleLogout}
            onClose={() => onOpenChange(false)}
          />
        ) : (
          <AuthFormView
            onSuccess={() => onOpenChange(false)}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
