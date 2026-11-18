'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Mail,
  Lock,
  User,
  Sparkles,
  Check,
  Github,
  Music2,
  LogIn,
  UserPlus,
  Globe,
  Disc,
} from 'lucide-react';
import {
  AmbientAura,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  ButtonGroup,
  Input,
  FormField,
  Badge,
  Alert,
  Separator,
  Stack,
  Flex,
  Box,
  Text,
} from '@mp/dying';
import { useAuthStore } from '../../stores/authStore';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const { login, loginWithProvider, loginAsGuest } = useAuthStore();

  const handleProviderLogin = (provider: 'google' | 'github' | 'apple' | 'discord', label: string) => {
    setStatusMessage(`Connecting to ${label}...`);
    loginWithProvider(provider);
    setTimeout(() => {
      setStatusMessage('Signed in successfully! Redirecting...');
      setTimeout(() => {
        router.push('/');
      }, 400);
    }, 400);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    const displayName = mode === 'register' && name.trim() ? name.trim() : email.split('@')[0];
    setStatusMessage(mode === 'register' ? 'Creating your account...' : 'Signing in...');
    login(displayName, email);

    setTimeout(() => {
      setStatusMessage('Success! Redirecting...');
      setTimeout(() => {
        router.push('/');
      }, 400);
    }, 400);
  };

  const handleGuestLogin = () => {
    setStatusMessage('Continuing as Guest...');
    loginAsGuest();
    setTimeout(() => {
      router.push('/');
    }, 300);
  };

  return (
    <Box className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden bg-canvas select-none">
      {/* Background Ambient Aura using Dying Obsidian Tone Variables */}
      <AmbientAura
        primaryColor="var(--dying-color-accent, #10b981)"
        secondaryColor="var(--dying-color-surface, #1e1e24)"
        tertiaryColor="var(--dying-color-canvas, #0a0a0c)"
        blur={120}
        intensity={0.5}
        className="fixed inset-0 pointer-events-none"
      />

      {/* Top Navigation: Return to Player */}
      <Box className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft size={16} />}
          onClick={() => router.push('/')}
        >
          Back to GaneGan
        </Button>
      </Box>

      {/* Centered Login Card strictly built from Dying Card primitives */}
      <Card
        variant="glass"
        className="relative z-10 w-full max-w-md backdrop-blur-3xl"
      >
        <CardHeader className="text-center items-center pb-4">
          <Flex align="center" gap="2" justify="center" className="mb-1">
            <Box className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-active border border-border-subtle text-text-primary shadow-inner">
              <Music2 size={22} />
            </Box>
            <CardTitle className="text-2xl font-extrabold tracking-tight">
              GaneGan
            </CardTitle>
          </Flex>

          <Flex align="center" gap="2" justify="center">
            <Badge variant="glass" size="sm">
              <Sparkles size={12} className="mr-1 text-text-secondary" />
              Ad-Free InnerTube Streaming
            </Badge>
          </Flex>

          <CardDescription className="text-xs text-text-secondary mt-2">
            {mode === 'login'
              ? 'Sign in to access synchronized playlists, radio mixes, and synced lyrics.'
              : 'Create an account to save custom equalizer presets and pinned mixes.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Dying Mode Switcher Tabs */}
          <ButtonGroup attached className="w-full">
            <Button
              variant={mode === 'login' ? 'primary' : 'ghost'}
              size="sm"
              leftIcon={<LogIn size={14} />}
              fullWidth
              onClick={() => {
                setMode('login');
                setStatusMessage(null);
              }}
            >
              Sign In
            </Button>
            <Button
              variant={mode === 'register' ? 'primary' : 'ghost'}
              size="sm"
              leftIcon={<UserPlus size={14} />}
              fullWidth
              onClick={() => {
                setMode('register');
                setStatusMessage(null);
              }}
            >
              Create Account
            </Button>
          </ButtonGroup>

          {/* Dying Alert Feedback */}
          {statusMessage && (
            <Alert
              variant="success"
              icon={<Check size={16} />}
              className="text-xs"
            >
              {statusMessage}
            </Alert>
          )}

          {/* Social / OAuth Providers */}
          <Stack gap="2">
            <Button
              type="button"
              variant="outline"
              size="md"
              fullWidth
              leftIcon={<Globe size={16} />}
              onClick={() => handleProviderLogin('google', 'Google')}
            >
              Continue with Google
            </Button>

            <Button
              type="button"
              variant="outline"
              size="md"
              fullWidth
              leftIcon={<Github size={16} />}
              onClick={() => handleProviderLogin('github', 'GitHub')}
            >
              Continue with GitHub
            </Button>

            <Flex gap="2">
              <Button
                type="button"
                variant="outline"
                size="md"
                fullWidth
                leftIcon={<Music2 size={16} />}
                onClick={() => handleProviderLogin('apple', 'Apple ID')}
              >
                Apple ID
              </Button>

              <Button
                type="button"
                variant="outline"
                size="md"
                fullWidth
                leftIcon={<Disc size={16} />}
                onClick={() => handleProviderLogin('discord', 'Discord')}
              >
                Discord
              </Button>
            </Flex>
          </Stack>

          {/* Accessible Separator */}
          <Flex align="center" gap="3">
            <Separator className="flex-1" />
            <Text variant="kicker" size="xs">
              OR EMAIL
            </Text>
            <Separator className="flex-1" />
          </Flex>

          {/* Form using Dying FormField & Input */}
          <form onSubmit={handleSubmit}>
            <Stack gap="3">
              {mode === 'register' && (
                <FormField label="Your Name" id="name-input" required>
                  <Input
                    id="name-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex"
                    leftIcon={<User size={15} />}
                    required={mode === 'register'}
                  />
                </FormField>
              )}

              <FormField label="Email Address" id="email-input" required>
                <Input
                  id="email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  leftIcon={<Mail size={15} />}
                  required
                />
              </FormField>

              <FormField label="Password" id="password-input" required>
                <Input
                  id="password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  leftIcon={<Lock size={15} />}
                  required
                />
              </FormField>

              <Button
                type="submit"
                variant="primary"
                size="md"
                fullWidth
                className="mt-2"
              >
                {mode === 'login' ? 'Sign In with Email' : 'Create GaneGan Account'}
              </Button>
            </Stack>
          </form>
        </CardContent>

        <CardFooter className="flex-col gap-2 pt-2 text-center">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={handleGuestLogin}
          >
            Continue as Guest (Instant Playback)
          </Button>
          <Text variant="secondary" size="xs" className="text-[11px]">
            Protected by GaneGan Obsidian audio engine.
          </Text>
        </CardFooter>
      </Card>
    </Box>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Box className="min-h-screen w-full bg-canvas" />}>
      <LoginForm />
    </Suspense>
  );
}
