import { create } from 'zustand';
import type { Family, AppState } from '../types';

interface AppStateStore extends AppState {
  setFamily: (family: Family | null) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setNotifications: (enabled: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  reset: () => void;
}

export const useAppStore = create<AppStateStore>((set) => ({
  family: null,
  theme: 'light',
  notifications: true,
  isInitialized: false,

  setFamily: (family) => set({ family }),
  setTheme: (theme) => set({ theme }),
  setNotifications: (notifications) => set({ notifications }),
  setInitialized: (isInitialized) => set({ isInitialized }),
  reset: () => {
    set({
      family: null,
      notifications: true,
      isInitialized: false,
    });
  },
}));
