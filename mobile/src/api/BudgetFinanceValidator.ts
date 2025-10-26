// Budget & Finance Validation Helpers and Utilities

import {
  ExpenseCategory,
  BudgetPeriod,
  TransactionType,
  PaymentMethod,
  CreateBudgetRequest,
  UpdateBudgetRequest,
  CreateTransactionRequest,
  UpdateTransactionRequest,
  CreateGoalRequest,
  UpdateGoalRequest,
} from './BudgetFinanceService';

export class BudgetFinanceValidator {
  /**
   * Validate budget limit
   */
  static validateBudgetLimit(limit: number): { valid: boolean; error?: string } {
    if (typeof limit !== 'number' || limit <= 0) {
      return { valid: false, error: 'Budget limit must be a positive number' };
    }
    if (limit > 999999999) {
      return { valid: false, error: 'Budget limit is too large' };
    }
    return { valid: true };
  }

  /**
   * Validate expense category
   */
  static validateExpenseCategory(category: string): { valid: boolean; error?: string } {
    const validCategories = Object.values(ExpenseCategory);
    if (!validCategories.includes(category as ExpenseCategory)) {
      return { valid: false, error: 'Invalid expense category' };
    }
    return { valid: true };
  }

  /**
   * Validate budget period
   */
  static validateBudgetPeriod(period: string): { valid: boolean; error?: string } {
    const validPeriods = Object.values(BudgetPeriod);
    if (!validPeriods.includes(period as BudgetPeriod)) {
      return { valid: false, error: 'Invalid budget period' };
    }
    return { valid: true };
  }

  /**
   * Validate date range
   */
  static validateDateRange(startDate: string, endDate: string): { valid: boolean; error?: string } {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { valid: false, error: 'Invalid date format' };
    }

    if (start >= end) {
      return { valid: false, error: 'Start date must be before end date' };
    }

