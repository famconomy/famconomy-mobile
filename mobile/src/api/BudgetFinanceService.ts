// Budget & Finance Service - Track Spending, Set Budgets, View Analytics

// ============================================
// ENUMS
// ============================================

export enum BudgetPeriod {
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly'
}

export enum ExpenseCategory {
  GROCERIES = 'groceries',
  UTILITIES = 'utilities',
  ENTERTAINMENT = 'entertainment',
  EDUCATION = 'education',
  HEALTH = 'health',
  TRANSPORTATION = 'transportation',
  DINING = 'dining',
  SHOPPING = 'shopping',
  HOUSEHOLD = 'household',
  PERSONAL = 'personal',
  SAVINGS = 'savings',
  OTHER = 'other'
}

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
  TRANSFER = 'transfer',
  REFUND = 'refund'
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed'
}

export enum PaymentMethod {
  CASH = 'cash',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  BANK_TRANSFER = 'bank_transfer',
  DIGITAL_WALLET = 'digital_wallet',
  CHECK = 'check',
  OTHER = 'other'
}

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface Budget {
  id: string;
  familyId: string;
  createdBy: string;
  category: ExpenseCategory;
  limit: number;
  spent: number;
  period: BudgetPeriod;
  startDate: string;
  endDate: string;
  alerts: {
    enabled: boolean;
    threshold: number; // percentage (e.g., 75)
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  familyId: string;
  userId: string;
  userName: string;
  userImage?: string;
  amount: number;
  currency: string;
  type: TransactionType;
  category: ExpenseCategory;
  description: string;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  date: string;
  receipt?: string;
  tags: string[];
  notes?: string;
  relatedTransactionId?: string; // For transfers/refunds
  createdAt: string;
  updatedAt: string;
}

export interface FinancialGoal {
  id: string;
  familyId: string;
  createdBy: string;
  title: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  dueDate: string;
  category: ExpenseCategory;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'achieved' | 'abandoned';
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FinancialReport {
  period: BudgetPeriod;
  startDate: string;
  endDate: string;
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  expensesByCategory: Record<ExpenseCategory, number>;
  incomeBySource: Record<string, number>;
  budgetStatus: Record<string, { limit: number; spent: number; percentage: number }>;
  topExpenses: Transaction[];
  savingsRate: number;
}

export interface CreateBudgetRequest {
  category: ExpenseCategory;
  limit: number;
  period: BudgetPeriod;
  startDate: string;
  endDate: string;
  alerts?: {
    enabled: boolean;
    threshold: number;
  };
  notes?: string;
}

export interface UpdateBudgetRequest extends Partial<CreateBudgetRequest> {}

export interface CreateTransactionRequest {
  amount: number;
  currency?: string;
  type: TransactionType;
  category: ExpenseCategory;
  description: string;
  paymentMethod: PaymentMethod;
  date: string;
  receipt?: string;
  tags?: string[];
  notes?: string;
  relatedTransactionId?: string;
}

export interface UpdateTransactionRequest extends Partial<CreateTransactionRequest> {
  status?: TransactionStatus;
}

export interface CreateGoalRequest {
  title: string;
  description?: string;
  targetAmount: number;
  dueDate: string;
  category: ExpenseCategory;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
}

export interface UpdateGoalRequest extends Partial<CreateGoalRequest> {
  currentAmount?: number;
  status?: 'active' | 'achieved' | 'abandoned';
}

export interface ExpenseInsight {
  category: ExpenseCategory;
  thisMonth: number;
  lastMonth: number;
  percentageChange: number;
  trend: 'up' | 'down' | 'stable';
  averagePerDay: number;
}

export interface BudgetAlert {
  budgetId: string;
  category: ExpenseCategory;
  limit: number;
  currentSpent: number;
  percentage: number;
  severity: 'warning' | 'critical';
  message: string;
  createdAt: string;
}

// ============================================
// BUDGET & FINANCE API SERVICE
// ============================================

class BudgetFinanceApiService {
  private baseUrl = '/api/budget-finance';
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
    };
  }

  // ==================== BUDGET OPERATIONS ====================

  /**
   * Create a budget
   */
  async createBudget(familyId: string, request: CreateBudgetRequest): Promise<Budget> {
    const response = await fetch(`${this.baseUrl}/budgets`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ ...request, familyId }),
    });

    if (!response.ok) throw new Error('Failed to create budget');
    return response.json();
  }

  /**
   * Get all budgets for a family
   */
  async getBudgets(familyId: string): Promise<Budget[]> {
    const params = new URLSearchParams({ familyId });

    const response = await fetch(`${this.baseUrl}/budgets?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch budgets');
    return response.json();
  }

  /**
   * Get a single budget
   */
  async getBudget(budgetId: string): Promise<Budget> {
    const response = await fetch(`${this.baseUrl}/budgets/${budgetId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch budget');
    return response.json();
  }

  /**
   * Update a budget
   */
  async updateBudget(budgetId: string, request: UpdateBudgetRequest): Promise<Budget> {
    const response = await fetch(`${this.baseUrl}/budgets/${budgetId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Failed to update budget');
    return response.json();
  }

  /**
   * Delete a budget
   */
  async deleteBudget(budgetId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/budgets/${budgetId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to delete budget');
    return response.json();
  }

  /**
   * Get budget alerts
   */
  async getBudgetAlerts(familyId: string): Promise<BudgetAlert[]> {
    const params = new URLSearchParams({ familyId });

    const response = await fetch(`${this.baseUrl}/budgets/alerts?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch budget alerts');
    return response.json();
  }

  // ==================== TRANSACTION OPERATIONS ====================

  /**
   * Create a transaction
   */
  async createTransaction(
    familyId: string,
    request: CreateTransactionRequest
  ): Promise<Transaction> {
    const response = await fetch(`${this.baseUrl}/transactions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ ...request, familyId }),
    });

    if (!response.ok) throw new Error('Failed to create transaction');
    return response.json();
  }

  /**
   * Get transactions with filtering
   */
  async getTransactions(
    familyId: string,
    filters?: {
      category?: ExpenseCategory;
      type?: TransactionType;
      startDate?: string;
      endDate?: string;
      userId?: string;
      paymentMethod?: PaymentMethod;
      status?: TransactionStatus;
      page?: number;
      limit?: number;
    }
  ): Promise<{ transactions: Transaction[]; total: number }> {
    const params = new URLSearchParams({ familyId });
    if (filters?.category) params.append('category', filters.category);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.paymentMethod) params.append('paymentMethod', filters.paymentMethod);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await fetch(`${this.baseUrl}/transactions?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch transactions');
    return response.json();
  }

  /**
   * Get a single transaction
   */
  async getTransaction(transactionId: string): Promise<Transaction> {
    const response = await fetch(`${this.baseUrl}/transactions/${transactionId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch transaction');
    return response.json();
  }

  /**
   * Update a transaction
   */
  async updateTransaction(
    transactionId: string,
    request: UpdateTransactionRequest
  ): Promise<Transaction> {
    const response = await fetch(`${this.baseUrl}/transactions/${transactionId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Failed to update transaction');
    return response.json();
  }

  /**
   * Delete a transaction
   */
  async deleteTransaction(transactionId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/transactions/${transactionId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to delete transaction');
    return response.json();
  }

  /**
   * Bulk create transactions (e.g., import from CSV)
   */
  async bulkCreateTransactions(
    familyId: string,
    transactions: CreateTransactionRequest[]
  ): Promise<{ created: number; failed: number }> {
    const response = await fetch(`${this.baseUrl}/transactions/bulk`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ familyId, transactions }),
    });

    if (!response.ok) throw new Error('Failed to bulk create transactions');
    return response.json();
  }

  // ==================== FINANCIAL GOALS ====================

  /**
   * Create a financial goal
   */
  async createGoal(familyId: string, request: CreateGoalRequest): Promise<FinancialGoal> {
    const response = await fetch(`${this.baseUrl}/goals`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ ...request, familyId }),
    });

    if (!response.ok) throw new Error('Failed to create goal');
    return response.json();
  }

  /**
   * Get all goals for a family
   */
  async getGoals(familyId: string): Promise<FinancialGoal[]> {
    const params = new URLSearchParams({ familyId });

    const response = await fetch(`${this.baseUrl}/goals?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch goals');
    return response.json();
  }

  /**
   * Get a single goal
   */
  async getGoal(goalId: string): Promise<FinancialGoal> {
    const response = await fetch(`${this.baseUrl}/goals/${goalId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch goal');
    return response.json();
  }

  /**
   * Update a goal
   */
  async updateGoal(goalId: string, request: UpdateGoalRequest): Promise<FinancialGoal> {
    const response = await fetch(`${this.baseUrl}/goals/${goalId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Failed to update goal');
    return response.json();
  }

  /**
   * Delete a goal
   */
  async deleteGoal(goalId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/goals/${goalId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to delete goal');
    return response.json();
  }

  /**
   * Add funds to a goal
   */
  async addFundsToGoal(goalId: string, amount: number): Promise<FinancialGoal> {
    const response = await fetch(`${this.baseUrl}/goals/${goalId}/add-funds`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ amount }),
    });

    if (!response.ok) throw new Error('Failed to add funds to goal');
    return response.json();
  }

  // ==================== REPORTS & ANALYTICS ====================

  /**
   * Get financial report
   */
  async getFinancialReport(
    familyId: string,
    period: BudgetPeriod,
    startDate: string,
    endDate: string
  ): Promise<FinancialReport> {
    const params = new URLSearchParams({
      familyId,
      period,
      startDate,
      endDate,
    });

    const response = await fetch(`${this.baseUrl}/reports?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch financial report');
    return response.json();
  }

  /**
   * Get spending by category
   */
  async getSpendingByCategory(
    familyId: string,
    startDate: string,
    endDate: string
  ): Promise<Record<ExpenseCategory, number>> {
    const params = new URLSearchParams({ familyId, startDate, endDate });

    const response = await fetch(`${this.baseUrl}/analytics/spending-by-category?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch spending by category');
    return response.json();
  }

  /**
   * Get spending trends
   */
  async getSpendingTrends(familyId: string, months: number = 6): Promise<any[]> {
    const params = new URLSearchParams({ familyId, months: months.toString() });

    const response = await fetch(`${this.baseUrl}/analytics/trends?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch spending trends');
    return response.json();
  }

  /**
   * Get expense insights
   */
  async getExpenseInsights(familyId: string): Promise<ExpenseInsight[]> {
    const params = new URLSearchParams({ familyId });

    const response = await fetch(`${this.baseUrl}/analytics/insights?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch expense insights');
    return response.json();
  }

  /**
   * Get monthly summary
   */
  async getMonthlySummary(familyId: string, month: number, year: number): Promise<any> {
    const params = new URLSearchParams({
      familyId,
      month: month.toString(),
      year: year.toString(),
    });

    const response = await fetch(`${this.baseUrl}/analytics/monthly-summary?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch monthly summary');
    return response.json();
  }

  // ==================== EXPORT & IMPORT ====================

  /**
   * Export transactions as CSV
   */
  async exportTransactionsCSV(familyId: string, startDate: string, endDate: string): Promise<Blob> {
    const params = new URLSearchParams({ familyId, startDate, endDate });

    const response = await fetch(`${this.baseUrl}/export/csv?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to export transactions');
    return response.blob();
  }

  /**
   * Export financial report as PDF
   */
  async exportReportPDF(
    familyId: string,
    period: BudgetPeriod,
    startDate: string,
    endDate: string
  ): Promise<Blob> {
    const params = new URLSearchParams({
      familyId,
      period,
      startDate,
      endDate,
    });

    const response = await fetch(`${this.baseUrl}/export/pdf?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to export report');
    return response.blob();
  }

  /**
   * Import transactions from CSV
   */
  async importTransactionsCSV(familyId: string, file: File): Promise<{ imported: number; errors: any[] }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('familyId', familyId);

    const response = await fetch(`${this.baseUrl}/import/csv`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    });

    if (!response.ok) throw new Error('Failed to import transactions');
    return response.json();
  }

  // ==================== RECURRING TRANSACTIONS ====================

  /**
   * Create recurring transaction
   */
  async createRecurringTransaction(
    familyId: string,
    request: CreateTransactionRequest & {
      recurrence: 'daily' | 'weekly' | 'biweekly' | 'monthly';
      endDate?: string;
    }
  ): Promise<any> {
    const response = await fetch(`${this.baseUrl}/recurring-transactions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ ...request, familyId }),
    });

    if (!response.ok) throw new Error('Failed to create recurring transaction');
    return response.json();
  }

  /**
   * Get recurring transactions
   */
  async getRecurringTransactions(familyId: string): Promise<any[]> {
    const params = new URLSearchParams({ familyId });

    const response = await fetch(`${this.baseUrl}/recurring-transactions?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch recurring transactions');
    return response.json();
  }
}

export default new BudgetFinanceApiService();
