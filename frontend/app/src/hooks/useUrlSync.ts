'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { usePlayerStore, Track } from '../stores/playerStore';

export interface UseUrlSyncOptions {
  isFullPlayerOpen: boolean;
  setIsFullPlayerOpen: (open: boolean) => void;
}

/**
 * useUrlSync: Two-way synchronization between browser URL parameters and GaneGan playback state.
 * - Updates shallow ?v=videoId&list=playlistId on the current route when playing tracks.
 * - Synchronizes the full-screen visualizer / lyrics view with /watch?v=videoId.
 * - Handles cold URL loads with browser autoplay policy fallback (cues track ready for 1-click play).
 */
export function useUrlSync({ isFullPlayerOpen, setIsFullPlayerOpen }: UseUrlSyncOptions): void {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const isInitialized = usePlayerStore((s) => s.isInitialized);
  const initialize = usePlayerStore((s) => s.initialize);

  const previousPathRef = useRef<string | null>(null);
  const isInitialSyncRef = useRef(false);

  // 1. Initial cold-load sync: Parse ?v= from URL on first mount
  useEffect(() => {
    if (isInitialSyncRef.current) return;
    isInitialSyncRef.current = true;

    if (!isInitialized) {
      initialize();
    }

    const videoId = searchParams.get('v');
    const isWatchRoute = pathname === '/watch';

    if (isWatchRoute) {
      setIsFullPlayerOpen(true);
    }

    const current = usePlayerStore.getState().currentTrack;
    if (videoId && (!current || current.videoId !== videoId)) {
      const initialTrack: Track = {
        id: videoId,
        videoId,
        title: 'Loading...',
        artist: 'YouTube Music',
        duration: 180,
        thumbnail: '',
      };

      playTrack(initialTrack).catch((err) => {
        // Handle browser autoplay policy (NotAllowedError) gracefully:
        // Stream is cued and ready, user clicks play once to start audio
        console.warn('[useUrlSync] Autoplay blocked by browser policy on cold load:', err?.message);
      });
    }
  }, [pathname, searchParams, isInitialized, initialize, playTrack, setIsFullPlayerOpen]);

  // 2. Track change: update shallow URL params (?v=videoId) on the current route
  useEffect(() => {
    if (!currentTrack?.videoId || typeof window === 'undefined') return;

    const currentV = searchParams.get('v');
    if (currentV === currentTrack.videoId) return;

    const newParams = new URLSearchParams(window.location.search);
    newParams.set('v', currentTrack.videoId);

    const newUrl = `${pathname}?${newParams.toString()}`;
    window.history.replaceState(null, '', newUrl);
  }, [currentTrack?.videoId, pathname, searchParams]);

  // 3. Full Player / Lyrics view sync with /watch?v=videoId
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isFullPlayerOpen && pathname !== '/watch') {
      previousPathRef.current = `${pathname}${window.location.search}`;
      const v = currentTrack?.videoId || searchParams.get('v') || '';
      const watchUrl = v ? `/watch?v=${v}` : '/watch';
      router.push(watchUrl);
    } else if (!isFullPlayerOpen && pathname === '/watch') {
      const target = previousPathRef.current || '/';
      previousPathRef.current = null;
      router.push(target);
    }
  }, [isFullPlayerOpen, pathname, currentTrack?.videoId, searchParams, router]);
}
