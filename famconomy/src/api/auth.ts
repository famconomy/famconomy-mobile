
import { LoginCredentials, RegisterData, User } from '../types';
import apiClient from './apiClient';

export const login = async (credentials: LoginCredentials): Promise<{ user: User; token: string }> => {
  const response = await apiClient.post('/auth/login', credentials);
  return response.data;
};

export const register = async (data: RegisterData): Promise<{ user: User; token: string }> => {
  const response = await apiClient.post('/auth/register', data);
  return response.data;
};
