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
  Alert,
  Stack,
  Flex,
  Box,
  Text,
  Separator,
} from '@mp/dying';
import { useAuthStore } from '../stores/authStore';
import {
  User,
  LogOut,
  Check,
  Sparkles,
  Mail,
  Lock,
  LogIn,
  UserPlus,
} from 'lucide-react';

export interface AccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({ open, onOpenChange }) => {
  const { user, isAuthenticated, login, register, logout } = useAuthStore();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setErrorMessage(null);
    setStatusMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setErrorMessage(null);
    setStatusMessage(null);
    setIsLoading(true);

    if (mode === 'register') {
      const displayName = name.trim() || email.split('@')[0];
      const res = await register(displayName, email, password);
      setIsLoading(false);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to create account.');
      } else {
        setStatusMessage('Account created successfully!');
        setTimeout(() => {
          resetForm();
          onOpenChange(false);
        }, 600);
      }
    } else {
      const res = await login(email, password);
      setIsLoading(false);
      if (!res.success) {
        setErrorMessage(res.error || 'Invalid email or password.');
      } else {
        setStatusMessage('Signed in successfully!');
        setTimeout(() => {
          resetForm();
          onOpenChange(false);
        }, 600);
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    resetForm();
    onOpenChange(false);
  };

  const handleDemoAccount = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    const demoEmail = `listener.${Date.now().toString().slice(-4)}@ganegan.app`;
    const demoPass = 'DemoPassword123!';
    const res = await register('GaneGan Listener', demoEmail, demoPass);
    setIsLoading(false);
    if (res.success) {
      setStatusMessage('Demo account created and signed in!');
      setTimeout(() => {
        resetForm();
        onOpenChange(false);
      }, 600);
    } else {
      setErrorMessage(res.error || 'Failed to create demo account.');
    }
  };

  const initial = (user?.name || email || 'G')[0].toUpperCase();

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
                onClick={handleLogout}
              >
                Sign Out
              </Button>

              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Done
              </Button>
            </DialogFooter>
          </Stack>
        ) : (
          <form onSubmit={handleSubmit}>
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
                      Ad-free InnerTube streaming
                    </Text>
                  </Stack>
                </Flex>
                <Badge variant="glass" size="sm">
                  Guest Mode
                </Badge>
              </Flex>

              {/* Segmented Mode Switcher */}
              <Box className="p-1 rounded-xl bg-surface-active/80 border border-border-subtle">
                <Flex gap="1">
                  <Button
                    type="button"
                    variant={mode === 'login' ? 'primary' : 'ghost'}
                    size="sm"
                    fullWidth
                    leftIcon={<LogIn size={14} />}
                    onClick={() => {
                      setMode('login');
                      setErrorMessage(null);
                      setStatusMessage(null);
                    }}
                    className={
                      mode === 'login'
                        ? 'shadow-sm'
                        : 'text-text-secondary hover:text-text-primary'
                    }
                  >
                    Sign In
                  </Button>
                  <Button
                    type="button"
                    variant={mode === 'register' ? 'primary' : 'ghost'}
                    size="sm"
                    fullWidth
                    leftIcon={<UserPlus size={14} />}
                    onClick={() => {
                      setMode('register');
                      setErrorMessage(null);
                      setStatusMessage(null);
                    }}
                    className={
                      mode === 'register'
                        ? 'shadow-sm'
                        : 'text-text-secondary hover:text-text-primary'
                    }
                  >
                    Register
                  </Button>
                </Flex>
              </Box>

              {/* Server Error Alert */}
              {errorMessage && (
                <Alert
                  variant="error"
                  title="Authentication Failed"
                  onClose={() => setErrorMessage(null)}
                  className="text-xs py-2"
                >
                  {errorMessage}
                </Alert>
              )}

              {/* Success Alert */}
              {statusMessage && (
                <Alert
                  variant="success"
                  icon={<Check size={15} />}
                  className="text-xs py-2"
                >
                  {statusMessage}
                </Alert>
              )}

              {mode === 'register' && (
                <FormField label="Your Name" id="account-name" required>
                  <Input
                    id="account-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    leftIcon={<User size={15} />}
                    required={mode === 'register'}
                  />
                </FormField>
              )}

              <FormField label="Email Address" id="account-email" required>
                <Input
                  id="account-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  leftIcon={<Mail size={15} />}
                  required
                />
              </FormField>

              <FormField label="Password" id="account-password" required>
                <Input
                  id="account-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  leftIcon={<Lock size={15} />}
                  required
                />
              </FormField>
            </Stack>

            <Separator className="my-2" />

            <DialogFooter className="pt-2 flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDemoAccount}
                disabled={isLoading}
              >
                1-Click Demo
              </Button>

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
                  disabled={isLoading}
                  leftIcon={isLoading ? undefined : <Check size={14} />}
                >
                  {isLoading
                    ? 'Processing...'
                    : mode === 'login'
                    ? 'Sign In'
                    : 'Create Account'}
                </Button>
              </Flex>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
