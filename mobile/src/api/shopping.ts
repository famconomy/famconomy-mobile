import apiClient from './apiClient';
import type { ShoppingList, ShoppingItem } from '../types';

interface RawShoppingList {
  ShoppingListID?: number;
  shoppingListId?: number;
  FamilyID?: number;
  familyId?: number;
  Name?: string;
  name?: string;
  CreatedByUserID?: string;
  createdByUserId?: string;
  CreatedAt?: string;
  createdAt?: string;
  UpdatedAt?: string;
  updatedAt?: string;
  ArchivedAt?: string | null;
  archivedAt?: string | null;
  ColorHex?: string | null;
  colorHex?: string | null;
  ShoppingItems?: RawShoppingItem[];
}

interface RawShoppingItem {
  ShoppingItemID?: number;
  shoppingItemId?: number;
  ShoppingListID?: number;
  shoppingListId?: number;
  Name?: string;
  name?: string;
  Quantity?: number | string;
  quantity?: number | string;
  Unit?: string | null;
  unit?: string | null;
  Category?: string | null;
  category?: string | null;
  Notes?: string | null;
  notes?: string | null;
  SortOrder?: number | null;
  sortOrder?: number | null;
  AddedByUserID?: string | null;
  addedByUserId?: string | null;
  AddedAt?: string | null;
  addedAt?: string | null;
  Completed?: boolean;
  completed?: boolean;
  CompletedAt?: string | null;
  completedAt?: string | null;
  CompletedByUserID?: string | null;
  completedByUserId?: string | null;
  UpdatedAt?: string | null;
  updatedAt?: string | null;
}

const mapShoppingItem = (raw: RawShoppingItem): ShoppingItem => ({
  itemId: raw.ShoppingItemID ?? raw.shoppingItemId ?? 0,
  shoppingListId: raw.ShoppingListID ?? raw.shoppingListId ?? undefined,
  name: raw.Name ?? raw.name ?? 'Item',
  quantity: raw.Quantity ?? raw.quantity ?? 1,
  unit: raw.Unit ?? raw.unit ?? undefined,
  category: raw.Category ?? raw.category ?? undefined,
  notes: raw.Notes ?? raw.notes ?? undefined,
  sortOrder: raw.SortOrder ?? raw.sortOrder ?? undefined,
  addedByUserId: raw.AddedByUserID ?? raw.addedByUserId ?? undefined,
  addedAt: raw.AddedAt ?? raw.addedAt ?? undefined,
  completed: Boolean(raw.Completed ?? raw.completed),
  completedAt: raw.CompletedAt ?? raw.completedAt ?? undefined,
  completedByUserId: raw.CompletedByUserID ?? raw.completedByUserId ?? undefined,
  updatedAt: raw.UpdatedAt ?? raw.updatedAt ?? undefined,
});

const mapShoppingList = (raw: RawShoppingList): ShoppingList => ({
  shoppingListId: raw.ShoppingListID ?? raw.shoppingListId ?? 0,
  familyId: raw.FamilyID ?? raw.familyId ?? 0,
  name: raw.Name ?? raw.name ?? 'Shopping List',
  createdByUserId: raw.CreatedByUserID ?? raw.createdByUserId ?? '',
  createdAt: raw.CreatedAt ?? raw.createdAt ?? new Date().toISOString(),
  updatedAt: raw.UpdatedAt ?? raw.updatedAt ?? undefined,
  archivedAt: raw.ArchivedAt ?? raw.archivedAt ?? null,
  colorHex: raw.ColorHex ?? raw.colorHex ?? undefined,
  items: Array.isArray(raw.ShoppingItems) ? raw.ShoppingItems.map(mapShoppingItem) : [],
});

export const getShoppingLists = async (
  familyId: string,
  filter?: 'all' | 'active' | 'archived'
): Promise<ShoppingList[]> => {
  const response = await apiClient.get(`/shopping-lists/family/${familyId}`, {
    params: { filter },
  });
  const raw = Array.isArray(response.data) ? (response.data as RawShoppingList[]) : [];
  return raw.map(mapShoppingList);
};

export const createShoppingList = async (payload: {
  familyId: string;
  name: string;
  createdByUserId?: string;
  colorHex?: string;
}): Promise<ShoppingList> => {
  const response = await apiClient.post('/shopping-lists', {
    FamilyID: Number(payload.familyId),
    Name: payload.name,
    CreatedByUserID: payload.createdByUserId,
    ColorHex: payload.colorHex,
  });
  return mapShoppingList(response.data as RawShoppingList);
};

export const updateShoppingList = async (
  shoppingListId: number,
  data: { name?: string; colorHex?: string }
): Promise<ShoppingList> => {
  const response = await apiClient.put(`/shopping-lists/${shoppingListId}`, {
    ...(data.name ? { Name: data.name } : {}),
    ...(data.colorHex ? { ColorHex: data.colorHex } : {}),
  });
  return mapShoppingList(response.data as RawShoppingList);
};

export const archiveShoppingList = async (shoppingListId: number): Promise<void> => {
  await apiClient.patch(`/shopping-lists/${shoppingListId}/archive`);
};

export const deleteShoppingList = async (shoppingListId: number): Promise<void> => {
  await apiClient.delete(`/shopping-lists/${shoppingListId}`);
};

export const getShoppingItems = async (shoppingListId: number): Promise<ShoppingItem[]> => {
  const response = await apiClient.get(`/shopping-items/list/${shoppingListId}`);
  const raw = Array.isArray(response.data) ? (response.data as RawShoppingItem[]) : [];
  return raw.map(mapShoppingItem);
};

export const createShoppingItem = async (payload: {
  shoppingListId: number;
  name: string;
  quantity?: number | string;
  unit?: string;
  category?: string;
  notes?: string;
}): Promise<ShoppingItem> => {
  const response = await apiClient.post('/shopping-items', {
    ShoppingListID: payload.shoppingListId,
    Name: payload.name,
    Quantity: payload.quantity,
    Unit: payload.unit,
    Category: payload.category,
    Notes: payload.notes,
  });
  return mapShoppingItem(response.data as RawShoppingItem);
};

export const updateShoppingItem = async (
  itemId: number,
  data: Partial<{
    name: string;
    quantity: number | string;
    unit: string;
    category: string;
    notes: string;
    completed: boolean;
  }>
): Promise<ShoppingItem> => {
  const response = await apiClient.put(`/shopping-items/${itemId}`, {
    ...(data.name !== undefined ? { Name: data.name } : {}),
    ...(data.quantity !== undefined ? { Quantity: data.quantity } : {}),
    ...(data.unit !== undefined ? { Unit: data.unit } : {}),
    ...(data.category !== undefined ? { Category: data.category } : {}),
    ...(data.notes !== undefined ? { Notes: data.notes } : {}),
    ...(data.completed !== undefined ? { Completed: data.completed } : {}),
  });
  return mapShoppingItem(response.data as RawShoppingItem);
};

export const deleteShoppingItem = async (itemId: number): Promise<void> => {
  await apiClient.delete(`/shopping-items/${itemId}`);
};
