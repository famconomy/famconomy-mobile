import apiClient from './apiClient';
import type { User } from '../types';

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  preferences?: {
    pushNotificationsEnabled?: boolean;
    emailNotificationsEnabled?: boolean;
    themePreference?: 'light' | 'dark';
  };
}

export const updateUser = async (userId: string, payload: UpdateUserRequest): Promise<User> => {
  const response = await apiClient.put(`/users/${userId}`, payload);
  return response.data;
};

export const uploadProfilePhoto = async (
  userId: string,
  photo: { uri: string; name: string; type: string },
): Promise<User> => {
  const formData = new FormData();
  formData.append('profilePhoto', photo as any);

  const response = await apiClient.post(`/users/${userId}/photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};
