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

    // 3. Listen for extension message events
    const handleMessage = (event: MessageEvent) => {
      if (
        event.data?.type === 'MP_EXTENSION_READY' ||
        event.data?.type === 'MP_EXT_CHECK_AUTH_RESPONSE'
      ) {
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
