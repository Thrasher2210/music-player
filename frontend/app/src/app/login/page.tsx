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
  GlassCard,
  Button,
  Input,
  Badge,
  Separator,
  Stack,
  Flex,
  Box,
  Text,
  Heading,
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
      setStatusMessage('Signed in! Redirecting...');
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
      {/* Background Ambient Aura for Obsidian Dark Glow */}
      <AmbientAura
        primaryColor="rgba(16, 185, 129, 0.25)"
        secondaryColor="rgba(5, 150, 105, 0.15)"
        tertiaryColor="rgba(4, 120, 87, 0.1)"
        blur={100}
        intensity={0.65}
        className="fixed inset-0 pointer-events-none"
      />

      {/* Top Navigation: Return to Player */}
      <Box className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft size={16} />}
          onClick={() => router.push('/')}
          className="text-text-secondary hover:text-white"
        >
          Back to GaneGan
        </Button>
      </Box>

      {/* Centered Login Card */}
      <GlassCard
        interactive={false}
        className="relative z-10 w-full max-w-md p-6 sm:p-8 bg-surface/90 border-border-subtle backdrop-blur-3xl shadow-2xl rounded-2xl"
      >
        <Stack gap="6">
          {/* Brand Header */}
          <Stack gap="2" className="text-center items-center">
            <Flex align="center" gap="2" justify="center">
              <Box className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-inner">
                <Music2 size={22} />
              </Box>
              <Heading level={2} size="h2" className="font-extrabold tracking-tight text-text-primary">
                GaneGan
              </Heading>
            </Flex>

            <Flex align="center" gap="2" justify="center">
              <Badge variant="glass" size="sm" className="text-emerald-400 border-emerald-500/30">
                <Sparkles size={12} className="mr-1" />
                Ad-Free Music Streaming
              </Badge>
            </Flex>

            <Text size="xs" color="secondary" className="mt-1">
              {mode === 'login'
                ? 'Sign in to access synchronized playlists, radio mixes & lyrics.'
                : 'Create an account to save playlists and custom equalizers.'}
            </Text>
          </Stack>

          {/* Mode Switcher Tabs */}
          <Flex className="p-1 rounded-xl bg-surface-active/80 border border-border-subtle" gap="1">
            <Button
              variant={mode === 'login' ? 'primary' : 'ghost'}
              size="sm"
              leftIcon={<LogIn size={14} />}
              onClick={() => {
                setMode('login');
                setStatusMessage(null);
              }}
              className={`flex-1 ${mode === 'login' ? 'bg-emerald-600 text-white font-semibold' : 'text-text-secondary'}`}
            >
              Sign In
            </Button>
            <Button
              variant={mode === 'register' ? 'primary' : 'ghost'}
              size="sm"
              leftIcon={<UserPlus size={14} />}
              onClick={() => {
                setMode('register');
                setStatusMessage(null);
              }}
              className={`flex-1 ${mode === 'register' ? 'bg-emerald-600 text-white font-semibold' : 'text-text-secondary'}`}
            >
              Create Account
            </Button>
          </Flex>

          {/* Status Message / Feedback Alert */}
          {statusMessage && (
            <Flex align="center" gap="2" justify="center" className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <Check size={14} />
              <span>{statusMessage}</span>
            </Flex>
          )}

          {/* Social / OAuth Providers */}
          <Stack gap="2">
            <Button
              type="button"
              variant="outline"
              size="md"
              leftIcon={<Globe size={16} className="text-red-400" />}
              onClick={() => handleProviderLogin('google', 'Google')}
              className="w-full justify-center border-border-subtle hover:bg-surface-hover text-text-primary"
            >
              Continue with Google
            </Button>

            <Button
              type="button"
              variant="outline"
              size="md"
              leftIcon={<Github size={16} className="text-white" />}
              onClick={() => handleProviderLogin('github', 'GitHub')}
              className="w-full justify-center border-border-subtle hover:bg-surface-hover text-text-primary"
            >
              Continue with GitHub
            </Button>

            <Flex gap="2">
              <Button
                type="button"
                variant="outline"
                size="md"
                leftIcon={<Music2 size={16} className="text-pink-400" />}
                onClick={() => handleProviderLogin('apple', 'Apple ID')}
                className="flex-1 justify-center border-border-subtle hover:bg-surface-hover text-text-primary text-xs"
              >
                Apple ID
              </Button>

              <Button
                type="button"
                variant="outline"
                size="md"
                leftIcon={<Disc size={16} className="text-indigo-400" />}
                onClick={() => handleProviderLogin('discord', 'Discord')}
                className="flex-1 justify-center border-border-subtle hover:bg-surface-hover text-text-primary text-xs"
              >
                Discord
              </Button>
            </Flex>
          </Stack>

          {/* Divider */}
          <Flex align="center" gap="3">
            <Separator className="flex-1" />
            <Text size="xs" color="tertiary" className="uppercase font-mono text-[10px]">
              or email
            </Text>
            <Separator className="flex-1" />
          </Flex>

          {/* Credentials Form */}
          <form onSubmit={handleSubmit}>
            <Stack gap="3">
              {mode === 'register' && (
                <Stack gap="1">
                  <Text size="xs" weight="medium" color="secondary">
                    Your Name
                  </Text>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Anshul"
                    leftIcon={<User size={15} className="text-text-tertiary" />}
                    required={mode === 'register'}
                  />
                </Stack>
              )}

              <Stack gap="1">
                <Text size="xs" weight="medium" color="secondary">
                  Email Address
                </Text>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  leftIcon={<Mail size={15} className="text-text-tertiary" />}
                  required
                />
              </Stack>

              <Stack gap="1">
                <Text size="xs" weight="medium" color="secondary">
                  Password
                </Text>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  leftIcon={<Lock size={15} className="text-text-tertiary" />}
                  required
                />
              </Stack>

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-950/40"
              >
                {mode === 'login' ? 'Sign In with Email' : 'Create GaneGan Account'}
              </Button>
            </Stack>
          </form>

          {/* Bottom Guest Mode Action */}
          <Stack gap="2" className="pt-2 text-center">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={handleGuestLogin}
              className="text-text-tertiary hover:text-text-primary"
            >
              Continue as Guest (No Sign Up Required)
            </Button>
            <Text size="xs" color="tertiary" className="text-[10px]">
              By continuing you agree to clean ad-free YouTube Music terms.
            </Text>
          </Stack>
        </Stack>
      </GlassCard>
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
