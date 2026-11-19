'use client';

import React from 'react';
import { Grid, Button } from '@mp/dying';
import { Globe, Github, Music2, Disc } from 'lucide-react';

export interface OAuthButtonsProps {
  isLoading: boolean;
  onProviderLogin: (
    provider: 'google' | 'github' | 'apple' | 'discord',
    label: string
  ) => void;
}

export function OAuthButtons({ isLoading, onProviderLogin }: OAuthButtonsProps) {
  return (
    <Grid cols={2} gap="2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        fullWidth
        leftIcon={<Globe size={15} />}
        disabled={isLoading}
        onClick={() => onProviderLogin('google', 'Google')}
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
        onClick={() => onProviderLogin('github', 'GitHub')}
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
        onClick={() => onProviderLogin('apple', 'Apple ID')}
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
        onClick={() => onProviderLogin('discord', 'Discord')}
      >
        Discord
      </Button>
    </Grid>
  );
}
