import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Family, AppState } from '../types';

interface AppStateStore extends AppState {
  setFamily: (family: Family | null) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setNotifications: (enabled: boolean) => void;
  setEmailNotifications: (enabled: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  reset: () => void;
}

export const useAppStore = create<AppStateStore>()(
  persist(
    (set) => ({
      family: null,
      theme: 'light',
      notifications: true,
      emailNotifications: true,
      isInitialized: false,

      setFamily: (family) => set({ family }),
      setTheme: (theme) => set({ theme }),
      setNotifications: (notifications) => set({ notifications }),
      setEmailNotifications: (emailNotifications) => set({ emailNotifications }),
      setInitialized: (isInitialized) => set({ isInitialized }),
      reset: () => {
        set({
          family: null,
          notifications: true,
          emailNotifications: true,
          isInitialized: false,
        });
      },
    }),
    {
      name: 'app-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        theme: state.theme,
        notifications: state.notifications,
        emailNotifications: state.emailNotifications,
      }),
    },
  ),
);
