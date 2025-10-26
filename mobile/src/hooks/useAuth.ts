import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/apiClient';
import OAuthService from '../services/oauthService';

const normalizeRole = (value: any): AuthUser['role'] => {
  if (!value || typeof value !== 'string') {
    return 'none';
  }
  const role = value.trim().toLowerCase();
  if (role.includes('child')) return 'child';
  if (role.includes('guardian')) return 'guardian';
  if (role.includes('admin')) return 'admin';
  if (role.includes('parent')) return 'parent';
  return 'none';
};

const normalizeUser = (payload: any): AuthUser | null => {
  if (!payload) {
    return null;
  }

  const id = payload.id ?? payload.UserID;
  const email = payload.email ?? payload.Email;
  if (!id || !email) {
    return null;
  }

  const firstName = payload.firstName ?? payload.FirstName ?? '';
  const lastName = payload.lastName ?? payload.LastName ?? '';
  const fullName = payload.full_name ?? payload.fullName ?? `${firstName} ${lastName}`.trim();
  const photo = payload.profilePhotoUrl ?? payload.ProfilePhotoUrl ?? payload.avatar;

  return {
    id,
    email,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    full_name: fullName || undefined,
    avatar: photo || undefined,
    profilePhotoUrl: photo || undefined,
    role: normalizeRole(payload.role ?? payload.RoleName),
    status: payload.status ?? (payload.IsDeleted ? 'inactive' : 'active'),
    created_at: payload.created_at ?? payload.CreatedDate ?? undefined,
    updated_at: payload.updated_at ?? payload.UpdatedDate ?? undefined,
  };
};

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  full_name?: string;
  avatar?: string;
  profilePhotoUrl?: string;
  role: 'parent' | 'guardian' | 'child' | 'admin' | 'none';
  status: string;
  created_at?: string;
  updated_at?: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start as true to check auth on mount
  const [error, setError] = useState<string | null>(null);

  const checkAuthStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('=== AUTH STATUS CHECK ===');
      console.log('Checking auth status...');
      console.log('Calling GET /auth/me');
      const response = await apiClient.get('/auth/me');
      console.log('Response status:', response.status);
      console.log('Response data:', JSON.stringify(response.data, null, 2));
      const normalized = normalizeUser(response.data);
      console.log('Normalized user:', JSON.stringify(normalized, null, 2));
      console.log('Auth check successful!');
      console.log('========================');
      setUser(normalized);
      setError(null);
    } catch (err) {
      console.log('=== AUTH STATUS CHECK ===');
      console.log('Auth check failed (user not authenticated)');
      console.log('Error:', err);
      console.log('========================');
      setError(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('=== LOGIN ATTEMPT ===');
      console.log('Attempting email/password login with:', credentials.email);
      console.log('Calling POST /auth/login');

      const response = await apiClient.post('/auth/login', credentials);
      console.log('Login response status:', response.status);
      console.log('Login response data:', JSON.stringify(response.data, null, 2));
      
      const userPayload = normalizeUser(response.data?.user);
      console.log('Normalized user payload:', JSON.stringify(userPayload, null, 2));
      
      if (!userPayload) {
        throw new Error('Login succeeded but no user profile returned.');
      }
      
      console.log('Setting user state...');
      setUser(userPayload);
      setIsLoading(false);
      console.log('Login successful!');
      console.log('====================');
    } catch (err: any) {
      console.log('=== LOGIN ERROR ===');
      const message =
        err.response?.data?.message ||
        err.message ||
        'Login failed - check API connection';
      console.error('Login error:', message, err);
      console.log('===================');
      setError(message);
      setUser(null);
      setIsLoading(false);
      throw new Error(message);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('Logging out...');
      await apiClient.post('/auth/logout');
      setUser(null);
      setError(null);
    } catch (err: any) {
      console.error('Logout error:', err);
      // Force logout even if API call fails
      setUser(null);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithProvider = useCallback(
    async (provider: 'apple' | 'microsoft' | 'google' | 'facebook') => {
      try {
        setIsLoading(true);
        setError(null);
        console.log('Starting OAuth login with:', provider);
        
        let oauthData;
        
        switch (provider) {
          case 'google':
            oauthData = await OAuthService.loginWithGoogle();
            break;
          case 'apple':
            oauthData = await OAuthService.loginWithApple();
            break;
          case 'microsoft':
            oauthData = await OAuthService.loginWithMicrosoft();
            break;
          case 'facebook':
            oauthData = await OAuthService.loginWithFacebook();
            break;
          default:
            throw new Error(`Unknown provider: ${provider}`);
        }
        
        const normalizedUser = normalizeUser(oauthData);
        if (!normalizedUser) {
          throw new Error(`${provider} login succeeded but no user profile returned.`);
        }
        console.log('OAuth login successful for:', provider, normalizedUser);
        setUser(normalizedUser);
        setIsLoading(false);
      } catch (err: any) {
        const message = err.message || `${provider} login failed`;
        console.error('OAuth error:', message);
        setError(message);
        setIsLoading(false);
        throw new Error(message);
      }
    },
    []
  );

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    login,
    logout,
    loginWithProvider,
    checkAuthStatus,
  };
}
