import apiClient from './apiClient';

export interface DashboardLeaderboardEntry {
  userId: string;
  fullName: string;
  completedTasks: number;
  totalPoints: number;
}

export interface DashboardData {
  upcomingEvents: number;
  pendingTasks: number;
  unreadMessages: number;
  activeMembers: number;
  familyName: string | null;
  familyMantra: string | null;
  familyValues: string[];
  leaderboard: DashboardLeaderboardEntry[];
}

export const getDashboardData = async (familyId: string): Promise<DashboardData> => {
  const response = await apiClient.get(`/dashboard/${familyId}`);
  return response.data;
};
