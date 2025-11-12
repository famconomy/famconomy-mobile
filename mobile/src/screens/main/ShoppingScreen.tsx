import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  SectionList,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAppStore } from '../../store/appStore';
import { useAuth } from '../../hooks/useAuth';
import { useFamily } from '../../hooks/useFamily';
import { useShopping } from '../../hooks/useShopping';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Toast } from '../../components/ui/Toast';
import { ShoppingListCard } from '../../components/shopping/ShoppingListCard';
import { ShoppingItemRow } from '../../components/shopping/ShoppingItemRow';
import { ShoppingListModal } from '../../components/shopping/ShoppingListModal';
import { ShoppingItemModal } from '../../components/shopping/ShoppingItemModal';
import { spacing, lightTheme, darkTheme } from '../../theme';

const ShoppingScreen: React.FC = () => {
  const { theme } = useAppStore();
  const { user } = useAuth();
  const { family } = useFamily();
  const [listModalVisible, setListModalVisible] = useState(false);
  const [itemModalVisible, setItemModalVisible] = useState(false);
  const [editingList, setEditingList] = useState<number | null>(null);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);
  const isDark = theme === 'dark';
  const themeColors = isDark ? darkTheme : lightTheme;

  const {
    lists,
    selectedList,
    selectedListId,
    setSelectedListId,
    categories,
    listsLoading,
    itemsLoading,
    isRefreshing,
    error,
    refresh,
    createList,
    renameList,
    archiveList,
    deleteList,
    addItem,
    updateItem,
    toggleItem,
    deleteItem,
  } = useShopping({ familyId: family?.id });

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'info') => setToast({ message, type }),
    []
  );

  const handleSelectList = useCallback((listId: number) => {
    setSelectedListId(listId);
  }, [setSelectedListId]);

  const handleCreateList = useCallback(
    async ({ name, colorHex }: { name: string; colorHex?: string }) => {
      await createList(name, { colorHex, createdByUserId: user?.id });
      showToast('List created', 'success');
    },
    [createList, showToast, user?.id]
  );

  const handleRenameList = useCallback(async (listId: number, payload: { name: string; colorHex?: string }) => {
    await renameList(listId, payload);
    showToast('List updated', 'success');
  }, [renameList, showToast]);

  const handleArchiveList = useCallback(async (listId: number) => {
    await archiveList(listId);
    showToast('List archived', 'info');
  }, [archiveList, showToast]);

  const handleDeleteList = useCallback(async (listId: number) => {
    await deleteList(listId);
    showToast('List deleted', 'info');
  }, [deleteList, showToast]);

  const handleAddItem = useCallback(
    async (data: { name: string; quantity?: number | string; unit?: string; category?: string; notes?: string }) => {
      await addItem(data);
      showToast('Item added', 'success');
    },
    [addItem, showToast]
  );

  const handleEditItem = useCallback(async (itemId: number, data: Partial<{ name: string; quantity?: number | string; unit?: string; category?: string; notes?: string }>) => {
    await updateItem(itemId, data);
    showToast('Item updated', 'success');
  }, [showToast, updateItem]);

  const handleToggleItem = useCallback(async (item: any) => {
    try {
      await toggleItem(item);
    } catch (err) {
      showToast('Failed to update item', 'error');
    }
  }, [showToast, toggleItem]);

  const handleDeleteItem = useCallback(async (itemId: number) => {
    await deleteItem(itemId);
    showToast('Item removed', 'info');
  }, [deleteItem, showToast]);

  const selectedEditingItem = useMemo(
    () => selectedList?.items.find((item) => item.itemId === editingItemId) ?? null,
    [editingItemId, selectedList]
  );

  if (listsLoading && !lists.length) {
    return <LoadingSpinner isDark={isDark} message="Loading shopping lists…" />;
  }

  if (!family?.id) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <Card isDark={isDark} style={styles.emptyState}>
          <Text variant="h4" isDark={isDark} weight="semibold">
            Join or create a family to manage shopping lists
          </Text>
        </Card>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}> 
      {toast && (
        <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />
      )}

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text variant="h2" isDark={isDark} weight="bold">
            Shopping Lists
          </Text>
          <Button
            title="New List"
            size="small"
            onPress={() => {
              setEditingList(null);
              setListModalVisible(true);
            }}
            isDark={isDark}
          />
        </View>
        {error && (
          <Card isDark={isDark} style={styles.errorCard}>
            <Text variant="body" color="textSecondary" isDark={isDark}>
              {error.message}
            </Text>
          </Card>
        )}
      </View>

      {lists.length === 0 ? (
        <Card isDark={isDark} style={styles.emptyState}>
          <Text variant="h4" isDark={isDark} weight="semibold">
            No shopping lists yet
          </Text>
          <Text variant="body" color="textSecondary" isDark={isDark} style={styles.emptyText}>
            Tap “New List” to organize groceries and errands.
          </Text>
        </Card>
      ) : (
        <FlatList
          data={lists}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.shoppingListId.toString()}
          contentContainerStyle={styles.listCarousel}
          renderItem={({ item }) => (
            <ShoppingListCard
              list={item}
              isDark={isDark}
              selected={item.shoppingListId === selectedListId}
              onSelect={(list) => handleSelectList(list.shoppingListId)}
              onEdit={() => {
                setEditingList(item.shoppingListId);
                setListModalVisible(true);
              }}
              onArchive={() => handleArchiveList(item.shoppingListId)}
              onDelete={() =>
                Alert.alert('Delete list', 'Are you sure?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => handleDeleteList(item.shoppingListId) },
                ])
              }
            />
          )}
        />
      )}

      {selectedList && (
        <SectionList
          sections={categories.map((group) => ({ title: group.category, data: group.items }))}
          keyExtractor={(item) => item.itemId.toString()}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.itemsContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={themeColors.primary} />
          }
          renderSectionHeader={({ section }) => (
            <Text variant="label" color="textSecondary" isDark={isDark} style={styles.sectionTitle}>
              {section.title.charAt(0).toUpperCase() + section.title.slice(1)}
            </Text>
          )}
          renderItem={({ item }) => (
            <ShoppingItemRow
              item={item}
              isDark={isDark}
              onToggle={handleToggleItem}
              onEdit={(selected) => {
                setEditingItemId(selected.itemId);
                setItemModalVisible(true);
              }}
              onDelete={(selected) =>
                Alert.alert('Remove item', 'Remove this item from the list?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove', style: 'destructive', onPress: () => handleDeleteItem(selected.itemId) },
                ])
              }
            />
          )}
          ListEmptyComponent={
            itemsLoading ? (
              <LoadingSpinner isDark={isDark} message="Loading items…" />
            ) : (
              <Card isDark={isDark} style={styles.emptyItems}>
                <Text variant="body" color="textSecondary" isDark={isDark}>
                  This list is empty. Add your first item to get started.
                </Text>
              </Card>
            )
          }
        />
      )}

      {selectedList && (
        <View style={styles.actionsBar}>
          <Button
            title="Add Item"
            onPress={() => {
              setEditingItemId(null);
              setItemModalVisible(true);
            }}
            isDark={isDark}
            variant="primary"
          />
        </View>
      )}

      <ShoppingListModal
        visible={listModalVisible}
        isDark={isDark}
        initialName={editingList ? lists.find((list) => list.shoppingListId === editingList)?.name : ''}
        initialColor={editingList ? lists.find((list) => list.shoppingListId === editingList)?.colorHex : undefined}
        onClose={() => {
          setListModalVisible(false);
          setEditingList(null);
        }}
        onSubmit={async ({ name, colorHex }) => {
          if (editingList) {
            await handleRenameList(editingList, { name, colorHex });
          } else {
            await handleCreateList({ name, colorHex });
          }
        }}
      />

      <ShoppingItemModal
        visible={itemModalVisible}
        isDark={isDark}
        initialItem={selectedEditingItem}
        onClose={() => {
          setItemModalVisible(false);
          setEditingItemId(null);
        }}
        onSubmit={async (payload) => {
          if (editingItemId) {
            await handleEditItem(editingItemId, payload);
          } else {
            await handleAddItem(payload);
          }
        }}
        onDelete={
          editingItemId
            ? async () => {
                await handleDeleteItem(editingItemId);
              }
            : undefined
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listCarousel: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  itemsContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[10],
  },
  sectionTitle: {
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  emptyState: {
    marginHorizontal: spacing[4],
    marginTop: spacing[6],
    padding: spacing[6],
    alignItems: 'center',
  },
  emptyText: {
    marginTop: spacing[2],
    textAlign: 'center',
  },
  emptyItems: {
    padding: spacing[5],
    marginTop: spacing[4],
    alignItems: 'center',
  },
  actionsBar: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  errorCard: {
    marginTop: spacing[3],
    padding: spacing[3],
  },
});

export default ShoppingScreen;
