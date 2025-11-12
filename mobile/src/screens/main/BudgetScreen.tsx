import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { addMonths, subMonths, format } from 'date-fns';
import { PieChart } from 'react-native-chart-kit';
import { useAppStore } from '../../store/appStore';
import { useFamily } from '../../hooks/useFamily';
import { useAuth } from '../../hooks/useAuth';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { Toast } from '../../components/ui/Toast';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { spacing, lightTheme, darkTheme, borderRadius, fontSize } from '../../theme';
import {
  createTransaction,
  getBudgets,
  getTransactions,
} from '../../api/budget';
import type { Budget, BudgetCategoryKey, Transaction } from '../../types';

const CATEGORY_LABELS: Record<BudgetCategoryKey, string> = {
  housing: 'Housing',
  utilities: 'Utilities',
  groceries: 'Groceries',
  transportation: 'Transportation',
  healthcare: 'Healthcare',
  education: 'Education',
  entertainment: 'Entertainment',
  savings: 'Savings',
  other: 'Other',
};

const CATEGORY_COLORS: Record<BudgetCategoryKey, string> = {
  housing: '#4f46e5',
  utilities: '#f59e0b',
  groceries: '#22c55e',
  transportation: '#0ea5e9',
  healthcare: '#ef4444',
  education: '#a855f7',
  entertainment: '#ec4899',
  savings: '#14b8a6',
  other: '#94a3b8',
};

type TransactionFormState = {
  amount: string;
  description: string;
  category: BudgetCategoryKey;
  date: string;
};

type TransactionModalProps = {
  visible: boolean;
  isDark: boolean;
  onClose: () => void;
  onSubmit: (form: { amount: number; description: string; category: BudgetCategoryKey; date: string }) => Promise<void>;
  isSubmitting: boolean;
  defaultDate: string;
};