    return { valid: true };
  }

  /**
   * Validate alert threshold
   */
  static validateAlertThreshold(threshold: number): { valid: boolean; error?: string } {
    if (typeof threshold !== 'number' || threshold < 0 || threshold > 100) {
      return { valid: false, error: 'Alert threshold must be between 0 and 100' };
    }
    return { valid: true };
  }

  /**
   * Validate create budget request
   */
  static validateCreateBudgetRequest(request: CreateBudgetRequest): { valid: boolean; error?: string } {
    const categoryValidation = this.validateExpenseCategory(request.category);
    if (!categoryValidation.valid) return categoryValidation;

    const limitValidation = this.validateBudgetLimit(request.limit);
    if (!limitValidation.valid) return limitValidation;

    const periodValidation = this.validateBudgetPeriod(request.period);
    if (!periodValidation.valid) return periodValidation;

    const dateValidation = this.validateDateRange(request.startDate, request.endDate);
    if (!dateValidation.valid) return dateValidation;

    if (request.alerts) {
      const thresholdValidation = this.validateAlertThreshold(request.alerts.threshold);
      if (!thresholdValidation.valid) return thresholdValidation;
    }

    return { valid: true };
  }

  /**
   * Validate update budget request
   */
  static validateUpdateBudgetRequest(request: UpdateBudgetRequest): { valid: boolean; error?: string } {
    if (request.category) {
      const categoryValidation = this.validateExpenseCategory(request.category);
      if (!categoryValidation.valid) return categoryValidation;
    }

    if (request.limit !== undefined) {
      const limitValidation = this.validateBudgetLimit(request.limit);
      if (!limitValidation.valid) return limitValidation;
    }

    if (request.period) {
      const periodValidation = this.validateBudgetPeriod(request.period);
      if (!periodValidation.valid) return periodValidation;
    }

    if (request.startDate && request.endDate) {
      const dateValidation = this.validateDateRange(request.startDate, request.endDate);
      if (!dateValidation.valid) return dateValidation;
    }

    if (request.alerts) {
      const thresholdValidation = this.validateAlertThreshold(request.alerts.threshold);
      if (!thresholdValidation.valid) return thresholdValidation;
    }

    return { valid: true };
  }

  /**
   * Validate transaction amount
   */
  static validateAmount(amount: number): { valid: boolean; error?: string } {
    if (typeof amount !== 'number' || amount <= 0) {
      return { valid: false, error: 'Amount must be a positive number' };
    }
    if (amount > 999999999) {
      return { valid: false, error: 'Amount is too large' };
    }
    return { valid: true };
  }

  /**
   * Validate transaction type
   */
  static validateTransactionType(type: string): { valid: boolean; error?: string } {
    const validTypes = Object.values(TransactionType);
    if (!validTypes.includes(type as TransactionType)) {
      return { valid: false, error: 'Invalid transaction type' };
    }
    return { valid: true };
  }

  /**
   * Validate payment method
   */
  static validatePaymentMethod(method: string): { valid: boolean; error?: string } {
    const validMethods = Object.values(PaymentMethod);
    if (!validMethods.includes(method as PaymentMethod)) {
      return { valid: false, error: 'Invalid payment method' };
    }
    return { valid: true };
  }

  /**
   * Validate transaction description
   */
  static validateDescription(description: string): { valid: boolean; error?: string } {
    if (!description || description.trim().length === 0) {
      return { valid: false, error: 'Description is required' };
    }
    if (description.length > 500) {
      return { valid: false, error: 'Description must be less than 500 characters' };
    }
    return { valid: true };
  }

  /**
   * Validate transaction date
   */
  static validateTransactionDate(date: string): { valid: boolean; error?: string } {
    const transactionDate = new Date(date);
    if (isNaN(transactionDate.getTime())) {
      return { valid: false, error: 'Invalid transaction date' };
    }

    if (transactionDate > new Date()) {
      return { valid: false, error: 'Transaction date cannot be in the future' };
    }

    return { valid: true };
  }

  /**
   * Validate create transaction request
   */
  static validateCreateTransactionRequest(request: CreateTransactionRequest): { valid: boolean; error?: string } {
    const amountValidation = this.validateAmount(request.amount);
    if (!amountValidation.valid) return amountValidation;

    const typeValidation = this.validateTransactionType(request.type);
    if (!typeValidation.valid) return typeValidation;

    const categoryValidation = this.validateExpenseCategory(request.category);
    if (!categoryValidation.valid) return categoryValidation;

    const descriptionValidation = this.validateDescription(request.description);
    if (!descriptionValidation.valid) return descriptionValidation;

    const methodValidation = this.validatePaymentMethod(request.paymentMethod);
    if (!methodValidation.valid) return methodValidation;

    const dateValidation = this.validateTransactionDate(request.date);
    if (!dateValidation.valid) return dateValidation;

    return { valid: true };
  }

  /**
   * Validate update transaction request
   */
  static validateUpdateTransactionRequest(request: UpdateTransactionRequest): { valid: boolean; error?: string } {
    if (request.amount !== undefined) {
      const amountValidation = this.validateAmount(request.amount);
      if (!amountValidation.valid) return amountValidation;
    }

    if (request.type) {
      const typeValidation = this.validateTransactionType(request.type);
      if (!typeValidation.valid) return typeValidation;
    }

    if (request.category) {
      const categoryValidation = this.validateExpenseCategory(request.category);
      if (!categoryValidation.valid) return categoryValidation;
    }

    if (request.description) {
      const descriptionValidation = this.validateDescription(request.description);
      if (!descriptionValidation.valid) return descriptionValidation;
    }

    if (request.paymentMethod) {
      const methodValidation = this.validatePaymentMethod(request.paymentMethod);
      if (!methodValidation.valid) return methodValidation;
    }

    if (request.date) {
      const dateValidation = this.validateTransactionDate(request.date);
      if (!dateValidation.valid) return dateValidation;
    }

    return { valid: true };
  }

  /**
   * Validate goal title
   */
  static validateGoalTitle(title: string): { valid: boolean; error?: string } {
    if (!title || title.trim().length === 0) {
      return { valid: false, error: 'Goal title is required' };
    }
    if (title.length < 2) {
      return { valid: false, error: 'Goal title must be at least 2 characters' };
    }
    if (title.length > 100) {
      return { valid: false, error: 'Goal title must be less than 100 characters' };
    }
    return { valid: true };
  }

  /**
   * Validate goal target amount
   */
  static validateGoalTargetAmount(amount: number): { valid: boolean; error?: string } {
    if (typeof amount !== 'number' || amount <= 0) {
      return { valid: false, error: 'Target amount must be a positive number' };
    }
    if (amount > 999999999) {
      return { valid: false, error: 'Target amount is too large' };
    }
    return { valid: true };
  }

  /**
   * Validate goal due date
   */
  static validateGoalDueDate(dueDate: string): { valid: boolean; error?: string } {
    const date = new Date(dueDate);
    if (isNaN(date.getTime())) {
      return { valid: false, error: 'Invalid due date' };
    }

    if (date <= new Date()) {
      return { valid: false, error: 'Due date must be in the future' };
    }

    return { valid: true };
  }

  /**
   * Validate create goal request
   */
  static validateCreateGoalRequest(request: CreateGoalRequest): { valid: boolean; error?: string } {
    const titleValidation = this.validateGoalTitle(request.title);
    if (!titleValidation.valid) return titleValidation;

    const amountValidation = this.validateGoalTargetAmount(request.targetAmount);
    if (!amountValidation.valid) return amountValidation;

    const dueDateValidation = this.validateGoalDueDate(request.dueDate);
    if (!dueDateValidation.valid) return dueDateValidation;

    const categoryValidation = this.validateExpenseCategory(request.category);
    if (!categoryValidation.valid) return categoryValidation;

    return { valid: true };
  }

  /**
   * Validate update goal request
   */
  static validateUpdateGoalRequest(request: UpdateGoalRequest): { valid: boolean; error?: string } {
    if (request.title) {
      const titleValidation = this.validateGoalTitle(request.title);
      if (!titleValidation.valid) return titleValidation;
    }

    if (request.targetAmount !== undefined) {
      const amountValidation = this.validateGoalTargetAmount(request.targetAmount);
      if (!amountValidation.valid) return amountValidation;
    }

    if (request.dueDate) {
      const dueDateValidation = this.validateGoalDueDate(request.dueDate);
      if (!dueDateValidation.valid) return dueDateValidation;
    }

    if (request.category) {
      const categoryValidation = this.validateExpenseCategory(request.category);
      if (!categoryValidation.valid) return categoryValidation;
    }

    return { valid: true };
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get expense category icon/emoji
 */
export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    groceries: '🛒',
    utilities: '💡',
    entertainment: '🎬',
    education: '📚',
    health: '⚕️',
    transportation: '🚗',
    dining: '🍽️',
    shopping: '🛍️',
    household: '🏠',
    personal: '👤',
    savings: '💰',
    other: '📝',
  };

  return icons[category] || '📝';
}

