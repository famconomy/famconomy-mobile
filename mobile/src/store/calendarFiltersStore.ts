import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type CalendarTimeframe = 'upcoming' | 'week' | 'month' | 'all' | 'past';

interface CalendarFiltersState {
  timeframe: CalendarTimeframe;
  memberId?: string;
  showPrivateOnly: boolean;
  showRemindersOnly: boolean;
  setTimeframe: (timeframe: CalendarTimeframe) => void;
  setMemberId: (memberId?: string) => void;
  togglePrivateOnly: () => void;
  toggleRemindersOnly: () => void;
  reset: () => void;
}

const DEFAULT_STATE: Pick<
  CalendarFiltersState,
  'timeframe' | 'memberId' | 'showPrivateOnly' | 'showRemindersOnly'
> = {
  timeframe: 'upcoming',
  memberId: undefined,
  showPrivateOnly: false,
  showRemindersOnly: false,
};

export const useCalendarFiltersStore = create<CalendarFiltersState>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,
      setTimeframe: (timeframe) => set({ timeframe }),
      setMemberId: (memberId) => set({ memberId }),
      togglePrivateOnly: () => set((state) => ({ showPrivateOnly: !state.showPrivateOnly })),
      toggleRemindersOnly: () =>
        set((state) => ({ showRemindersOnly: !state.showRemindersOnly })),
      reset: () => set(DEFAULT_STATE),
    }),
    {
      name: 'calendar-filters-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        timeframe: state.timeframe,
        memberId: state.memberId,
        showPrivateOnly: state.showPrivateOnly,
        showRemindersOnly: state.showRemindersOnly,
      }),
    }
  )
);
