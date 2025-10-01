import React, { useState, useEffect, useCallback, useMemo, Suspense, useRef } from 'react';
import {
  Plus, MoreVertical, TrendingUp, PiggyBank, Landmark, ShoppingCart, Car, Home, Heart, Gift, Circle,
  CheckCircle, AlertTriangle, X, Edit, Trash2, DollarSign, CreditCard, ArrowUpRight, ArrowDownRight, Filter,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlaidLink } from 'react-plaid-link';
import { useAuth } from '../hooks/useAuth';
import { useFamily } from '../hooks/useFamily';
import { useDebounce } from '../hooks/useDebounce';
import { getBudgets, createBudget, updateBudget, deleteBudget } from '../api/budget';
import { getSavingsGoals, createSavingsGoal, updateSavingsGoal, deleteSavingsGoal } from '../api/savingsGoals';
import { getTransactions, createTransaction } from '../api/transactions';
import { getAccounts, deleteAccount, updateAccount } from '../api/plaid';
import { Budget, SavingsGoal, Transaction, PlaidAccount, BudgetCategory } from '../types/budget';
import apiClient from '../api/apiClient';
import { createDebugLogger } from '../utils/debug';
import DropdownMenu from '../components/DropdownMenu';

const NewEditBudgetModal = React.lazy(() => import('../components/modals/NewEditBudgetModal'));
const NewEditSavingsGoalModal = React.lazy(() => import('../components/modals/NewEditSavingsGoalModal'));
const NewTransactionModal = React.lazy(() => import('../components/modals/NewTransactionModal'));
const FilterTransactionsModal = React.lazy(() => import('../components/modals/FilterTransactionsModal'));
const ConfirmationModal = React.lazy(() => import('../components/modals/ConfirmationModal'));
const EditAccountNameModal = React.lazy(() => import('../components/modals/EditAccountNameModal'));

import { Virtuoso } from 'react-virtuoso';

// Data Contracts - as specified
// Using types from ../types/budget.ts which should match the specified shapes.

const categoryColors: Record<string, string> = {
  housing: 'bg-blue-100 text-blue-800',
  utilities: 'bg-yellow-100 text-yellow-800',
  groceries: 'bg-green-100 text-green-800',
  transportation: 'bg-indigo-100 text-indigo-800',
  healthcare: 'bg-red-100 text-red-800',
  education: 'bg-purple-100 text-purple-800',
  entertainment: 'bg-pink-100 text-pink-800',
  savings: 'bg-teal-100 text-teal-800',
  other: 'bg-gray-100 text-gray-800',
};


