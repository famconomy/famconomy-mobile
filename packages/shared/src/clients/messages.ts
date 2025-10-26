import { Message, Chat } from '../types';
import { apiClient } from './apiClient';

export const messageClient = {
  async getChats(familyId: string): Promise<Chat[]> {
    return apiClient.get(`/families/${familyId}/chats`);
  },

  async getChat(chatId: string): Promise<Chat> {
    return apiClient.get(`/chats/${chatId}`);
  },

  async getMessages(chatId: string, limit?: number, offset?: number): Promise<Message[]> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get(`/chats/${chatId}/messages${queryString}`);
  },

  async sendMessage(chatId: string, content: string, type?: string): Promise<Message> {
    return apiClient.post(`/chats/${chatId}/messages`, { content, type: type || 'text' });
  },

  async deleteMessage(messageId: string): Promise<void> {
    return apiClient.delete(`/messages/${messageId}`);
  },

  async markAsRead(messageId: string): Promise<void> {
    return apiClient.put(`/messages/${messageId}/read`, {});
  },
};
