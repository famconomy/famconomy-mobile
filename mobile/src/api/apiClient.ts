import axios, { AxiosInstance } from 'axios';

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
  (error) => {
    console.error('[API Response Error]', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      config: error.config?.url,
    });
    return Promise.reject(error);
  }
);

export default apiClient;
