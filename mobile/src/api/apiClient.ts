import axios, { AxiosInstance, AxiosError } from 'axios';

// Production backend URL
// Can override with REACT_APP_API_BASE_URL environment variable
const getBaseUrl = () => {
  if (process.env.REACT_APP_API_BASE_URL) {
    return process.env.REACT_APP_API_BASE_URL;
  }
  
  // Default to production backend
  return 'https://famconomy.com/api';
};

const rawBaseUrl = getBaseUrl();

const normalizeBaseUrl = (value: string) => {
  if (value === '/') {
    return value;
  }
  return value.endsWith('/') ? value.slice(0, -1) : value;
};

const baseURL = normalizeBaseUrl(rawBaseUrl);

console.log('[API Client] Using baseURL:', baseURL);

const apiClient: AxiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 10000,
});

// Add request logging for debugging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Add response logging for debugging
apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.status} ${response.config.url}`);
    return response;
  },
  async (error: AxiosError) => {
    const config: any = error.config || {};
    const status = error.response?.status;

    console.error('[API Response Error]', {
      status,
      data: (error as any).response?.data,
      message: error.message,
      config: config?.url,
    });

    // Do not retry if explicitly disabled
    if (config.noRetry) {
      return Promise.reject(error);
    }

    // Only retry idempotent methods by default
    const method = (config.method || 'get').toLowerCase();
    const isIdempotent = ['get', 'head', 'options'].includes(method);
    if (!isIdempotent) {
      return Promise.reject(error);
    }

    // Skip retries for auth-related errors
    if (status && [401, 403].includes(status)) {
      return Promise.reject(error);
    }

    // Network errors and 5xx are retryable
    const isNetworkError = !error.response;
    const isRetryableStatus = status ? status >= 500 && status < 600 : false;
    if (!isNetworkError && !isRetryableStatus) {
      return Promise.reject(error);
    }

    // Retry with exponential backoff + jitter
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
    return apiClient(config);
  }
);

export default apiClient;
