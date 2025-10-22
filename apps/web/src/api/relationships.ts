
import apiClient from './apiClient';
import { Relationship } from '../types/family';

export const getRelationships = async (): Promise<Relationship[]> => {
  const response = await apiClient.get('/relationships');
  return response.data;
};
