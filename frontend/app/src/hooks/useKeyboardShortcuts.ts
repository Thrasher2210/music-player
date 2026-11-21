'use client';

import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../stores/playerStore';

export interface UseKeyboardShortcutsOptions {
  toggleLyrics?: () => void;
  onToggleLyrics?: () => void;
  toggleFullPlayer?: () => void;
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

function isInsideMenu(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('[role="menu"]') !== null;
}

export function useKeyboardShortcuts(options?: UseKeyboardShortcutsOptions): void {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Open menus own their keys (arrows, typeahead, Enter, Space, Escape)
      if (isInsideMenu(e.target)) return;

      // Escape: close full player / modals or blur inputs
      if (e.key === 'Escape') {
        if (e.target instanceof HTMLElement) {
          e.target.blur();
        }
        const opts = optionsRef.current;
        const fn = opts?.closeModals || opts?.onCloseModals;
        if (fn) {
          e.preventDefault();
          fn();
        }
        return;
      }

      // Ignore shortcuts if typing in an input, textarea, or contentEditable element
      if (isEditableTarget(e.target)) return;

      // Focus Search: / or Ctrl+K / Meta+K
      if (
        (e.key === '/' || ((e.code === 'KeyK' || e.key === 'k') && (e.ctrlKey || e.metaKey))) &&
        !e.altKey
      ) {
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[type="search"], input[placeholder*="Search"]'
        );
        if (searchInput) {
          e.preventDefault();
          searchInput.focus();
          searchInput.select();
          return;
        }
      }

      // Space or 'k' or MediaPlayPause: togglePlay()
      if (
        (e.code === 'Space' ||
          e.key === ' ' ||
          e.code === 'KeyK' ||
          e.key === 'k' ||
          e.key === 'K' ||
          e.key === 'MediaPlayPause') &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
        usePlayerStore.getState().togglePlay();
        return;
      }

      // Next Track: Shift + N or MediaTrackNext
      if (
        (e.key === 'MediaTrackNext' ||
          ((e.code === 'KeyN' || e.key === 'N') && e.shiftKey)) &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
        usePlayerStore.getState().next();
        return;
      }

      // Previous Track: Shift + P or MediaTrackPrevious
      if (
        (e.key === 'MediaTrackPrevious' ||
          ((e.code === 'KeyP' || e.key === 'P') && e.shiftKey)) &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
        usePlayerStore.getState().previous();
        return;
      }

      // Seek backward: ArrowLeft (-5s, Shift: -15s) or KeyJ (-10s)
      if (
        e.key === 'ArrowLeft' ||
        (!e.ctrlKey && !e.metaKey && !e.altKey && (e.code === 'KeyJ' || e.key === 'j' || e.key === 'J'))
      ) {
        e.preventDefault();
        const { currentTime, seek } = usePlayerStore.getState();
        const isJ = e.code === 'KeyJ' || e.key === 'j' || e.key === 'J';
        const step = isJ ? 10 : (e.shiftKey ? 15 : 5);
        seek(Math.max(0, currentTime - step));
        return;
      }

      // Seek forward: ArrowRight (+5s, Shift: +15s)
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

      // KeyL or Shift+L: toggle lyrics view
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

      // KeyF: toggle full player
      if (
        (e.code === 'KeyF' || e.key === 'f' || e.key === 'F') &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        const opts = optionsRef.current;
        if (opts?.toggleFullPlayer) {
          e.preventDefault();
          opts.toggleFullPlayer();
          return;
        }
      }
    };

    // Use capture phase so focused buttons or containers do not suppress or conflict with global shortcuts
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, []);
}
