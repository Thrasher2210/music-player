'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  FormField,
  Avatar,
  Badge,
  Stack,
  Flex,
  Text,
  Separator,
} from '@mp/dying';
import { useAuthStore } from '../stores/authStore';
import { User, LogOut, Check, Sparkles, Mail } from 'lucide-react';

export interface AccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({ open, onOpenChange }) => {
  const { user, isAuthenticated, login, logout } = useAuthStore();
  const [nameInput, setNameInput] = useState(user?.name || '');
  const [emailInput, setEmailInput] = useState(user?.email || '');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    login(nameInput.trim(), emailInput.trim() || `${nameInput.toLowerCase().replace(/\s+/g, '')}@ganegan.app`);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onOpenChange(false);
    }, 800);
  };

  const handleLogout = () => {
    logout();
    setNameInput('Guest User');
    setEmailInput('guest@ganegan.local');
    onOpenChange(false);
  };

  const initial = (user?.name || nameInput || 'G')[0].toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md select-none">
        <DialogHeader>
          <Flex align="center" gap="3">
            <Avatar
              fallback={initial}
              size="md"
            />
            <Stack gap="1">
              <DialogTitle className="text-lg font-bold text-text-primary">
                {isAuthenticated ? user?.name : 'Account Profile'}
              </DialogTitle>
              <DialogDescription className="text-xs text-text-secondary">
                {isAuthenticated
                  ? user?.email
                  : 'Customize your profile or sign in to sync favorites'}
              </DialogDescription>
            </Stack>
          </Flex>
        </DialogHeader>

        <form onSubmit={handleSave}>
          <Stack gap="4" className="py-4">
            <Flex justify="between" align="center" className="p-3 rounded-xl bg-surface-active border border-border-subtle">
              <Flex align="center" gap="2">
                <Sparkles size={16} className="text-accent" />
                <Stack gap="1">
                  <Text size="xs" weight="semibold">GaneGan Unlimited</Text>
                  <Text size="xs" color="tertiary">Ad-free InnerTube streaming</Text>
                </Stack>
              </Flex>
              <Badge variant="glass" size="sm">
                {isAuthenticated ? 'Active' : 'Guest Mode'}
              </Badge>
            </Flex>

            <FormField label="Display Name" id="account-name" required>
              <Input
                id="account-name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Enter your name"
                leftIcon={<User size={15} />}
                required
              />
            </FormField>

            <FormField label="Email Address" id="account-email">
              <Input
                id="account-email"
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="name@example.com"
                leftIcon={<Mail size={15} />}
              />
            </FormField>
          </Stack>

          <Separator className="my-2" />

          <DialogFooter className="pt-2 flex items-center justify-between">
            {isAuthenticated ? (
              <Button
                type="button"
                variant="danger"
                size="sm"
                leftIcon={<LogOut size={14} />}
                onClick={handleLogout}
              >
                Sign Out
              </Button>
            ) : (
              <div />
            )}

            <Flex gap="2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                leftIcon={isSaved ? <Check size={14} /> : undefined}
              >
                {isSaved ? 'Saved!' : isAuthenticated ? 'Save Profile' : 'Save & Continue'}
              </Button>
            </Flex>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
