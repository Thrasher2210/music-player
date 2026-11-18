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
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: {
        id: 'guest-1',
        name: 'Guest User',
        email: 'guest@ganegan.local',
        isGuest: true,
      },
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
      logout: () =>
        set({
          user: { id: 'guest-1', name: 'Guest User', email: 'guest@ganegan.local', isGuest: true },
          isAuthenticated: false,
        }),
    }),
    {
      name: 'ganegan-auth-session',
    }
  )
);
