import apiClient from './apiClient';
import type {
  Budget,
  BudgetCategory,
  BudgetCategoryKey,
  BudgetPeriod,
  Transaction,
} from '../types';

type BudgetFilters = {
  period?: BudgetPeriod;
};

type TransactionFilters = {
  startDate?: string;
  endDate?: string;
  category?: BudgetCategoryKey | string;
};

const CATEGORY_ALIASES: Record<string, BudgetCategoryKey> = {
  housing: 'housing',
  rent: 'housing',
  mortgage: 'housing',
  utilities: 'utilities',
  bills: 'utilities',
  groceries: 'groceries',
  food: 'groceries',
  transportation: 'transportation',
  travel: 'transportation',
  healthcare: 'healthcare',
  medical: 'healthcare',
  education: 'education',
  school: 'education',
  entertainment: 'entertainment',
  leisure: 'entertainment',
  savings: 'savings',
  goals: 'savings',
  other: 'other',
};

const toCategoryKey = (value: unknown): BudgetCategoryKey => {
  if (!value) return 'other';
  const key = String(value).trim().toLowerCase();
  return CATEGORY_ALIASES[key] ?? (CATEGORY_ALIASES[key.replace(/s$/, '')] ?? 'other');
};

const mapBudgetCategory = (category: any, index: number): BudgetCategory => ({
  categoryId: category?.categoryId ?? category?.id ?? index,
  name: String(category?.name ?? category?.category ?? `Category ${index + 1}`),
  limit: Number(category?.limit ?? category?.amount ?? 0),
  spent: Number(category?.spent ?? category?.actual ?? category?.totalSpent ?? 0),
});

const mapBudgetRecord = (raw: any): Budget => {
  const amount = Number(raw?.amount ?? raw?.Amount ?? raw?.limit ?? 0);
  const spent =
    Number(raw?.spent ?? raw?.spentAmount ?? raw?.Spent ?? raw?.totalSpent ?? 0) || 0;

  return {
    id: String(raw?.id ?? raw?.budgetId ?? raw?.BudgetID ?? cryptoRandomId()),
    familyId: String(raw?.familyId ?? raw?.FamilyID ?? ''),
    name: String(
      raw?.name ??
        raw?.Name ??
        raw?.category ??
        raw?.Category ??
        `Budget ${String(raw?.id ?? '').padStart(2, '0')}`,
    ),
    amount,
    spent,
    period: (raw?.period ?? raw?.Period ?? 'monthly') as BudgetPeriod,
    category: raw?.category ? toCategoryKey(raw.category) : undefined,
    startDate: raw?.startDate ?? raw?.StartDate ?? undefined,
    endDate: raw?.endDate ?? raw?.EndDate ?? undefined,
    categories: Array.isArray(raw?.categories)
      ? raw.categories.map(mapBudgetCategory)
      : undefined,
    createdAt: raw?.createdAt ?? raw?.CreatedAt ?? undefined,
    updatedAt: raw?.updatedAt ?? raw?.UpdatedAt ?? raw?.createdAt ?? undefined,
  };
};

const mapTransactionRecord = (raw: any): Transaction => ({
  id: String(raw?.id ?? raw?.transactionId ?? raw?.TransactionID ?? cryptoRandomId()),
  familyId: String(raw?.familyId ?? raw?.FamilyID ?? ''),
  amount: Number(raw?.amount ?? raw?.Amount ?? raw?.value ?? 0),
  category: toCategoryKey(raw?.category ?? raw?.Category ?? 'other'),
  description: raw?.description ?? raw?.Description ?? undefined,
  date: raw?.date ?? raw?.Date ?? raw?.createdAt ?? new Date().toISOString(),
  createdBy: raw?.createdBy ?? raw?.CreatedBy ?? raw?.userName ?? undefined,
  budgetId: raw?.budgetId
    ? String(raw.budgetId)
    : raw?.BudgetID
    ? String(raw.BudgetID)
    : undefined,
  recurring: Boolean(raw?.recurring ?? raw?.isRecurring ?? false),
  recurringPeriod: raw?.recurringPeriod ?? raw?.RecurringPeriod ?? undefined,
});

const cryptoRandomId = () => Math.random().toString(36).slice(2, 12);

export const getBudgets = async (
  familyId: string,
  filters: BudgetFilters = {},
): Promise<Budget[]> => {
  const params: Record<string, string> = {};
  if (filters.period) {
    params.period = filters.period;
  }

  const response = await apiClient.get(`/budget/family/${familyId}`, {
    params: Object.keys(params).length ? params : undefined,
  });
  const data = Array.isArray(response.data) ? response.data : [];
  return data.map(mapBudgetRecord);
};

export const createBudget = async (
  payload: Partial<Budget> & { familyId: string },
): Promise<Budget> => {
  const response = await apiClient.post('/budget', payload);
  return mapBudgetRecord(response.data);
};

export const updateBudget = async (budgetId: string, payload: Partial<Budget>): Promise<Budget> => {
  const response = await apiClient.put(`/budget/${budgetId}`, payload);
  return mapBudgetRecord(response.data);
};

export const deleteBudget = async (budgetId: string): Promise<void> => {
  await apiClient.delete(`/budget/${budgetId}`);
};

export const getTransactions = async (
  familyId: string,
  filters: TransactionFilters = {},
): Promise<Transaction[]> => {
  const params = new URLSearchParams({ familyId });
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.category) params.append('category', String(filters.category));

  const response = await apiClient.get('/transactions', { params });
  const data = Array.isArray(response.data?.transactions ?? response.data)
    ? response.data.transactions ?? response.data
    : [];
  return data.map(mapTransactionRecord);
};

export const createTransaction = async (
  familyId: string,
  payload: Partial<Transaction>,
): Promise<Transaction> => {
  const response = await apiClient.post('/transactions', {
    ...payload,
    familyId,
  });
  return mapTransactionRecord(response.data);
};
