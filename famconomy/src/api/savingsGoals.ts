
import apiClient from './apiClient';
import { SavingsGoal } from '../types/budget';

export const getSavingsGoals = async (familyId: string): Promise<SavingsGoal[]> => {
  const response = await apiClient.get(`/savings-goals/family/${familyId}`);
  return response.data;
};

export const createSavingsGoal = async (goalData: Partial<SavingsGoal>): Promise<SavingsGoal> => {
  const response = await apiClient.post('/savings-goals', goalData);
  return response.data;
};

export const updateSavingsGoal = async (id: string, goalData: Partial<SavingsGoal>): Promise<void> => {
  await apiClient.put(`/savings-goals/${id}`, goalData);
};

export const deleteSavingsGoal = async (id: string): Promise<void> => {
  await apiClient.delete(`/savings-goals/${id}`);
};
