import { Budget } from '../types/budget';
import apiClient from './apiClient';

export const getBudgets = async (familyId: string): Promise<Budget[]> => {
  const response = await apiClient.get(`/budget/family/${familyId}`);
  return response.data;
};

export const createBudget = async (budgetData: Partial<Budget>): Promise<Budget> => {
  const response = await apiClient.post('/budget', budgetData);
  return response.data;
};

export const updateBudget = async (id: string, budgetData: Partial<Budget>): Promise<void> => {
  await apiClient.put(`/budget/${id}`, budgetData);
};

export const deleteBudget = async (id: string): Promise<void> => {
  await apiClient.delete(`/budget/${id}`);
};