const TransactionModal: React.FC<TransactionModalProps> = ({
  visible,
  isDark,
  onClose,
  onSubmit,
  isSubmitting,
  defaultDate,
}) => {
  const theme = isDark ? darkTheme : lightTheme;
  const [form, setForm] = useState<TransactionFormState>({
    amount: '',
    description: '',
    category: 'groceries',
    date: defaultDate,
  });
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setForm({
        amount: '',
        description: '',
        category: 'groceries',
        date: defaultDate,
      });
      setFormError(null);
    }
  }, [defaultDate, visible]);

  const handleSubmit = async () => {
    const numericAmount = Number(form.amount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      setFormError('Enter a valid amount.');
      return;
    }
    if (!form.date) {
      setFormError('Select a date for the transaction.');
      return;
    }
    setFormError(null);
    await onSubmit({
      amount: numericAmount,
      description: form.description.trim(),
      category: form.category,
      date: form.date,
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
          <Text variant="h3" isDark={isDark} weight="bold" style={{ marginBottom: spacing[3] }}>
            Add Transaction
          </Text>

          <Input
            label="Amount"
            keyboardType="decimal-pad"
            value={form.amount}
            onChangeText={(value) => setForm((prev) => ({ ...prev, amount: value }))}
            placeholder="$0.00"
            isDark={isDark}
            containerStyle={styles.modalField}
          />

          <Input
            label="Description"
            value={form.description}
            onChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))}
            placeholder="What was this for?"
            isDark={isDark}
            containerStyle={styles.modalField}
          />

          <Input
            label="Date"
            value={form.date}
            onChangeText={(value) => setForm((prev) => ({ ...prev, date: value }))}
            placeholder="YYYY-MM-DD"
            isDark={isDark}
            containerStyle={styles.modalField}
          />

          <Text variant="label" isDark={isDark} style={styles.modalLabel}>
            Category
          </Text>
          <View style={styles.categoryGrid}>
            {(Object.keys(CATEGORY_LABELS) as BudgetCategoryKey[]).map((category) => {
              const active = form.category === category;
              return (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: active
                        ? CATEGORY_COLORS[category]
                        : theme.surfaceVariant,
                      borderColor: active ? CATEGORY_COLORS[category] : theme.border,
                    },
                  ]}
                  onPress={() => setForm((prev) => ({ ...prev, category }))}
                  activeOpacity={0.85}
                >
                  <Text
                    style={{
                      color: active ? '#fff' : theme.textSecondary,
                      fontSize: fontSize.sm,
                      fontWeight: '600',
                    }}
                  >
                    {CATEGORY_LABELS[category]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {formError && (
            <Text style={{ color: theme.error, marginTop: spacing[2], fontSize: fontSize.sm }}>
              {formError}
            </Text>
          )}

          <View style={styles.modalActions}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={onClose}
              isDark={isDark}
              disabled={isSubmitting}
            />
            <Button
              title={isSubmitting ? 'Saving…' : 'Save'}
              onPress={handleSubmit}
              isDark={isDark}
              disabled={isSubmitting}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const BudgetScreen: React.FC = () => {
  const { theme } = useAppStore();
  const { family } = useFamily();
  const { user } = useAuth();
  const familyId = family?.id;

  const isDark = theme === 'dark';
  const themeColors = isDark ? darkTheme : lightTheme;

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      }),
    [],
  );

  const chartWidth = useMemo(() => {
    const screenWidth = Dimensions.get('window').width;
    return Math.max(screenWidth - spacing[4] * 2, 240);
  }, []);

  const monthLabel = useMemo(() => format(selectedMonth, 'MMMM yyyy'), [selectedMonth]);

  const fetchData = useCallback(
    async (options: { refresh?: boolean } = {}) => {
      if (!familyId) {
        setBudgets([]);
        setTransactions([]);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      const startDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
      const endDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);

      if (options.refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError(null);

      try {
        const [budgetData, transactionData] = await Promise.all([
          getBudgets(familyId),
          getTransactions(familyId, {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          }),
        ]);

        setBudgets(budgetData);
        setTransactions(transactionData);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load budget data.';
        setError(message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [familyId, selectedMonth],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(() => {
    fetchData({ refresh: true });
  }, [fetchData]);

  const handleAddTransaction = useCallback(
    async (form: { amount: number; description: string; category: BudgetCategoryKey; date: string }) => {
      if (!familyId) {
        return;
      }

      setIsSubmitting(true);
      try {
        const normalizedDate = new Date(form.date);
        const payloadDate = Number.isNaN(normalizedDate.getTime())
          ? new Date().toISOString()
          : normalizedDate.toISOString();

        await createTransaction(familyId, {
          amount: form.amount,
          category: form.category,
          description: form.description,
          date: payloadDate,
          createdBy: user?.id,
        });
        setToast({ message: 'Transaction added', type: 'success' });
        setTransactionModalOpen(false);
        await fetchData({ refresh: true });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to save transaction.';
        setToast({ message, type: 'error' });
      } finally {
        setIsSubmitting(false);
      }
    },
    [familyId, fetchData, user?.id],
  );

  const totals = useMemo(() => {
    if (!budgets.length) {
      return { totalBudget: 0, totalSpent: 0, remaining: 0, percentage: 0 };
    }

    const totalBudget = budgets.reduce((sum, budget) => sum + (budget.amount || 0), 0);
    const totalSpent = budgets.reduce((sum, budget) => sum + (budget.spent || 0), 0);
    const remaining = Math.max(totalBudget - totalSpent, 0);
    const percentage = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;

    return { totalBudget, totalSpent, remaining, percentage };
  }, [budgets]);

  const pieData = useMemo(() => {
    const aggregate = new Map<BudgetCategoryKey, number>();
    budgets.forEach((budget) => {
      const key = budget.category ?? 'other';
      const current = aggregate.get(key) ?? 0;
      aggregate.set(key, current + (budget.spent || 0));
    });

    const entries = Array.from(aggregate.entries()).filter(([, value]) => value > 0);
    return entries.map(([category, value]) => ({
      name: CATEGORY_LABELS[category],
      population: value,
      color: CATEGORY_COLORS[category],
      legendFontColor: themeColors.textSecondary,
      legendFontSize: 12,
    }));
  }, [budgets, themeColors.textSecondary]);

  const nearLimitBudgets = useMemo(
    () =>
      budgets.filter(
        (budget) => budget.amount > 0 && budget.spent / budget.amount >= 0.9,
      ),
    [budgets],
  );

  const groupedTransactions = useMemo(() => {
    if (!transactions.length) return [];
    const groups = new Map<string, Transaction[]>();

    transactions.forEach((transaction) => {
      const dateKey = format(new Date(transaction.date), 'yyyy-MM-dd');
      const list = groups.get(dateKey) ?? [];
      list.push(transaction);
      groups.set(dateKey, list);
    });

    return Array.from(groups.entries())
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
      .map(([dateKey, list]) => ({
        dateKey,
        display: format(new Date(dateKey), 'MMM d, yyyy'),
        items: list.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        ),
      }));
  }, [transactions]);

  const formatCurrency = useCallback(
    (value: number) => currencyFormatter.format(value || 0),
    [currencyFormatter],
  );

  const handlePreviousMonth = useCallback(() => {
    setSelectedMonth((prev) => subMonths(prev, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setSelectedMonth((prev) => addMonths(prev, 1));
  }, []);

  if (isLoading) {
    return <LoadingSpinner isDark={isDark} message="Loading budgets…" />;
  }

  if (!familyId) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: themeColors.background }]}>
        <Card isDark={isDark} style={styles.emptyCard}>
          <Text variant="h3" isDark={isDark} weight="bold">
            Join a family to manage finances
          </Text>
          <Text variant="body" color="textSecondary" isDark={isDark} style={{ marginTop: spacing[2] }}>
            Budgets and transactions will appear here once you join or create a family.
          </Text>
        </Card>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={themeColors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {toast && (
        <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />
      )}

      <View style={styles.header}>
        <View>
          <Text variant="h2" isDark={isDark} weight="bold">
            Budget
          </Text>
          <Text variant="body" color="textSecondary" isDark={isDark}>
            Track how your family is spending this month.
          </Text>
        </View>
        <Button
          title="Add Transaction"
          onPress={() => setTransactionModalOpen(true)}
          size="small"
          isDark={isDark}
        />
      </View>

      <View style={styles.monthSwitcher}>
        <TouchableOpacity
          onPress={handlePreviousMonth}
          style={[styles.monthButton, { borderColor: themeColors.border }]}
        >
          <Text variant="h4" isDark={isDark}>
            ‹
          </Text>
        </TouchableOpacity>
        <Text variant="h4" isDark={isDark} weight="semibold">
          {monthLabel}
        </Text>
        <TouchableOpacity
          onPress={handleNextMonth}
          style={[styles.monthButton, { borderColor: themeColors.border }]}
        >
          <Text variant="h4" isDark={isDark}>
            ›
          </Text>
        </TouchableOpacity>
      </View>

      {error && (
        <Alert
          type="warning"
          title="Unable to load budgets"
          message={error}
          isDark={isDark}
          style={{ marginBottom: spacing[3] }}
        />
      )}

      {nearLimitBudgets.length > 0 && (
        <Alert
          type="warning"
          title="Budget Alert"
          message={`You're nearing the limit for ${nearLimitBudgets
            .map((budget) => budget.name)
            .join(', ')}.`}
          isDark={isDark}
          style={{ marginBottom: spacing[3] }}
        />
      )}

      <Card isDark={isDark} style={styles.summaryCard}>
        <Text variant="label" color="textSecondary" isDark={isDark}>
          This month
        </Text>
        <Text variant="h2" isDark={isDark} weight="bold">
          {formatCurrency(totals.totalSpent)}
        </Text>
        <Text variant="body" color="textSecondary" isDark={isDark} style={{ marginTop: spacing[1] }}>
          Spent of {formatCurrency(totals.totalBudget)}
        </Text>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${totals.percentage}%`,
                backgroundColor: themeColors.primary,
              },
            ]}
          />
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryColumn}>
            <Text variant="label" color="textSecondary" isDark={isDark}>
              Remaining
            </Text>
            <Text variant="h4" isDark={isDark} weight="semibold">
              {formatCurrency(totals.remaining)}
            </Text>
          </View>
          <View style={styles.summaryColumn}>
            <Text variant="label" color="textSecondary" isDark={isDark}>
              Budgets
            </Text>
            <Text variant="h4" isDark={isDark} weight="semibold">
              {budgets.length}
            </Text>
          </View>
        </View>
      </Card>

      <Card isDark={isDark} style={styles.chartCard}>
        <Text variant="h4" isDark={isDark} weight="bold" style={{ marginBottom: spacing[2] }}>
          Spending Breakdown
        </Text>
        {pieData.length > 0 ? (
          <PieChart
            data={pieData}
            width={chartWidth}
            height={220}
            accessor="population"
            backgroundColor="transparent"
            chartConfig={{
              backgroundColor: themeColors.surface,
              backgroundGradientFrom: themeColors.surface,
              backgroundGradientTo: themeColors.surface,
              color: () => themeColors.primary,
              labelColor: () => themeColors.textSecondary,
              decimalPlaces: 1,
            }}
            paddingLeft="16"
            hasLegend
            absolute
          />
        ) : (
          <View style={styles.emptyChart}>
            <Text variant="body" color="textSecondary" isDark={isDark}>
              No spending recorded for this month yet.
            </Text>
          </View>
        )}
      </Card>

      <View style={styles.sectionHeader}>
        <Text variant="h3" isDark={isDark} weight="bold">
          Budgets
        </Text>
      </View>

      {budgets.length === 0 ? (
        <Card isDark={isDark} style={styles.emptyCard}>
          <Text variant="body" color="textSecondary" isDark={isDark}>
            No budgets created yet. Add one from the web dashboard or reach out to your family admin.
          </Text>
        </Card>
      ) : (
        budgets.map((budget) => {
          const percentage = budget.amount
            ? Math.min((budget.spent / budget.amount) * 100, 100)
            : 0;
          return (
            <Card key={budget.id} isDark={isDark} style={styles.budgetCard}>
              <View style={styles.budgetHeader}>
                <View>
                  <Text variant="h4" isDark={isDark} weight="bold">
                    {budget.name}
                  </Text>
                  <Text variant="caption" color="textSecondary" isDark={isDark}>
                    {CATEGORY_LABELS[budget.category ?? 'other']}
                  </Text>
                </View>
                <View style={styles.budgetAmount}>
                  <Text variant="h4" isDark={isDark} weight="semibold">
                    {formatCurrency(budget.spent)}
                  </Text>
                  <Text variant="caption" color="textSecondary" isDark={isDark}>
                    of {formatCurrency(budget.amount)}
                  </Text>
                </View>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${percentage}%`,
                      backgroundColor:
                        CATEGORY_COLORS[budget.category ?? 'other'] ?? themeColors.primary,
                    },
                  ]}
                />
              </View>
              <Text variant="caption" color="textSecondary" isDark={isDark}>
                {percentage.toFixed(0)}% used
              </Text>
            </Card>
          );
        })
      )}

      <View style={styles.sectionHeader}>
        <Text variant="h3" isDark={isDark} weight="bold">
          Transactions
        </Text>
      </View>

      {groupedTransactions.length === 0 ? (
        <Card isDark={isDark} style={styles.emptyCard}>
          <Text variant="body" color="textSecondary" isDark={isDark}>
            No transactions recorded for this month yet. Add one to get started.
          </Text>
        </Card>
      ) : (
        groupedTransactions.map((group) => (
          <View key={group.dateKey} style={{ marginBottom: spacing[3] }}>
            <Text variant="label" color="textSecondary" isDark={isDark} style={{ marginBottom: spacing[1] }}>
              {group.display}
            </Text>
            {group.items.map((transaction) => (
              <Card key={transaction.id} isDark={isDark} style={styles.transactionCard}>
                <View style={styles.transactionRow}>
                  <View style={styles.transactionDetails}>
                    <Text variant="h4" isDark={isDark} weight="semibold">
                      {transaction.description || CATEGORY_LABELS[transaction.category as BudgetCategoryKey] || 'Transaction'}
                    </Text>
                    <Text variant="caption" color="textSecondary" isDark={isDark}>
                      {CATEGORY_LABELS[transaction.category as BudgetCategoryKey] || 'Other'}
                    </Text>
                  </View>
                  <Text variant="h4" isDark={isDark} weight="bold">
                    {formatCurrency(transaction.amount)}
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        ))
      )}

      <View style={{ height: spacing[8] }} />

      <TransactionModal
        visible={transactionModalOpen}
        isDark={isDark}
        onClose={() => setTransactionModalOpen(false)}
        onSubmit={handleAddTransaction}
        isSubmitting={isSubmitting}
        defaultDate={format(new Date(), 'yyyy-MM-dd')}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing[4],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing[4],
  },
  emptyCard: {
    padding: spacing[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  monthSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
    marginBottom: spacing[3],
  },
  monthButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  progressTrack: {
    height: 8,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  progressFill: {
    height: '100%',
    borderRadius: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing[2],
  },
  summaryColumn: {
    flex: 1,
  },
  chartCard: {
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  emptyChart: {
    alignItems: 'center',
    paddingVertical: spacing[6],
  },
  sectionHeader: {
    marginBottom: spacing[2],
    marginTop: spacing[3],
  },
  budgetCard: {
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[2],
  },
  budgetAmount: {
    alignItems: 'flex-end',
  },
  transactionCard: {
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionDetails: {
    flex: 1,
    marginRight: spacing[3],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: spacing[4],
  },
  modalContent: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
  },
  modalField: {
    marginBottom: spacing[3],
  },
  modalLabel: {
    fontSize: fontSize.sm,
    marginBottom: spacing[2],
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  categoryChip: {
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
    marginTop: spacing[3],
  },
});

export default BudgetScreen;
