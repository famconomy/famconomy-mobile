import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, FlatList } from 'react-native';
import { useAppStore } from '../../store/appStore';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { spacing, lightTheme, darkTheme } from '../../theme';
import type { Budget } from '../../types';

const BudgetScreen: React.FC = () => {
  const { theme } = useAppStore();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isDark = theme === 'dark';
  const themeColors = isDark ? darkTheme : lightTheme;

  useEffect(() => {
    setTimeout(() => {
      setBudgets([]);
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
          Budget
        </Text>
      </View>

      <Card isDark={isDark} style={styles.summaryCard}>
        <Text variant="h4" isDark={isDark}>
          Total Budget
        </Text>
        <Text variant="h2" color="primary" isDark={isDark} style={styles.amount}>
          $0.00
        </Text>
        <Text variant="caption" color="textSecondary" isDark={isDark}>
          This month
        </Text>
      </Card>

      {budgets.length === 0 ? (
        <Card isDark={isDark} style={styles.emptyState}>
          <Text variant="h4" isDark={isDark}>
            No budgets yet
          </Text>
          <Text variant="body" color="textSecondary" isDark={isDark} style={styles.emptyText}>
            Create a budget to track your expenses
          </Text>
        </Card>
      ) : (
        <FlatList
          data={budgets}
          renderItem={({ item }) => (
            <Card isDark={isDark} style={styles.budgetCard}>
              <Text variant="h4" isDark={isDark}>
                {item.name}
              </Text>
              <Text variant="caption" color="textSecondary" isDark={isDark}>
                ${item.spentAmount} / ${item.amount}
              </Text>
            </Card>
          )}
          keyExtractor={(item) => item.budgetId.toString()}
          scrollEnabled={false}
        />
      )}

      <View style={styles.buttonContainer}>
        <Button title="Add Budget" onPress={() => {}} isDark={isDark} variant="primary" />
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
  summaryCard: {
    marginBottom: spacing[4],
    alignItems: 'center',
  },
  amount: {
    marginVertical: spacing[2],
  },
  budgetCard: {
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

export default BudgetScreen;
