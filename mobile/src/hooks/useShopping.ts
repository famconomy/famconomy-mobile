import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ShoppingList, ShoppingItem } from '../types';
import {
  getShoppingLists,
  createShoppingList,
  updateShoppingList,
  deleteShoppingList,
  archiveShoppingList,
  getShoppingItems,
  createShoppingItem,
  updateShoppingItem,
  deleteShoppingItem,
} from '../api/shopping';

interface UseShoppingOptions {
  familyId?: string;
}

interface ShoppingCategoryGroup {
  category: string;
  items: ShoppingItem[];
}

export const useShopping = ({ familyId }: UseShoppingOptions) => {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [listsLoading, setListsLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const selectedList = useMemo(
    () => lists.find((list) => list.shoppingListId === selectedListId) ?? null,
    [lists, selectedListId]
  );

  const loadLists = useCallback(
    async (opts: { preserveSelection?: boolean } = {}) => {
      if (!familyId) {
        setLists([]);
        setSelectedListId(null);
        setListsLoading(false);
        return;
      }
      try {
        setListsLoading(true);
        const data = await getShoppingLists(familyId, 'active');
        setLists(data);
        if (!opts.preserveSelection) {
          setSelectedListId(data[0]?.shoppingListId ?? null);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load shopping lists'));
      } finally {
        setListsLoading(false);
      }
    },
    [familyId]
  );

  const loadItems = useCallback(
    async (listId: number | null) => {
      if (!listId) {
        setItems([]);
        return;
      }
      try {
        setItemsLoading(true);
        const data = await getShoppingItems(listId);
        setItems(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load items'));
      } finally {
        setItemsLoading(false);
      }
    },
    []
  );

  const refresh = useCallback(async () => {
    if (!familyId) return;
    setIsRefreshing(true);
    try {
      await loadLists({ preserveSelection: true });
      if (selectedListId) {
        await loadItems(selectedListId);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [familyId, loadItems, loadLists, selectedListId]);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  useEffect(() => {
    loadItems(selectedListId);
  }, [loadItems, selectedListId]);

  const handleCreateList = useCallback(
    async (name: string, options?: { colorHex?: string; createdByUserId?: string }) => {
      if (!familyId) throw new Error('Family ID is required to create a list');
      const list = await createShoppingList({
        familyId,
        name,
        colorHex: options?.colorHex,
        createdByUserId: options?.createdByUserId,
      });
      setLists((prev) => [list, ...prev]);
      setSelectedListId(list.shoppingListId);
      setItems(list.items);
      return list;
    },
    [familyId]
  );

  const handleRenameList = useCallback(async (listId: number, data: { name?: string; colorHex?: string }) => {
    const updated = await updateShoppingList(listId, data);
    setLists((prev) =>
      prev.map((list) => (list.shoppingListId === listId ? { ...list, ...updated } : list))
    );
    if (selectedListId === listId) {
      setSelectedListId(updated.shoppingListId);
    }
  }, [selectedListId]);

  const handleArchiveList = useCallback(async (listId: number) => {
    await archiveShoppingList(listId);
    setLists((prev) => {
      const updated = prev.filter((list) => list.shoppingListId !== listId);
      if (selectedListId === listId) {
        setItems([]);
        setSelectedListId(updated[0]?.shoppingListId ?? null);
      }
      return updated;
    });
  }, [selectedListId]);

  const handleDeleteList = useCallback(async (listId: number) => {
    await deleteShoppingList(listId);
    setLists((prev) => {
      const updated = prev.filter((list) => list.shoppingListId !== listId);
      if (selectedListId === listId) {
        setItems([]);
        setSelectedListId(updated[0]?.shoppingListId ?? null);
      }
      return updated;
    });
  }, [selectedListId]);

  const handleAddItem = useCallback(
    async (payload: {
      name: string;
      quantity?: number | string;
      unit?: string;
      category?: string;
      notes?: string;
    }) => {
      if (!selectedListId) throw new Error('No shopping list selected');
      const item = await createShoppingItem({
        shoppingListId: selectedListId,
        ...payload,
      });
      setItems((prev) => [...prev, item]);
      setLists((prev) =>
        prev.map((list) =>
          list.shoppingListId === selectedListId
            ? { ...list, items: [...list.items, item] }
            : list
        )
      );
      return item;
    },
    [selectedListId]
  );

  const handleUpdateItem = useCallback(async (itemId: number, data: Partial<ShoppingItem>) => {
    const updated = await updateShoppingItem(itemId, {
      name: data.name,
      quantity: data.quantity,
      unit: data.unit,
      category: data.category,
      notes: data.notes,
      completed: data.completed,
    });
    setItems((prev) => prev.map((item) => (item.itemId === itemId ? updated : item)));
    setLists((prev) =>
      prev.map((list) =>
        list.shoppingListId === selectedListId
          ? {
              ...list,
              items: list.items.map((item) => (item.itemId === itemId ? updated : item)),
            }
          : list
      )
    );
    return updated;
  }, [selectedListId]);

  const handleToggleItem = useCallback(
    async (item: ShoppingItem) => {
      setItems((prev) =>
        prev.map((current) =>
          current.itemId === item.itemId ? { ...current, completed: !current.completed } : current
        )
      );
      setLists((prev) =>
        prev.map((list) =>
          list.shoppingListId === selectedListId
            ? {
                ...list,
                items: list.items.map((current) =>
                  current.itemId === item.itemId
                    ? { ...current, completed: !current.completed }
                    : current
                ),
              }
            : list
        )
      );
      try {
        await updateShoppingItem(item.itemId, { completed: !item.completed });
      } catch (err) {
        setItems((prev) =>
          prev.map((current) =>
            current.itemId === item.itemId ? { ...current, completed: item.completed } : current
          )
        );
        setLists((prev) =>
          prev.map((list) =>
            list.shoppingListId === selectedListId
              ? {
                  ...list,
                  items: list.items.map((current) =>
                    current.itemId === item.itemId
                      ? { ...current, completed: item.completed }
                      : current
                  ),
                }
              : list
          )
        );
        throw err;
      }
    },
    [selectedListId]
  );

  const handleDeleteItem = useCallback(async (itemId: number) => {
    await deleteShoppingItem(itemId);
    setItems((prev) => prev.filter((item) => item.itemId !== itemId));
    setLists((prev) =>
      prev.map((list) =>
        list.shoppingListId === selectedListId
          ? { ...list, items: list.items.filter((item) => item.itemId !== itemId) }
          : list
      )
    );
  }, [selectedListId]);

  const categories: ShoppingCategoryGroup[] = useMemo(() => {
    if (!items.length) return [];
    const byCategory = new Map<string, ShoppingItem[]>();
    items.forEach((item) => {
      const key = (item.category ?? 'uncategorized').toLowerCase();
      const existing = byCategory.get(key) ?? [];
      byCategory.set(key, [...existing, item]);
    });
    return Array.from(byCategory.entries())
      .map(([category, catItems]) => ({
        category,
        items: catItems.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
      }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }, [items]);

  return {
    lists,
    selectedList,
    selectedListId,
    setSelectedListId,
    items,
    categories,
    listsLoading,
    itemsLoading,
    isRefreshing,
    error,
    refresh,
    loadLists,
    loadItems,
    createList: handleCreateList,
    renameList: handleRenameList,
    archiveList: handleArchiveList,
    deleteList: handleDeleteList,
    addItem: handleAddItem,
    updateItem: handleUpdateItem,
    toggleItem: handleToggleItem,
    deleteItem: handleDeleteItem,
  };
};
