export type BudgetCategory = 
  | 'housing'
  | 'utilities'
  | 'groceries'
  | 'transportation'
  | 'healthcare'
  | 'education'
  | 'entertainment'
  | 'savings'
  | 'other';

export interface Budget {
  id: string;
  familyId: string;
  category: BudgetCategory;
  amount: number;
  spent: number;
  period: 'monthly' | 'yearly';
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  familyId: string;
  category: BudgetCategory;
  amount: number;
  description: string;
  date: string;
  createdBy: string;
  recurring?: boolean;
  recurringPeriod?: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
}

export interface SavingsGoal {
  id: string;
  familyId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlaidAccount {
  id: string;
  name: string;
  mask: string;
  type: string;
  subtype: string;
  balance: number | null;
  customName?: string;
}