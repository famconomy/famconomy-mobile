import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 10000, // 10 second timeout
});

export default apiClient;