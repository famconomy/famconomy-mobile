import { useEffect, useState, useCallback } from 'react';
import * as dashboardApi from '../api/dashboard';
import type { DashboardResponse, ActivityItem, LeaderboardEntry } from '../api/dashboard';

interface UseDashboardOptions {
  familyId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
}

interface UseDashboardReturn {
  data: DashboardResponse | null;
  stats: Omit<DashboardResponse, 'leaderboard' | 'recentActivity'> | null;
  activity: ActivityItem[];
  leaderboard: LeaderboardEntry[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  refreshStats: () => Promise<void>;
}

/**
 * Hook for fetching and managing dashboard data
 * Includes auto-refresh capability and error handling
 */
export const useDashboard = (options: UseDashboardOptions = {}): UseDashboardReturn => {
  const {
    familyId,
    autoRefresh = true,
    refreshInterval = 60000, // 1 minute default
  } = options;

  const [data, setData] = useState<DashboardResponse | null>(null);
  const [stats, setStats] = useState<Omit<DashboardResponse, 'leaderboard' | 'recentActivity'> | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!familyId) {
      console.log('useDashboard: No familyId provided, using mock data');
      // Provide mock data for demo purposes
      setData({
        familyName: 'Demo Family',
        familyMantra: 'Together we grow stronger! 💪',
        upcomingEvents: 2,
        pendingTasks: 5,
        unreadMessages: 3,
        activeMembers: 4,
        familyValues: ['Honesty', 'Teamwork', 'Gratitude'],
        recentActivity: [],
        leaderboard: [],
      });
      setActivity([]);
      setLeaderboard([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const dashboardData = await dashboardApi.getDashboardData(familyId);
      setData(dashboardData);
      setActivity(dashboardData.recentActivity || []);
      setLeaderboard(dashboardData.leaderboard || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.warn('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [familyId]);

  const refreshStats = useCallback(async () => {
    if (!familyId) return;

    try {
      setIsRefreshing(true);
      const statsData = await dashboardApi.getDashboardStats(familyId);
      setStats(statsData);
    } catch (err) {
      console.warn('Failed to refresh dashboard stats:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [familyId]);

  const refetch = useCallback(async () => {
    await fetchData();
    await refreshStats();
  }, [fetchData, refreshStats]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh || !familyId) return;

    const interval = setInterval(() => {
      refreshStats();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, familyId, refreshInterval, refreshStats]);

  return {
    data,
    stats,
    activity,
    leaderboard,
    isLoading,
    isRefreshing,
    error,
    refetch,
    refreshStats,
  };
};
