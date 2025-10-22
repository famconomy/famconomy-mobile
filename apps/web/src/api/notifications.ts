
import { Notification } from '../types';
import apiClient from './apiClient';

export const fetchNotifications = async (userId: string): Promise<Notification[]> => {
  const response = await apiClient.get(`/notifications/user/${userId}`);
  // Transform the data from backend PascalCase to frontend camelCase
  return response.data.map((notif: any) => ({
    id: notif.NotificationID,
    userId: notif.UserID,
    message: notif.Message,
    readStatus: notif.IsRead,
    createdAt: notif.CreatedAt, // Already renamed in frontend type
    type: notif.Type,
    link: notif.Link,
  }));
};

export const markNotificationAsRead = async (id: string): Promise<void> => {
  await apiClient.put(`/notifications/${id}/read`);
};

export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  await apiClient.put(`/notifications/read-all/user/${userId}`);
};

export const createNotification = async (
  message: string,
  userId: string | null = null
): Promise<Notification> => {
  const response = await apiClient.post('/notifications', { message, userId });
  return response.data;
};
