
import apiClient from './apiClient';
import { ShoppingItem } from '../types';

export const getShoppingItems = async (listId: string): Promise<ShoppingItem[]> => {
  const response = await apiClient.get(`/shopping-items/list/${listId}`);
  return response.data;
};

export const createShoppingItem = async (itemData: Partial<ShoppingItem>): Promise<ShoppingItem> => {
  const response = await apiClient.post('/shopping-items', itemData);
  return response.data;
};

export const updateShoppingItem = async (id: string, itemData: Partial<ShoppingItem>): Promise<void> => {
  await apiClient.put(`/shopping-items/${id}`, itemData);
};

export const deleteShoppingItem = async (id: string): Promise<void> => {
  await apiClient.delete(`/shopping-items/${id}`);
};
