import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  image?: string;
  isGuest?: boolean;
}

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  setUser: (user: UserProfile | null) => void;
  loginAsGuest: (name?: string) => void;
  login: (name: string, email: string) => void;
  loginWithProvider: (provider: 'google' | 'github' | 'apple' | 'discord') => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: Boolean(user && !user.isGuest) }),
      loginAsGuest: (name = 'Guest User') =>
        set({
          user: { id: `guest-${Date.now()}`, name, email: 'guest@ganegan.local', isGuest: true },
          isAuthenticated: false,
        }),
      login: (name: string, email: string) =>
        set({
          user: { id: `user-${Date.now()}`, name, email, isGuest: false },
          isAuthenticated: true,
        }),
      loginWithProvider: (provider: 'google' | 'github' | 'apple' | 'discord') => {
        const providerNames: Record<string, { name: string; email: string }> = {
          google: { name: 'Google Explorer', email: 'user@gmail.com' },
          github: { name: 'GitHub Developer', email: 'dev@github.com' },
          apple: { name: 'Apple Listener', email: 'user@icloud.com' },
          discord: { name: 'Discord Member', email: 'member@discord.gg' },
        };
        const info = providerNames[provider] || { name: 'GaneGan User', email: 'user@ganegan.app' };
        set({
          user: { id: `${provider}-${Date.now()}`, name: info.name, email: info.email, isGuest: false },
          isAuthenticated: true,
        });
      },
      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'ganegan-auth-session',
    }
  )
);
