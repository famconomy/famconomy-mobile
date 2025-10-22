import apiClient from './apiClient';
import { User } from '../types/family';

export const updateUser = async (id: string, userData: Partial<User>): Promise<void> => {
  await apiClient.put(`/users/${id}`, userData);
};

export const uploadProfilePhoto = async (userId: string, photo: File): Promise<User> => {
  const formData = new FormData();
  formData.append('profilePhoto', photo);
  const response = await apiClient.post(`/users/${userId}/photo`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};
