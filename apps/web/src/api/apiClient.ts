import axios from 'axios';

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api';
const normalizeBaseUrl = (value: string) => {
  if (value === '/') {
    return value;
  }
  return value.endsWith('/') ? value.slice(0, -1) : value;
};

const baseURL = normalizeBaseUrl(rawBaseUrl);

const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 10000, // 10 second timeout
});

export default apiClient;
