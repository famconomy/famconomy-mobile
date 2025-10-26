import { apiClient } from './client';
import type { DashboardData } from '../types';

export interface DashboardResponse {
  upcomingEvents: number;
  pendingTasks: number;
  unreadMessages: number;
  activeMembers: number;
  familyName?: string;
  familyMantra?: string;
  familyValues: string[];
  leaderboard: LeaderboardEntry[];
  recentActivity: ActivityItem[];
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  points: number;
  rank: number;
  avatar?: string;
}

export interface ActivityItem {
  id: string;
  type: 'event' | 'task' | 'message' | 'member_joined';
  title: string;
  description?: string;
  actor?: string;
  timestamp: string;
  icon?: string;
}

/**
 * Fetch dashboard data for the current family
 */
export const getDashboardData = async (familyId: string): Promise<DashboardResponse> => {
  try {
    const response = await apiClient.get<DashboardResponse>(`/dashboard?familyId=${familyId}`);
    return response.data;
  } catch (error) {
    throw handleDashboardError(error);
  }
};

/**
 * Fetch only dashboard stats (lightweight)
 */
export const getDashboardStats = async (familyId: string): Promise<Omit<DashboardResponse, 'leaderboard' | 'recentActivity'>> => {
  try {
    const response = await apiClient.get(`/dashboard/stats?familyId=${familyId}`);
    return response.data;
  } catch (error) {
    throw handleDashboardError(error);
  }
};

/**
 * Fetch recent activity for dashboard
 */
export const getRecentActivity = async (familyId: string, limit: number = 10): Promise<ActivityItem[]> => {
  try {
    const response = await apiClient.get<ActivityItem[]>(`/dashboard/activity?familyId=${familyId}&limit=${limit}`);
    return response.data;
  } catch (error) {
    throw handleDashboardError(error);
  }
};

/**
 * Fetch leaderboard for family
 */
export const getLeaderboard = async (familyId: string, limit: number = 10): Promise<LeaderboardEntry[]> => {
  try {
    const response = await apiClient.get<LeaderboardEntry[]>(`/dashboard/leaderboard?familyId=${familyId}&limit=${limit}`);
    return response.data;
  } catch (error) {
    throw handleDashboardError(error);
  }
};

function handleDashboardError(error: any): Error {
  if (error.response?.data?.error) {
    return new Error(error.response.data.error);
  }
  if (error.response?.status === 404) {
    return new Error('Family not found');
  }
  if (error.message) {
    return new Error(error.message);
  }
  return new Error('Failed to load dashboard data');
}