/**
 * Get expense category color
 */
export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    groceries: '#10b981',
    utilities: '#f59e0b',
    entertainment: '#8b5cf6',
    education: '#3b82f6',
    health: '#ef4444',
    transportation: '#06b6d4',
    dining: '#ec4899',
    shopping: '#f97316',
    household: '#6366f1',
    personal: '#14b8a6',
    savings: '#22c55e',
    other: '#6b7280',
  };

  return colors[category] || '#6b7280';
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

/**
 * Calculate budget remaining
 */
export function calculateBudgetRemaining(limit: number, spent: number): number {
  return Math.max(0, limit - spent);
}

/**
 * Calculate budget percentage
 */
export function calculateBudgetPercentage(spent: number, limit: number): number {
  if (limit === 0) return 0;
  return Math.min(100, Math.round((spent / limit) * 100));
}

/**
 * Check if budget is exceeded
 */
export function isBudgetExceeded(spent: number, limit: number): boolean {
  return spent > limit;
}

/**
 * Check if budget alert threshold reached
 */
export function isBudgetAlertThreshold(spent: number, limit: number, threshold: number): boolean {
  const percentage = calculateBudgetPercentage(spent, limit);
  return percentage >= threshold;
}

/**
 * Get budget alert severity
 */
export function getBudgetAlertSeverity(spent: number, limit: number): 'safe' | 'warning' | 'critical' {
  const percentage = calculateBudgetPercentage(spent, limit);

  if (percentage >= 100) return 'critical';
  if (percentage >= 75) return 'warning';
  return 'safe';
}

