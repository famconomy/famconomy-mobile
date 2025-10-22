import apiClient from './apiClient';

export const getAccounts = async (familyId?: string): Promise<any[]> => {
  const url = familyId ? `/plaid/accounts?familyId=${familyId}` : '/plaid/accounts';
  const response = await apiClient.get(url);
  return response.data;
};

export const deleteAccount = async (id: string): Promise<void> => {
  await apiClient.delete(`/plaid/accounts/${id}`);
};

export const updateAccount = async (id: string, customName: string): Promise<void> => {
  await apiClient.put(`/plaid/accounts/${id}`, { customName });
};