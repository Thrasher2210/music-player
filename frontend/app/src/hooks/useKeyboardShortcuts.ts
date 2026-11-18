'use client';

import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../stores/playerStore';

export interface UseKeyboardShortcutsOptions {
  toggleLyrics?: () => void;
  onToggleLyrics?: () => void;
  closeModals?: () => void;
  onCloseModals?: () => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tagName = target.tagName.toUpperCase();
  if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
    return true;
  }
  return false;
}

export function useKeyboardShortcuts(options?: UseKeyboardShortcutsOptions): void {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcut if user is typing in an input, textarea, or contentEditable element
      if (isEditableTarget(e.target)) return;

      // Space: togglePlay()
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        usePlayerStore.getState().togglePlay();
        return;
      }

      // ArrowLeft: seek backward -5s (Shift for -15s)
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const { currentTime, seek } = usePlayerStore.getState();
        const step = e.shiftKey ? 15 : 5;
        seek(Math.max(0, currentTime - step));
        return;
      }

      // ArrowRight: seek forward +5s (Shift for +15s)
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const { currentTime, duration, seek } = usePlayerStore.getState();
        const step = e.shiftKey ? 15 : 5;
        seek(Math.min(duration, currentTime + step));
        return;
      }

      // ArrowUp: volume +5%
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const { volume, setVolume } = usePlayerStore.getState();
        const nextVol = Math.min(1, Math.round((volume + 0.05) * 100) / 100);
        setVolume(nextVol);
        return;
      }

      // ArrowDown: volume -5%
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const { volume, setVolume } = usePlayerStore.getState();
        const nextVol = Math.max(0, Math.round((volume - 0.05) * 100) / 100);
        setVolume(nextVol);
        return;
      }

      // KeyM: toggleMute()
      if (
        (e.code === 'KeyM' || e.key === 'm' || e.key === 'M') &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
        usePlayerStore.getState().toggleMute();
        return;
      }

      // KeyL: toggle lyrics view
      if (
        (e.code === 'KeyL' || e.key === 'l' || e.key === 'L') &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
        const opts = optionsRef.current;
        const fn = opts?.toggleLyrics || opts?.onToggleLyrics;
        if (fn) fn();
        return;
      }

      // Escape: close full player / modals
      if (e.key === 'Escape') {
        const opts = optionsRef.current;
        const fn = opts?.closeModals || opts?.onCloseModals;
        if (fn) {
          e.preventDefault();
          fn();
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
}
