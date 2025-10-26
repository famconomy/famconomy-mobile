import { ScreenTime } from '../types';
import { apiClient } from './apiClient';

export const screenTimeClient = {
  async getAll(familyId: string, userId?: string): Promise<ScreenTime[]> {
    const params = userId ? `?userId=${userId}` : '';
    return apiClient.get(`/families/${familyId}/screentime${params}`);
  },

  async getByUser(userId: string): Promise<ScreenTime[]> {
    return apiClient.get(`/users/${userId}/screentime`);
  },

  async create(data: Partial<ScreenTime>): Promise<ScreenTime> {
    return apiClient.post('/screentime', data);
  },

  async delete(screenTimeId: string): Promise<void> {
    return apiClient.delete(`/screentime/${screenTimeId}`);
  },
};
