import { User } from '../types';
import apiClient from './apiClient';

export const fetchUsers = async (): Promise<User[]> => {
  const response = await apiClient.get('/users');
  return response.data;
};

export const fetchUserById = async (id: string): Promise<User | null> => {
  try {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      return null;
    }
    throw error;
  }
};

export const updateUser = async (id: string, userData: Partial<User>): Promise<User> => {
  const response = await apiClient.put(`/users/${id}`, userData);
  return response.data;
};

export const uploadProfilePhoto = async (id: string, photo: File): Promise<User> => {
  const formData = new FormData();
  formData.append('profilePhoto', photo);

  const response = await apiClient.post(`/users/${id}/photo`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const deleteUser = async (id: string): Promise<void> => {
  await apiClient.delete(`/users/${id}`);
};
