import { useState, useEffect, useContext, createContext } from 'react';
import apiClient from '../api/apiClient';
import { AuthState, LoginCredentials, RegisterData } from '../types';
import { createDebugLogger } from '../utils/debug';
import { clearStoredActiveFamilyId } from '../utils/activeFamilyStorage';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  loginWithProvider: (provider: 'apple' | 'microsoft' | 'google' | 'facebook') => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const rawApiBaseForOAuth = import.meta.env.VITE_API_BASE_URL ?? '/api';
const normalizeOAuthBase = (value: string) => {
  if (!value || value === '/') {
    return '';
  }
  return value.endsWith('/') ? value.slice(0, -1) : value;
};
const providerLoginBaseUrl = normalizeOAuthBase(rawApiBaseForOAuth);

const buildProviderLoginUrl = (provider: 'apple' | 'microsoft' | 'google' | 'facebook') => {
  if (!providerLoginBaseUrl) {
    return `/auth/${provider}`;
  }
  return `${providerLoginBaseUrl}/auth/${provider}`;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });
  const authDebug = createDebugLogger('auth');

  const checkAuthStatus = async () => {
    authDebug.log('checkAuthStatus: Starting...');
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      authDebug.log('checkAuthStatus: Making /auth/me request...');
      const res = await apiClient.get('/auth/me');
      authDebug.log('checkAuthStatus: /auth/me successful.', res.data);
      setState({
        user: res.data,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      authDebug.error('checkAuthStatus: /auth/me failed.', err);
      clearStoredActiveFamilyId();
      setState(prev => ({ ...prev, isLoading: false, isAuthenticated: false, user: null, error: null }));
    }
  };

  useEffect(() => {
    checkAuthStatus();
  },
   []);

  const login = async (credentials: LoginCredentials) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      // Demo account support only in development
      if (process.env.NODE_ENV !== 'production' && 
          credentials.email === 'admin@example.com' && 
          credentials.password === 'password') {
        setState({
          user: {
            id: 'demo-admin',
            full_name: 'Demo Admin',
            email: 'admin@example.com',
            role: 'admin',
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return;
      }

      clearStoredActiveFamilyId();
      await apiClient.post('/auth/login', credentials);
      await checkAuthStatus();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage,
      });
      throw new Error(errorMessage); // Re-throw the error for the component to handle
    }
  };

  const register = async (data: RegisterData) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      clearStoredActiveFamilyId();
      await apiClient.post('/auth/register', data);
      await checkAuthStatus();
    } catch (error: any) {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: error.response?.data?.message || error.message || 'Registration failed',
      });
    }
  };

  const loginWithProvider = async (provider: 'apple' | 'microsoft' | 'google' | 'facebook') => {
    window.location.href = buildProviderLoginUrl(provider);
  };

  const logout = async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      await apiClient.post('/auth/logout');
      clearStoredActiveFamilyId();
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      // Even if logout fails on the server, we should log the user out on the client
      clearStoredActiveFamilyId();
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, loginWithProvider, logout, checkAuthStatus }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
