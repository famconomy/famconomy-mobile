import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Task } from '../types';

export type TaskListFilter = 'all' | 'mine' | 'pending' | 'in_progress' | 'completed';
export type TaskSortOption = 'priority' | 'dueDate' | 'reward';

interface TaskFiltersState {
  filter: TaskListFilter;
  sortBy: TaskSortOption;
  category: Task['category'] | 'all';
  assignedTo?: string;
  setFilter: (filter: TaskListFilter) => void;
  setSortBy: (sortBy: TaskSortOption) => void;
  setCategory: (category: Task['category'] | 'all') => void;
  setAssignedTo: (userId?: string) => void;
  reset: () => void;
}

const DEFAULT_STATE: Pick<TaskFiltersState, 'filter' | 'sortBy' | 'category'> = {
  filter: 'all',
  sortBy: 'priority',
  category: 'all',
};

export const useTaskFiltersStore = create<TaskFiltersState>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,
      assignedTo: undefined,
      setFilter: (filter) => set({ filter }),
      setSortBy: (sortBy) => set({ sortBy }),
      setCategory: (category) => set({ category }),
      setAssignedTo: (assignedTo) => set({ assignedTo }),
      reset: () => set({ ...DEFAULT_STATE, assignedTo: undefined }),
    }),
    {
      name: 'task-filters-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        filter: state.filter,
        sortBy: state.sortBy,
        category: state.category,
        assignedTo: state.assignedTo,
      }),
    }
  )
);
