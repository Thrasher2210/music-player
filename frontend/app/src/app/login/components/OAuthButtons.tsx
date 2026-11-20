'use client';

import React from 'react';
import { Grid, Button } from '@mp/dying';
import { Globe, Github, Music2, Disc } from 'lucide-react';
import type { OAuthProvider } from '../oauthProviders';

const PROVIDER_BUTTONS: Record<OAuthProvider, { label: string; icon: React.ReactNode }> = {
  google: { label: 'Google', icon: <Globe size={15} /> },
  github: { label: 'GitHub', icon: <Github size={15} /> },
  apple: { label: 'Apple ID', icon: <Music2 size={15} /> },
  discord: { label: 'Discord', icon: <Disc size={15} /> },
};

export interface OAuthButtonsProps {
  providers: OAuthProvider[];
  isLoading: boolean;
  onProviderLogin: (provider: OAuthProvider, label: string) => void;
}

export function OAuthButtons({ providers, isLoading, onProviderLogin }: OAuthButtonsProps) {
  return (
    <Grid cols={providers.length > 1 ? 2 : 1} gap="2">
      {providers.map((provider) => {
        const { label, icon } = PROVIDER_BUTTONS[provider];
        return (
          <Button
            key={provider}
            type="button"
            variant="outline"
            size="sm"
            fullWidth
            leftIcon={icon}
            disabled={isLoading}
            onClick={() => onProviderLogin(provider, label)}
          >
            {label}
          </Button>
        );
      })}
    </Grid>
  );
}
