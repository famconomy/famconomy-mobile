import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, FlatList } from 'react-native';
import { useAppStore } from '../../store/appStore';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { spacing, lightTheme, darkTheme } from '../../theme';
import type { ShoppingList } from '../../types';

const ShoppingScreen: React.FC = () => {
  const { theme } = useAppStore();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isDark = theme === 'dark';
  const themeColors = isDark ? darkTheme : lightTheme;

  useEffect(() => {
    setTimeout(() => {
      setLists([]);
      setIsLoading(false);
    }, 500);
  }, []);

  if (isLoading) {
    return <LoadingSpinner isDark={isDark} />;
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text variant="h2" isDark={isDark}>
          Shopping Lists
        </Text>
      </View>

      {lists.length === 0 ? (
        <Card isDark={isDark} style={styles.emptyState}>
          <Text variant="h4" isDark={isDark}>
            No shopping lists
          </Text>
          <Text variant="body" color="textSecondary" isDark={isDark} style={styles.emptyText}>
            Create a shopping list to get started
          </Text>
        </Card>
      ) : (
        <FlatList
          data={lists}
          renderItem={({ item }) => (
            <Card isDark={isDark} style={styles.listCard}>
              <Text variant="h4" isDark={isDark}>
                {item.name}
              </Text>
              <Text variant="caption" color="textSecondary" isDark={isDark}>
                {item.items.length} items
              </Text>
            </Card>
          )}
          keyExtractor={(item) => item.shoppingListId.toString()}
          scrollEnabled={false}
        />
      )}

      <View style={styles.buttonContainer}>
        <Button title="Create List" onPress={() => {}} isDark={isDark} variant="primary" />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing[4],
  },
  header: {
    marginBottom: spacing[4],
  },
  listCard: {
    marginBottom: spacing[3],
  },
  emptyState: {
    padding: spacing[6],
    alignItems: 'center',
  },
  emptyText: {
    marginTop: spacing[2],
  },
  buttonContainer: {
    marginTop: spacing[4],
  },
});

export default ShoppingScreen;