const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-md ${className}`} />
);


export const BudgetPage: React.FC = () => {
  const { user } = useAuth();
  const { family } = useFamily();
  const familyId = family?.FamilyID ?? null;

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<PlaidAccount[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const debouncedSelectedAccounts = useDebounce(selectedAccounts, 300);
  const [isAccountsLoading, setIsAccountsLoading] = useState(true);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(true);
  const [isBudgetsLoading, setIsBudgetsLoading] = useState(true);
  const [isSavingsGoalsLoading, setIsSavingsGoalsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const budgetDebug = useMemo(() => createDebugLogger('budget-page'), []);
  const [activeTab, setActiveTab] = useState<'my-finances' | 'family-finances'>('my-finances');

  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<PlaidAccount | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const cacheKey = useRef('');
  const [linkToken, setLinkToken] = useState<string | null>(null);

  const fetchFamilyFinancialData = useCallback(async (id: number) => {
    const [budgetsData, savingsGoalsData] = await Promise.all([
      getBudgets(id.toString()),
      getSavingsGoals(id.toString()),
    ]);
    return { budgetsData, savingsGoalsData };
  }, []);

  const refreshFamilyFinancialData = useCallback(async () => {
    if (activeTab !== 'family-finances' || !familyId) {
      return;
    }

    try {
      const { budgetsData, savingsGoalsData } = await fetchFamilyFinancialData(familyId);
      setBudgets(budgetsData);
      setSavingsGoals(savingsGoalsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh family financial data');
    }
  }, [activeTab, familyId, fetchFamilyFinancialData]);

  useEffect(() => {
    if (activeTab !== 'family-finances') {
      setBudgets([]);
      setSavingsGoals([]);
      setIsBudgetsLoading(false);
      setIsSavingsGoalsLoading(false);
      return;
    }

    if (!familyId) {
      setBudgets([]);
      setSavingsGoals([]);
      setIsBudgetsLoading(false);
      setIsSavingsGoalsLoading(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setIsBudgetsLoading(true);
      setIsSavingsGoalsLoading(true);
      try {
        const { budgetsData, savingsGoalsData } = await fetchFamilyFinancialData(familyId);
        if (cancelled) return;
        setBudgets(budgetsData);
        setSavingsGoals(savingsGoalsData);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load family financial data');
      } finally {
        if (cancelled) return;
        setIsBudgetsLoading(false);
        setIsSavingsGoalsLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [activeTab, familyId, fetchFamilyFinancialData]);

  const fetchData = useCallback(async () => {
    if (activeTab === 'family-finances' && !familyId) {
      setBudgets([]);
      setSavingsGoals([]);
      setIsBudgetsLoading(false);
      setIsSavingsGoalsLoading(false);
      setIsTransactionsLoading(false);
      return;
    }

    if (debouncedSelectedAccounts.length === 0) {
      setTransactions([]);
      setIsTransactionsLoading(false);
      return;
    }

    const newCacheKey = `${activeTab}:${familyId ?? 'personal'}:${selectedDate.toISOString()}:${debouncedSelectedAccounts
      .slice()
      .sort()
      .join(',')}`;
    if (newCacheKey === cacheKey.current) return;
    cacheKey.current = newCacheKey;

    setIsTransactionsLoading(true);
    setError(null);

    const startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

    try {
      const transactionsData = await getTransactions(debouncedSelectedAccounts, { startDate, endDate });
      setTransactions(transactionsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setIsTransactionsLoading(false);
      return;
    }

    setIsTransactionsLoading(false);
  }, [familyId, debouncedSelectedAccounts, activeTab, selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    let cancelled = false;
    const scope: 'personal' | 'family' = activeTab === 'family-finances' ? 'family' : 'personal';

    if (scope === 'family' && !familyId) {
      setLinkToken(null);
      return undefined;
    }

    const generateToken = async () => {
      try {
        setLinkToken(null);
        const payload: { scope: 'personal' | 'family'; familyId?: number } = { scope };
        if (scope === 'family' && familyId) {
          payload.familyId = familyId;
        }
        const response = await apiClient.post('/plaid/create_link_token', payload);
        if (cancelled) return;
        setLinkToken(response.data.link_token);
      } catch (error) {
        if (cancelled) return;
        setLinkToken(null);
        budgetDebug.error('Failed to create link token', error);
      }
    };
    void generateToken();

    return () => {
      cancelled = true;
    };
  }, [activeTab, familyId, budgetDebug]);

  useEffect(() => {
    let isCancelled = false;
    const loadAccountsForTab = async () => {
      setIsAccountsLoading(true);
      try {
        if (activeTab === 'my-finances') {
          const myAccounts = await getAccounts();
          if (isCancelled) return;
          setAccounts(myAccounts);
          setSelectedAccounts(myAccounts.map(a => a.id));
        } else if (familyId) {
          const familyAccounts = await getAccounts(familyId.toString());
          if (isCancelled) return;
          setAccounts(familyAccounts);
          setSelectedAccounts(familyAccounts.map(a => a.id));
        } else {
          setAccounts([]);
          setSelectedAccounts([]);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load accounts');
        }
      } finally {
        if (!isCancelled) {
          setIsAccountsLoading(false);
        }
      }
    };

    cacheKey.current = '';
    loadAccountsForTab();
    return () => {
      isCancelled = true;
    };
  }, [activeTab, familyId]);

  const plaidConfig = useMemo(() => {
    if (!linkToken) return null;
    return {
      token: linkToken,
      onSuccess: async (public_token: string) => {
        const scope: 'personal' | 'family' = activeTab === 'family-finances' ? 'family' : 'personal';
        const payload: { public_token: string; scope: 'personal' | 'family'; familyId?: number } = { public_token, scope };
        if (scope === 'family' && familyId) {
          payload.familyId = familyId;
        }
        await apiClient.post('/plaid/exchange_public_token', payload);
        cacheKey.current = '';
        fetchData();
      },
      onExit: (err: any, metadata: any) => {
        budgetDebug.log('Plaid Link exited:', err, metadata);
      },
    };
  }, [linkToken, activeTab, familyId, budgetDebug, fetchData]);

  const { open, ready } = usePlaidLink(
    plaidConfig ?? {
      token: '',
      onSuccess: () => undefined,
      onExit: () => undefined,
    }
  );

  const linkButtonLabel = activeTab === 'family-finances' ? 'Link Family Account' : 'Link Personal Account';
  const isLinkDisabled = !ready || !linkToken || (activeTab === 'family-finances' && !familyId);

  const handleLinkClick = useCallback(() => {
    if (isLinkDisabled) return;
    open();
  }, [isLinkDisabled, open]);

  const handleTabChange = (tab: 'my-finances' | 'family-finances') => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    cacheKey.current = '';
  };

  const handleAccountToggle = (accountId: string) => {
    setSelectedAccounts(prev =>
      prev.includes(accountId) ? prev.filter(id => id !== accountId) : [...prev, accountId]
    );
  };

  const handlePrevMonth = useCallback(() => {
    setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    cacheKey.current = '';
  }, [cacheKey]);

  const handleNextMonth = useCallback(() => {
    setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    cacheKey.current = '';
  }, [cacheKey]);

  const handleSaveBudget = async (data: Partial<Budget>) => {
    if (!familyId || !user) return;
    const payload = { ...data, familyId: familyId.toString(), period: 'monthly', spent: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    if (editingBudget) {
      await updateBudget(editingBudget.id, payload);
    } else {
      await createBudget(payload);
    }
    await refreshFamilyFinancialData();
    cacheKey.current = '';
    await fetchData();
    setIsBudgetModalOpen(false);
    setEditingBudget(null);
  };

  const handleDeleteBudget = async (id: string) => {
    await deleteBudget(id);
    await refreshFamilyFinancialData();
    cacheKey.current = '';
    await fetchData();
  };

  const handleSaveGoal = async (data: Partial<SavingsGoal>) => {
    if (!familyId || !user) return;
    const payload = { ...data, familyId: familyId.toString(), category: 'savings', CreatedByUserID: user.id };
    if (editingGoal) {
      await updateSavingsGoal(editingGoal.id, payload);
    } else {
      await createSavingsGoal(payload);
    }
    await refreshFamilyFinancialData();
    cacheKey.current = '';
    await fetchData();
    setIsGoalModalOpen(false);
    setEditingGoal(null);
  };

  const handleDeleteGoal = async (id: string) => {
    await deleteSavingsGoal(id);
    await refreshFamilyFinancialData();
    cacheKey.current = '';
    await fetchData();
  };

  const handleDeleteAccount = async () => {
    if (deletingAccountId) {
      await deleteAccount(deletingAccountId);
      cacheKey.current = '';
      await fetchData();
      setDeletingAccountId(null);
    }
  };

  const handleUpdateAccountName = async (customName: string) => {
    if (editingAccount) {
      await updateAccount(editingAccount.id, customName);
      cacheKey.current = '';
      await fetchData();
      setEditingAccount(null);
    }
  };

  const handleSaveTransaction = async (data: Partial<Transaction>) => {
    if (!familyId || !user) return;
    await createTransaction({ ...data, familyId: familyId.toString(), createdBy: user.id });
    cacheKey.current = '';
    await fetchData();
    setIsTransactionModalOpen(false);
  };

  const { totalSpent, byBudget } = useMemo(() => {
    let spent = 0;
    const map = new Map<string, number>();
    const categoryToIdMap = new Map<string, string>();
    for (const b of budgets) {
      categoryToIdMap.set(b.category, b.id);
    }
    for (const t of transactions) {
      spent += t.amount;
      if (t.category) {
        const budgetId = categoryToIdMap.get(t.category);
        if (budgetId) {
          map.set(budgetId, (map.get(budgetId) ?? 0) + t.amount);
        }
      }
    }
    return { totalSpent: spent, byBudget: map };
  }, [transactions, budgets]);

  const totalBudget = useMemo(() => budgets.reduce((sum, b) => sum + b.amount, 0), [budgets]);
  const totalSavings = useMemo(() => savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0), [savingsGoals]);
  const remainingBudget = totalBudget - totalSpent;
  const percentSpent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  if (error) return <div className="p-4 sm:p-6 text-red-500">Error: {error}</div>;

  return (
    <div id="budget-overview" className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold">Finances</h1>
          <div className="flex items-center gap-2">
            <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-gray-100">
              <ChevronLeft size={20} />
            </button>
            <span className="font-semibold whitespace-nowrap">
              {selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-gray-100">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
          <button
            onClick={() => setIsTransactionModalOpen(true)}
            className="w-full sm:w-auto px-4 py-2 bg-secondary-500 text-white rounded-lg"
          >
            Add Transaction
          </button>
          <button
            onClick={handleLinkClick}
            disabled={isLinkDisabled}
            className="w-full sm:w-auto px-4 py-2 bg-primary-500 text-white rounded-lg disabled:bg-gray-300"
          >
            {linkButtonLabel}
          </button>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex overflow-x-auto scrollbar-thin gap-6" aria-label="Tabs">
          <button onClick={() => handleTabChange('my-finances')} className={`${activeTab === 'my-finances' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
            My Finances
          </button>
          <button onClick={() => handleTabChange('family-finances')} className={`${activeTab === 'family-finances' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
            Family Finances
          </button>
        </nav>
      </div>

      {activeTab === 'my-finances' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-2xl shadow-soft p-6">
            {isAccountsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-[1fr,auto,auto] gap-4 items-center mb-2 font-semibold">
                  <div>Account</div>
                  <div className="text-right">Balance</div>
                  <div></div>
                </div>
                {accounts.map(acc => (
                  <div key={acc.id} className="grid grid-cols-[1fr,auto,auto] gap-4 items-center">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id={acc.id} checked={selectedAccounts.includes(acc.id)} onChange={() => handleAccountToggle(acc.id)} />
                      <label htmlFor={acc.id}>{acc.customName || acc.name} ({acc.mask})</label>
                    </div>
                    <div className="text-right">${(acc.balance || 0).toLocaleString()}</div>
                    <div className="flex items-center justify-end space-x-2">
                      <button onClick={() => setEditingAccount(acc)} className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => setDeletingAccountId(acc.id)} className="p-2 rounded-full hover:bg-gray-100 text-red-500">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-soft p-6">
            {isTransactionsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold">Recent Transactions</h3>
                  <button onClick={() => setIsFilterModalOpen(true)} className="p-2 rounded-full hover:bg-gray-100">
                    <Filter size={18} />
                  </button>
                </div>
                <div style={{ height: 400 }}>
                  <Virtuoso
                    data={transactions}
                    components={{
                      Table: ({ style, ...props }) => <table {...props} style={{ ...style, width: '100%' }} className="w-full" />,
                      TableHead: () => (
                        <thead>
                          <tr>
                            <th className="text-left py-2">Description</th>
                            <th className="text-left py-2">Category</th>
                            <th className="text-left py-2">Date</th>
                            <th className="text-right py-2">Amount</th>
                          </tr>
                        </thead>
                      ),
                    }}
                    itemContent={(index, t) => {
                      const budget = budgets.find(b => b.category === t.category);
                      const category = budget && budget.category ? budget.category.toLowerCase() : 'other';
                      const colorClass = categoryColors[category] || categoryColors.other;
                      return (
                        <tr key={t.id}>
                          <td className="py-2">
                            {t.description}
                            {t.recurring && <span className="ml-2 text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded-full">Recurring • {t.recurringPeriod}</span>}
                          </td>
                          <td className="py-2"><span className={`px-2 py-1 text-xs rounded-full ${colorClass}`}>{category}</span></td>
                          <td className="py-2">{t.date ? new Date(t.date).toLocaleDateString() : ''}</td>
                          <td className="text-right py-2">${(t.amount || 0).toLocaleString()}</td>
                        </tr>
                      );
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {isBudgetsLoading || isTransactionsLoading || isSavingsGoalsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-soft">
                <h4 className="text-gray-500">Total Budget</h4>
                <p className="text-2xl font-bold">${(totalBudget || 0).toLocaleString()}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-soft">
                <h4 className="text-gray-500">Total Spent</h4>
                <p className="text-2xl font-bold">${(totalSpent || 0).toLocaleString()}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-soft">
                <h4 className="text-gray-500">Remaining</h4>
                <p className="text-2xl font-bold">${(remainingBudget || 0).toLocaleString()}</p>
                <p className="text-sm text-gray-400">{percentSpent.toFixed(1)}% spent</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-soft">
                <h4 className="text-gray-500">Total Savings</h4>
                <p className="text-2xl font-bold">${(totalSavings || 0).toLocaleString()}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft p-6">
              {isBudgetsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold">Finance Categories</h3>
                    <button onClick={() => { setEditingBudget(null); setIsBudgetModalOpen(true); }} className="p-2 rounded-full bg-primary-500 text-white">
                      <Plus size={18} />
                    </button>
                  </div>
                  {budgets.map(b => {
                    const spentInBudget = byBudget.get(b.id) ?? 0;
                    const progress = b.amount > 0 ? (spentInBudget / b.amount) * 100 : 0;
                    const progressColor = progress > 90 ? 'bg-red-500' : 'bg-primary-500';
                    return (
                      <div key={b.id} className="mb-4">
                        <div className="flex justify-between items-center">
                          <span>{b.category}</span>
                          <div className="flex items-center space-x-2">
                            <span>${(spentInBudget || 0).toLocaleString()} of ${(b.amount || 0).toLocaleString()}</span>
                            <DropdownMenu onEdit={() => { setEditingBudget(b); setIsBudgetModalOpen(true); }} onDelete={() => handleDeleteBudget(b.id)} />
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                          <div className={`${progressColor} h-2.5 rounded-full`} style={{ width: `${progress}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft p-6">
              {isSavingsGoalsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold">Savings Goals</h3>
                    <button onClick={() => { setEditingGoal(null); setIsGoalModalOpen(true); }} className="p-2 rounded-full bg-primary-500 text-white">
                      <Plus size={18} />
                    </button>
                  </div>
                  {savingsGoals.map(g => {
                    const progress = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0;
                    return (
                      <div key={g.id} className="mb-4">
                        <div className="flex justify-between items-center">
                          <span>{g.name}</span>
                          <div className="flex items-center space-x-2">
                            <span>${(g.currentAmount || 0).toLocaleString()} of ${(g.targetAmount || 0).toLocaleString()}</span>
                            <DropdownMenu onEdit={() => { setEditingGoal(g); setIsGoalModalOpen(true); }} onDelete={() => handleDeleteGoal(g.id)} />
                          </div>
                        </div>
                        {g.deadline && <p className="text-sm text-gray-400">Due {new Date(g.deadline).toLocaleDateString()}</p>}
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                          <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <Suspense fallback={<div>Loading...</div>}>
        <NewEditBudgetModal isOpen={isBudgetModalOpen} onClose={() => setIsBudgetModalOpen(false)} onSave={handleSaveBudget} editingBudget={editingBudget} />
        <NewEditSavingsGoalModal isOpen={isGoalModalOpen} onClose={() => setIsGoalModalOpen(false)} onSave={handleSaveGoal} editingGoal={editingGoal} />
        <NewTransactionModal isOpen={isTransactionModalOpen} onClose={() => setIsTransactionModalOpen(false)} onSave={handleSaveTransaction} budgets={budgets} />
        <FilterTransactionsModal isOpen={isFilterModalOpen} onClose={() => setIsFilterModalOpen(false)} />
        <ConfirmationModal
          isOpen={!!deletingAccountId}
          onClose={() => setDeletingAccountId(null)}
          onConfirm={handleDeleteAccount}
          title="Delete Account"
          message="Are you sure you want to delete this account? All associated transactions will also be deleted."
        />
        <EditAccountNameModal
          isOpen={!!editingAccount}
          onClose={() => setEditingAccount(null)}
          onSave={handleUpdateAccountName}
          account={editingAccount}
        />
      </Suspense>
    </div>
  );
};
