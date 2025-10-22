
import apiClient from './apiClient';

export const getIntegrationStatus = async (): Promise<string[]> => {
  const response = await apiClient.get('/integrations/status');
  return response.data.activeProviders || [];
};

export const disconnectInstacart = async (): Promise<void> => {
  await apiClient.delete('/integrations/instacart/disconnect');
};

export const disconnectShipt = async (): Promise<void> => {
  await apiClient.delete('/integrations/shipt/disconnect');
};

export const disconnectKroger = async (): Promise<void> => {
  await apiClient.delete('/integrations/kroger/disconnect');
};

export const searchInstacart = async (query: string): Promise<any[]> => {
  const response = await apiClient.post('/integrations/instacart/search', { query });
  return response.data;
};

export const addInstacartItem = async (productId: string, quantity: number): Promise<void> => {
  await apiClient.post('/integrations/instacart/add-to-cart', { productId, quantity });
};
