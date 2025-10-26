import { apiClient } from './client';
import type { User, AuthResponse, ApiResponse } from '../types';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignUpRequest {
  fullName: string;
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

/**
 * Login with email and password
 */
export const login = async (credentials: LoginRequest): Promise<AuthResponse> => {
  try {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  } catch (error) {
    throw handleAuthError(error);
  }
};

/**
 * Create a new user account
 */
export const signup = async (data: SignUpRequest): Promise<AuthResponse> => {
  try {
    const response = await apiClient.post<AuthResponse>('/auth/signup', data);
    return response.data;
  } catch (error) {
    throw handleAuthError(error);
  }
};

/**
 * Request password reset email
 */
export const forgotPassword = async (data: ForgotPasswordRequest): Promise<ApiResponse<{ message: string }>> => {
  try {
    const response = await apiClient.post<ApiResponse<{ message: string }>>('/auth/forgot-password', data);
    return response.data;
  } catch (error) {
    throw handleAuthError(error);
  }
};

/**
 * Reset password with token
 */
export const resetPassword = async (data: ResetPasswordRequest): Promise<ApiResponse<{ message: string }>> => {
  try {
    const response = await apiClient.post<ApiResponse<{ message: string }>>('/auth/reset-password', data);
    return response.data;
  } catch (error) {
    throw handleAuthError(error);
  }
};

/**
 * Refresh authentication token
 */
export const refreshToken = async (): Promise<AuthResponse> => {
  try {
    const response = await apiClient.post<AuthResponse>('/auth/refresh-token');
    return response.data;
  } catch (error) {
    throw handleAuthError(error);
  }
};

/**
 * Logout user
 */
export const logout = async (): Promise<ApiResponse<{ message: string }>> => {
  try {
    const response = await apiClient.post<ApiResponse<{ message: string }>>('/auth/logout');
    return response.data;
  } catch (error) {
    throw handleAuthError(error);
  }
};

/**
 * Get current user info
 */
export const getCurrentUser = async (): Promise<User> => {
  try {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  } catch (error) {
    throw handleAuthError(error);
  }
};

/**
 * Handle auth-specific errors
 */
function handleAuthError(error: any): Error {
  if (error.response?.data?.error) {
    return new Error(error.response.data.error);
  }
  if (error.response?.data?.message) {
    return new Error(error.response.data.message);
  }
  if (error.response?.status === 401) {
    return new Error('Invalid email or password');
  }
  if (error.response?.status === 409) {
    return new Error('Email already in use');
  }
  if (error.response?.status === 400) {
    return new Error('Invalid input. Please check your information.');
  }
  if (error.message) {
    return new Error(error.message);
  }
  return new Error('Authentication failed. Please try again.');
}
