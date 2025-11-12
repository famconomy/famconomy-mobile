import { useEffect, useState, useCallback, useRef } from 'react';
import * as dashboardApi from '../api/dashboard';
import type {
  DashboardResponse,
  ActivityItem,
  LeaderboardEntry,
  DashboardEventPreview,
  DashboardTaskPreview,
  DashboardMessagePreview,
  DashboardMemberPreview,
} from '../api/dashboard';

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
  eventPreviews: DashboardEventPreview[];
  taskPreviews: DashboardTaskPreview[];
  messagePreviews: DashboardMessagePreview[];
  memberPreviews: DashboardMemberPreview[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
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
  const [eventPreviews, setEventPreviews] = useState<DashboardEventPreview[]>([]);
  const [taskPreviews, setTaskPreviews] = useState<DashboardTaskPreview[]>([]);
  const [messagePreviews, setMessagePreviews] = useState<DashboardMessagePreview[]>([]);
  const [memberPreviews, setMemberPreviews] = useState<DashboardMemberPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const hasLoadedRef = useRef(false);

  const resetStateForNoFamily = () => {
    setData(null);
    setStats(null);
    setActivity([]);
    setLeaderboard([]);
    setIsLoading(false);
    setIsRefreshing(false);
    setError(null);
    setEventPreviews([]);
    setTaskPreviews([]);
    setMessagePreviews([]);
    setMemberPreviews([]);
    hasLoadedRef.current = false;
  };

  const applyDashboardData = (dashboardData: DashboardResponse | null) => {
    if (!dashboardData) {
      setData(null);
      setStats(null);
      setActivity([]);
      setLeaderboard([]);
      setEventPreviews([]);
      setTaskPreviews([]);
      setMessagePreviews([]);
      setMemberPreviews([]);
      return;
    }
    setData(dashboardData);
    setActivity(Array.isArray(dashboardData.recentActivity) ? dashboardData.recentActivity : []);
    setLeaderboard(Array.isArray(dashboardData.leaderboard) ? dashboardData.leaderboard : []);
    setEventPreviews(
      Array.isArray(dashboardData.upcomingEventPreviews)
        ? dashboardData.upcomingEventPreviews
        : [],
    );
    setTaskPreviews(
      Array.isArray(dashboardData.pendingTaskPreviews)
        ? dashboardData.pendingTaskPreviews
        : [],
    );
    setMessagePreviews(
      Array.isArray(dashboardData.unreadMessagePreviews)
        ? dashboardData.unreadMessagePreviews
        : [],
    );
    setMemberPreviews(
      Array.isArray(dashboardData.activeMemberPreviews)
        ? dashboardData.activeMemberPreviews
        : [],
    );
    setStats({
      upcomingEvents: dashboardData.upcomingEvents,
      pendingTasks: dashboardData.pendingTasks,
      unreadMessages: dashboardData.unreadMessages,
      activeMembers: dashboardData.activeMembers,
      familyName: dashboardData.familyName,
      familyMantra: dashboardData.familyMantra,
      familyValues: dashboardData.familyValues,
      upcomingEventPreviews: dashboardData.upcomingEventPreviews ?? [],
      pendingTaskPreviews: dashboardData.pendingTaskPreviews ?? [],
      unreadMessagePreviews: dashboardData.unreadMessagePreviews ?? [],
      activeMemberPreviews: dashboardData.activeMemberPreviews ?? [],
    });
  };

  const fetchData = useCallback(async (opts?: { source?: 'initial' | 'refresh' | 'interval' }) => {
    if (!familyId) {
      // No active family yet; expose empty state to UI
      resetStateForNoFamily();
      return;
    }

    const source = opts?.source ?? 'initial';
    const shouldShowInitialLoading = !hasLoadedRef.current && source === 'initial';

    try {
      if (shouldShowInitialLoading) {
        setIsLoading(true);
      }
      if (source === 'refresh') {
        setIsRefreshing(true);
      }

      setError(null);
      const dashboardData = await dashboardApi.getDashboardData(familyId);
      applyDashboardData(dashboardData);
      hasLoadedRef.current = true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.warn('Failed to fetch dashboard data:', error);
      if (!hasLoadedRef.current) {
        applyDashboardData(null);
      }
    } finally {
      setIsRefreshing(false);
      if (shouldShowInitialLoading) {
        setIsLoading(false);
      }
    }
  }, [familyId]);

  const refetch = useCallback(async () => {
    await fetchData({ source: 'refresh' });
  }, [fetchData]);

  // Initial fetch
  useEffect(() => {
    fetchData({ source: 'initial' });
    return () => {
      hasLoadedRef.current = false;
    };
  }, [fetchData]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh || !familyId) return;

    const interval = setInterval(() => {
      fetchData({ source: 'interval' }).catch(() => {
        // interval fetch errors already handled in hook state
      });
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, familyId, refreshInterval, fetchData]);

  return {
    data,
    stats,
    activity,
    leaderboard,
    eventPreviews,
    taskPreviews,
    messagePreviews,
    memberPreviews,
    isLoading,
    isRefreshing,
    error,
    refetch,
  };
};
