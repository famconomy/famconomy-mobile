import apiClient from './apiClient';
import { Meal, MealSuggestion } from '../types';

export const getMealSuggestions = async (
  familyId: number, 
  options?: {
    mealSlots?: ('BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK')[];
    daysToSuggest?: number;
    forceRefresh?: boolean;
  }
): Promise<MealSuggestion[]> => {
  const params: any = { familyId };
  
  if (options?.mealSlots) {
    params.mealSlots = options.mealSlots.join(',');
  }
  if (options?.daysToSuggest) {
    params.daysToSuggest = options.daysToSuggest;
  }
  if (options?.forceRefresh) {
    params.forceRefresh = options.forceRefresh;
  }
  
  const response = await apiClient.get('/linz/meal-suggestions', { params });
  return response.data;
};

export const getMealNameSuggestions = async (familyId: number): Promise<string[]> => {
  const response = await apiClient.get('/linz/meal-name-suggestions', { params: { familyId } });
  return response.data;
};

export const generateMealWithIngredients = async (
  mealName: string,
  familyId: number,
  userId: string
): Promise<Meal> => {
  const response = await apiClient.post('/linz/generate-ingredients', {
    mealName,
    familyId,
    userId,
  });
  return response.data;
};

export interface LinZFact {
  id: number;
  familyId: number;
  userId: string | null;
  key: string;
  value: any;
  lastConfirmedAt: string;
  confidence?: number | null;
  source?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export const getLinzFacts = async (
  familyId: number,
  options?: { userId?: string | null; keys?: string[] }
): Promise<LinZFact[]> => {
  const params: Record<string, string> = { familyId: String(familyId) };

  if (options?.userId) {
    params.userId = options.userId;
  }

  if (options?.keys?.length) {
    params.keys = options.keys.join(',');
  }

  const response = await apiClient.get('/linz/facts', { params });
  return response.data?.facts ?? [];
};

export const upsertLinzFacts = async (
  facts: Array<{
    familyId: number;
    userId?: string | null;
    key: string;
    value: unknown;
    confidence?: number | null;
    source?: string | null;
  }>
): Promise<void> => {
  await apiClient.post('/linz/facts', { facts });
};
