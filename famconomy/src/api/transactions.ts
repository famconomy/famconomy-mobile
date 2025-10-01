import { Transaction } from '../types/budget';
import apiClient from './apiClient';

export const getTransactions = async (accountIds: string[], dates?: { startDate: Date, endDate: Date }): Promise<Transaction[]> => {
  const params = new URLSearchParams();
  if (dates) {
    params.append('startDate', dates.startDate.toISOString());
    params.append('endDate', dates.endDate.toISOString());
  }
  const response = await apiClient.post(`/transactions/accounts?${params.toString()}`, { accountIds });
  return response.data;
};

export const createTransaction = async (transactionData: Partial<Transaction>): Promise<Transaction> => {
  const response = await apiClient.post('/transactions', transactionData);
  return response.data;
};

export const updateTransaction = async (id: string, transactionData: Partial<Transaction>): Promise<void> => {
  await apiClient.put(`/transactions/${id}`, transactionData);
};

export const deleteTransaction = async (id: string): Promise<void> => {
  await apiClient.delete(`/transactions/${id}`);
};