
import apiClient from './apiClient';
import { ShoppingList } from '../types';

export const getShoppingLists = async (familyId: string, filter?: 'all' | 'active' | 'archived'): Promise<ShoppingList[]> => {
  const response = await apiClient.get(`/shopping-lists/family/${familyId}`, {
    params: { filter }
  });
  return response.data;
};

export const createShoppingList = async (listData: Partial<ShoppingList>): Promise<ShoppingList> => {
  const response = await apiClient.post('/shopping-lists', listData);
  return response.data;
};

export const updateShoppingList = async (id: string, listData: Partial<ShoppingList>): Promise<void> => {
  await apiClient.put(`/shopping-lists/${id}`, listData);
};

export const deleteShoppingList = async (id: string): Promise<void> => {
  await apiClient.delete(`/shopping-lists/${id}`);
};

export const archiveShoppingList = async (id: string): Promise<void> => {
  await apiClient.patch(`/shopping-lists/${id}/archive`);
};

export const addMealPlanToShoppingList = async (
  familyId: number,
  weekStart: string,
  shoppingListId: number
): Promise<ShoppingList> => {
  const response = await apiClient.post('/shopping-lists/add-meal-plan', {
    familyId,
    weekStart,
    shoppingListId,
  });
  return response.data;
};
