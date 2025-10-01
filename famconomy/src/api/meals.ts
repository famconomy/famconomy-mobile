import apiClient from './apiClient';
import { Meal, MealPlanWeek, MealSlot } from '../types';

export interface MealInput {
  FamilyID: number;
  Title: string;
  Description?: string;
  Instructions?: string;
  Status?: string;
  IsFavorite?: boolean;
  DefaultServings?: number;
  CreatedByUserID: string;
  Ingredients?: Array<{
    Name: string;
    Quantity?: number;
    Unit?: string;
    Notes?: string;
    IsPantryItem?: boolean;
  }>;
  Tags?: string[];
}

export interface MealPlanInput {
  WeekStart: string;
  DayOfWeek: number;
  MealSlot: MealSlot;
  MealID: number;
  Servings?: number;
  Notes?: string;
  AddedByUserID: string;
}

export const getMeals = async (familyId: number | string): Promise<Meal[]> => {
  const response = await apiClient.get(`/meals/${familyId}/meals`);
  return response.data;
};

export const createMeal = async (payload: MealInput): Promise<Meal> => {
  const response = await apiClient.post(`/meals/${payload.FamilyID}/meals`, payload);
  return response.data;
};

export const updateMeal = async (mealId: number | string, payload: Partial<MealInput>): Promise<Meal> => {
  const response = await apiClient.put(`/meals/meals/${mealId}`, payload);
  return response.data;
};

export const getMealPlan = async (familyId: number | string, params?: { weekStart?: string }): Promise<MealPlanWeek[]> => {
  const response = await apiClient.get(`/meals/${familyId}/plan`, { params });
  return response.data;
};

export const upsertMealPlanEntry = async (familyId: number | string, payload: MealPlanInput) => {
  const response = await apiClient.post(`/meals/${familyId}/plan`, payload);
  return response.data;
};

export const deleteMealPlanEntry = async (entryId: number | string) => {
  await apiClient.delete(`/meals/plan/entry/${entryId}`);
};