/**
 * Calculate goal progress percentage
 */
export function calculateGoalProgress(currentAmount: number, targetAmount: number): number {
  if (targetAmount === 0) return 0;
  return Math.min(100, Math.round((currentAmount / targetAmount) * 100));
}

/**
 * Check if goal is achieved
 */
export function isGoalAchieved(currentAmount: number, targetAmount: number): boolean {
  return currentAmount >= targetAmount;
}

/**
 * Calculate days until goal due date
 */
export function getDaysUntilGoalDue(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();

  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Check if goal is overdue
 */
export function isGoalOverdue(dueDate: string, status: string): boolean {
  if (status === 'achieved' || status === 'abandoned') return false;

  return getDaysUntilGoalDue(dueDate) < 0;
}

/**
 * Get spending trend
 */
export function getSpendingTrend(currentMonth: number, previousMonth: number): 'up' | 'down' | 'stable' {
  if (currentMonth > previousMonth * 1.05) return 'up';
  if (currentMonth < previousMonth * 0.95) return 'down';
  return 'stable';
}

/**
 * Calculate monthly average spending
 */
export function calculateMonthlyAverage(transactions: any[]): number {
  if (transactions.length === 0) return 0;

  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  return total / transactions.length;
}

/**
 * Get transaction type icon
 */
export function getTransactionTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    income: '📥',
    expense: '📤',
    transfer: '🔄',
    refund: '↩️',
  };

  return icons[type] || '📝';
}

/**
 * Get payment method icon
 */
export function getPaymentMethodIcon(method: string): string {
  const icons: Record<string, string> = {
    cash: '💵',
    credit_card: '💳',
    debit_card: '🏧',
    bank_transfer: '🏦',
    digital_wallet: '📱',
    check: '📋',
    other: '💰',
  };

  return icons[method] || '💰';
}

/**
 * Calculate daily average spending
 */
export function calculateDailyAverage(totalSpent: number, days: number): number {
  if (days === 0) return 0;
  return totalSpent / days;
}

/**
 * Project future spending based on current trend
 */
export function projectFutureSpending(
  currentMonthSpent: number,
  currentDay: number,
  totalDaysInMonth: number
): number {
  if (currentDay === 0) return 0;
  const dailyAverage = currentMonthSpent / currentDay;
  return dailyAverage * totalDaysInMonth;
}

/**
 * Get budget status text
 */
export function getBudgetStatusText(spent: number, limit: number): string {
  const remaining = calculateBudgetRemaining(limit, spent);
  const percentage = calculateBudgetPercentage(spent, limit);

  if (percentage >= 100) {
    return `Over budget by ${formatCurrency(spent - limit)}`;
  }

  return `${formatCurrency(remaining)} remaining (${percentage}%)`;
}

/**
 * Calculate savings rate
 */
export function calculateSavingsRate(income: number, expenses: number): number {
  if (income === 0) return 0;
  return Math.round(((income - expenses) / income) * 100);
}
