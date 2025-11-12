import axios, { AxiosInstance, AxiosError } from 'axios';
import { useAuthStore } from '../store/authStore';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use((config) => {
      const token = useAuthStore.getState().token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor for error handling and retries
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const config: any = error.config || {};
        const status = error.response?.status;

        if (status === 401) {
          // Unauthorized - clear auth and redirect to login
          useAuthStore.getState().logout();
          return Promise.reject(error);
        }

        // Opt-out of retries per request
        if (config.noRetry) {
          return Promise.reject(error);
        }

        // Retry GET/HEAD/OPTIONS only by default
        const method = (config.method || 'get').toLowerCase();
        const isIdempotent = ['get', 'head', 'options'].includes(method);
        if (!isIdempotent) {
          return Promise.reject(error);
        }

        // Retry on network errors and 5xx
        const isNetworkError = !error.response;
        const isRetryableStatus = status ? status >= 500 && status < 600 : false;
        if (!isNetworkError && !isRetryableStatus) {
          return Promise.reject(error);
        }

        config.__retryCount = config.__retryCount || 0;
        const maxRetries = config.maxRetries ?? 3;
        if (config.__retryCount >= maxRetries) {
          return Promise.reject(error);
        }
        config.__retryCount += 1;

        const base = config.retryDelayBase ?? 300; // ms
        const delay = Math.min(5000, base * Math.pow(2, config.__retryCount - 1));
        const jitter = Math.floor(Math.random() * 100);
        await new Promise((res) => setTimeout(res, delay + jitter));
        return this.client(config);
      }
    );
  }

  get<T>(url: string, config = {}) {
    return this.client.get<T>(url, config);
  }

  post<T>(url: string, data?: any, config = {}) {
    return this.client.post<T>(url, data, config);
  }

  put<T>(url: string, data?: any, config = {}) {
    return this.client.put<T>(url, data, config);
  }

  patch<T>(url: string, data?: any, config = {}) {
    return this.client.patch<T>(url, data, config);
  }

  delete<T>(url: string, config = {}) {
    return this.client.delete<T>(url, config);
  }
}

export const apiClient = new ApiClient();
