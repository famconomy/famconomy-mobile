import apiClient from './apiClient';
import { Recipe, RecipeInput, RecipeMemory } from '../types';

export const getRecipes = async (
  familyId: number,
  params?: { search?: string; favoritesOnly?: boolean }
): Promise<Recipe[]> => {
  const response = await apiClient.get(`/recipes/${familyId}/recipes`, {
    params,
  });
  return response.data;
};

export const getRecipe = async (familyId: number, recipeId: number): Promise<Recipe> => {
  const response = await apiClient.get(`/recipes/${familyId}/recipes/${recipeId}`);
  return response.data;
};

export const createRecipe = async (familyId: number, payload: RecipeInput): Promise<Recipe> => {
  const response = await apiClient.post(`/recipes/${familyId}/recipes`, payload);
  return response.data;
};

export const updateRecipe = async (
  familyId: number,
  recipeId: number,
  payload: RecipeInput
): Promise<Recipe> => {
  const response = await apiClient.put(`/recipes/${familyId}/recipes/${recipeId}`, payload);
  return response.data;
};

export const deleteRecipe = async (familyId: number, recipeId: number): Promise<void> => {
  await apiClient.delete(`/recipes/${familyId}/recipes/${recipeId}`);
};

export const importRecipe = async (
  familyId: number,
  url: string
): Promise<Recipe> => {
  const response = await apiClient.post(`/recipes/${familyId}/recipes/import`, { url });
  return response.data;
};

export const importRecipeFromScan = async (
  familyId: number,
  file: File
): Promise<Recipe> => {
  const formData = new FormData();
  formData.append('scan', file);

  const response = await apiClient.post(`/recipes/${familyId}/recipes/import/scan`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const shareRecipe = async (
  familyId: number,
  recipeId: number,
  visibility: 'FAMILY' | 'LINK'
): Promise<{ shareToken?: string | null; visibility: 'FAMILY' | 'LINK' }> => {
  const response = await apiClient.post(`/recipes/${familyId}/recipes/${recipeId}/share`, { visibility });
  return response.data;
};

export const createRecipeMemory = async (
  familyId: number,
  recipeId: number,
  payload: { Message: string; StoryTitle?: string }
): Promise<RecipeMemory> => {
  const response = await apiClient.post(`/recipes/${familyId}/recipes/${recipeId}/memories`, payload);
  return response.data;
};

export const getRecipeMemories = async (
  familyId: number,
  recipeId: number
): Promise<RecipeMemory[]> => {
  const response = await apiClient.get(`/recipes/${familyId}/recipes/${recipeId}/memories`);
  return response.data;
};

export const toggleRecipeFavorite = async (
  familyId: number,
  recipeId: number
): Promise<{ isFavorite: boolean }> => {
  const response = await apiClient.post(`/recipes/${familyId}/recipes/${recipeId}/favorite`);
  return response.data;
};

// Create quick meal plan entry from recipe
export const createMealFromRecipe = async (
  familyId: number,
  recipeId: number,
  payload?: { servings?: number; notes?: string }
) => {
  const response = await apiClient.post(`/recipes/${familyId}/recipes/${recipeId}/create-meal`, payload || {});
  return response.data;
};
