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
  Input,
  FormField,
  Badge,
  Alert,
  Separator,
  Stack,
  Flex,
  Grid,
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [oauthWarning, setOauthWarning] = useState<{ provider: string; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { login, register, loginWithProvider, loginAsGuest } = useAuthStore();

  const handleProviderLogin = async (
    provider: 'google' | 'github' | 'apple' | 'discord',
    label: string
  ) => {
    setErrorMessage(null);
    setStatusMessage(null);
    setOauthWarning(null);
    setIsLoading(true);

    try {
      const res = await loginWithProvider(provider);
      if (res?.error) {
        setOauthWarning({
          provider: label,
          message: `${label} OAuth is not configured in this development environment (missing client credentials).`,
        });
      }
    } catch {
      setOauthWarning({
        provider: label,
        message: `${label} OAuth is not configured in this development environment (missing client credentials).`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDemoAccount = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setOauthWarning(null);
    const demoEmail = `listener.${Date.now().toString().slice(-4)}@ganegan.app`;
    const demoPass = 'DemoPassword123!';
    const res = await register('GaneGan Listener', demoEmail, demoPass);
    setIsLoading(false);
    if (res.success) {
      setStatusMessage(`Demo account ready (${demoEmail})! Redirecting...`);
      setTimeout(() => router.push('/'), 400);
    } else {
      setErrorMessage(res.error || 'Failed to create demo account.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please provide both email and password.');
      return;
    }

    setErrorMessage(null);
    setStatusMessage(null);
    setOauthWarning(null);
    setIsLoading(true);

    if (mode === 'register') {
      const displayName = name.trim() || email.split('@')[0];
      const res = await register(displayName, email, password);
      setIsLoading(false);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to create account.');
      } else {
        setStatusMessage('Account created successfully! Redirecting...');
        setTimeout(() => {
          router.push('/');
        }, 400);
      }
    } else {
      const res = await login(email, password);
      setIsLoading(false);
      if (!res.success) {
        setErrorMessage(res.error || 'Invalid email or password.');
      } else {
        setStatusMessage('Signed in successfully! Redirecting...');
        setTimeout(() => {
          router.push('/');
        }, 400);
      }
    }
  };

  const handleGuestLogin = () => {
    setStatusMessage('Continuing as Guest...');
    loginAsGuest();
    setTimeout(() => {
      router.push('/');
    }, 300);
  };

  return (
    <Box className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-canvas select-none">
      {/* Background Subtle Ambient Aura */}
      <AmbientAura
        primaryColor="#064e3b"
        secondaryColor="#18181b"
        tertiaryColor="#09090b"
        blur={140}
        intensity={0.25}
        className="fixed inset-0 pointer-events-none"
      />

      {/* Top Navigation: Return to Player */}
      <Box className="absolute top-6 left-6 sm:top-8 sm:left-8 z-20">
        <Button
          variant="glass"
          size="sm"
          leftIcon={<ArrowLeft size={15} />}
          onClick={() => router.push('/')}
        >
          Back to GaneGan
        </Button>
      </Box>

      {/* Centered Obsidian Glass Card */}
      <Card
        variant="glass"
        className="relative z-10 w-full max-w-[420px] p-6 sm:p-7 backdrop-blur-3xl shadow-2xl rounded-2xl border-border-subtle bg-surface/90"
      >
        <CardHeader className="text-center items-center pb-3">
          <Flex align="center" gap="2" justify="center" className="mb-1">
            <Box className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-active border border-border-subtle text-text-primary shadow-inner">
              <Music2 size={20} />
            </Box>
            <CardTitle className="text-2xl font-extrabold tracking-tight">
              GaneGan
            </CardTitle>
          </Flex>

          <Flex align="center" gap="2" justify="center">
            <Badge variant="glass" size="sm">
              <Sparkles size={11} className="mr-1 text-text-secondary" />
              Ad-Free InnerTube Streaming
            </Badge>
          </Flex>

          <CardDescription className="text-xs text-text-secondary mt-1.5">
            {mode === 'login'
              ? 'Sign in to sync your playlists and radio mixes.'
              : 'Create an account to save equalizer presets & favorites.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Segmented Mode Switcher */}
          <Box className="p-1 rounded-xl bg-surface-active/80 border border-border-subtle">
            <Flex gap="1">
              <Button
                variant={mode === 'login' ? 'primary' : 'ghost'}
                size="sm"
                fullWidth
                leftIcon={<LogIn size={14} />}
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                  setStatusMessage(null);
                  setOauthWarning(null);
                }}
                className={mode === 'login' ? 'shadow-sm' : 'text-text-secondary hover:text-text-primary'}
              >
                Sign In
              </Button>
              <Button
                variant={mode === 'register' ? 'primary' : 'ghost'}
                size="sm"
                fullWidth
                leftIcon={<UserPlus size={14} />}
                onClick={() => {
                  setMode('register');
                  setErrorMessage(null);
                  setStatusMessage(null);
                  setOauthWarning(null);
                }}
                className={mode === 'register' ? 'shadow-sm' : 'text-text-secondary hover:text-text-primary'}
              >
                Create Account
              </Button>
            </Flex>
          </Box>

          {/* Real Server Error Alert */}
          {errorMessage && (
            <Alert
              variant="error"
              title="Authentication Failed"
              onClose={() => setErrorMessage(null)}
              className="text-xs py-2.5"
            >
              {errorMessage}
            </Alert>
          )}

          {/* Social OAuth Fallback / Notice with 1-Click Demo Creation */}
          {oauthWarning && (
            <Alert
              variant="warning"
              title={`${oauthWarning.provider} OAuth Unavailable`}
              onClose={() => setOauthWarning(null)}
              className="text-xs py-2.5"
            >
              <Stack gap="2">
                <Text size="xs" color="secondary">
                  {oauthWarning.message}
                </Text>
                <Box>
                  <Button
                    type="button"
                    variant="secondary"
                    size="xs"
                    leftIcon={<Sparkles size={13} />}
                    onClick={handleCreateDemoAccount}
                    disabled={isLoading}
                  >
                    Create Demo Account (1-Click)
                  </Button>
                </Box>
              </Stack>
            </Alert>
          )}

          {/* Success Status Alert */}
          {statusMessage && (
            <Alert
              variant="success"
              icon={<Check size={15} />}
              className="text-xs py-2.5"
            >
              {statusMessage}
            </Alert>
          )}

          {/* Symmetrical 2x2 OAuth Providers Grid */}
          <Grid cols={2} gap="2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              fullWidth
              leftIcon={<Globe size={15} />}
              disabled={isLoading}
              onClick={() => handleProviderLogin('google', 'Google')}
            >
              Google
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              fullWidth
              leftIcon={<Github size={15} />}
              disabled={isLoading}
              onClick={() => handleProviderLogin('github', 'GitHub')}
            >
              GitHub
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              fullWidth
              leftIcon={<Music2 size={15} />}
              disabled={isLoading}
              onClick={() => handleProviderLogin('apple', 'Apple ID')}
            >
              Apple ID
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              fullWidth
              leftIcon={<Disc size={15} />}
              disabled={isLoading}
              onClick={() => handleProviderLogin('discord', 'Discord')}
            >
              Discord
            </Button>
          </Grid>

          {/* Accessible Separator */}
          <Flex align="center" gap="3">
            <Separator className="flex-1" />
            <Text variant="kicker" size="xs">
              OR EMAIL
            </Text>
            <Separator className="flex-1" />
          </Flex>

          {/* Credentials Form */}
          <form onSubmit={handleSubmit}>
            <Stack gap="3">
              {mode === 'register' && (
                <FormField label="Your Name" id="name-input" required>
                  <Input
                    id="name-input"
                    name="name"
                    autoComplete="name"
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
                  name="email"
                  type="email"
                  autoComplete="email"
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
                  name="password"
                  type="password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
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
                disabled={isLoading}
                className="mt-1"
              >
                {isLoading
                  ? 'Processing...'
                  : mode === 'login'
                  ? 'Sign In with Email'
                  : 'Create GaneGan Account'}
              </Button>
            </Stack>
          </form>
        </CardContent>

        <CardFooter className="flex-col gap-1.5 pt-1 text-center">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            disabled={isLoading}
            onClick={handleGuestLogin}
            className="text-text-secondary hover:text-text-primary"
          >
            Continue as Guest (Instant Playback)
          </Button>
          <Text variant="secondary" size="xs">
            Protected by GaneGan clean InnerTube audio engine.
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
