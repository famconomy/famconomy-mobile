import apiClient from './apiClient';
import { Message } from '../types'; // Assuming Message type exists in types/index.ts

export const getMessages = async (familyId: string): Promise<Message[]> => {
  const response = await apiClient.get(`/messages/${familyId}`);
  return response.data;
};

export const createMessage = async (messageData: { familyId: string; messageText: string }): Promise<Message> => {
  const response = await apiClient.post('/messages', messageData);
  return response.data;
};
