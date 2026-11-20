'use client';

import { useEffect } from 'react';
import { useYouTubeAuthStore } from '../stores/youtubeAuthStore';

export function useYouTubeSyncInit() {
  useEffect(() => {
    // 1. Initial check on mount
    useYouTubeAuthStore.getState().checkStatus();

    // 2. Listen for extension injection custom event
    const handleActive = () => {
      useYouTubeAuthStore.getState().checkStatus();
    };

    window.addEventListener('mp-extension-active', handleActive);

    // 3. Listen for extension ready event only (never check-auth response to prevent loops)
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'MP_EXTENSION_READY') {
        (window as any).__MP_EXTENSION_ACTIVE__ = true;
        useYouTubeAuthStore.getState().checkStatus();
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('mp-extension-active', handleActive);
      window.removeEventListener('message', handleMessage);
    };
  }, []);
}
