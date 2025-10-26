// Notifications Service - In-app and Push Notifications System

// ============================================
// ENUMS
// ============================================

export enum NotificationType {
  TASK_ASSIGNED = 'task_assigned',
  TASK_COMPLETED = 'task_completed',
  TASK_DUE = 'task_due',
  MESSAGE = 'message',
  BUDGET_ALERT = 'budget_alert',
  EVENT_REMINDER = 'event_reminder',
  FAMILY_INVITE = 'family_invite',
  ACHIEVEMENT = 'achievement',
  BIRTHDAY = 'birthday',
  SYSTEM = 'system'
}

export enum NotificationChannel {
  IN_APP = 'in_app',
  PUSH = 'push',
  EMAIL = 'email',
  SMS = 'sms'
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum NotificationStatus {
  UNREAD = 'unread',
  READ = 'read',
  ARCHIVED = 'archived',
  DELETED = 'deleted'
}

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface NotificationPreferences {
  userId: string;
  channels: {
    inApp: boolean;
    push: boolean;
    email: boolean;
    sms: boolean;
  };
  types: Record<NotificationType, boolean>;
  doNotDisturbStart?: string; // HH:MM format
  doNotDisturbEnd?: string; // HH:MM format
  mutedKeywords: string[];
}

export interface Notification {
  id: string;
  userId: string;
  familyId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  description?: string;
  icon?: string;
  image?: string;
  actionUrl?: string;
  actionText?: string;
  relatedItem?: {
    id: string;
    type: string;
    title: string;
  };
  sender?: {
    userId: string;
    name: string;
    image?: string;
  };
  status: NotificationStatus;
  channels: NotificationChannel[];
  createdAt: string;
  readAt?: string;
  expiresAt?: string;
}

export interface NotificationGroup {
  type: NotificationType;
  count: number;
  latest: Notification;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
}

export interface NotificationFilter {
  userId: string;
  type?: NotificationType;
  status?: NotificationStatus;
  priority?: NotificationPriority;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface CreateNotificationRequest {
  recipientIds: string[];
  familyId: string;
  type: NotificationType;
  priority?: NotificationPriority;
  title: string;
  message: string;
  description?: string;
  channels?: NotificationChannel[];
  actionUrl?: string;
  actionText?: string;
  relatedItem?: {
    id: string;
    type: string;
    title: string;
  };
}

export interface BulkNotificationRequest {
  familyId: string;
  type: NotificationType;
  title: string;
  message: string;
  description?: string;
  channels?: NotificationChannel[];
  filter?: {
    role?: string;
    excludeIds?: string[];
  };
}

export interface NotificationStats {
  totalNotifications: number;
  unreadNotifications: number;
  notificationsByType: Record<NotificationType, number>;
  notificationsByChannel: Record<NotificationChannel, number>;
  readRate: number;
}

// ============================================
// NOTIFICATIONS API SERVICE
// ============================================

class NotificationsApiService {
  private baseUrl = '/api/notifications';
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
    };
  }

  // ==================== NOTIFICATION RETRIEVAL ====================

  /**
   * Get user notifications
   */
  async getNotifications(filter: NotificationFilter): Promise<NotificationsResponse> {
    const params = new URLSearchParams({ userId: filter.userId });
    if (filter.type) params.append('type', filter.type);
    if (filter.status) params.append('status', filter.status);
    if (filter.priority) params.append('priority', filter.priority);
    if (filter.startDate) params.append('startDate', filter.startDate);
    if (filter.endDate) params.append('endDate', filter.endDate);
    if (filter.page) params.append('page', filter.page.toString());
    if (filter.limit) params.append('limit', filter.limit.toString());

    const response = await fetch(`${this.baseUrl}?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch notifications');
    return response.json();
  }

  /**
   * Get unread notifications
   */
  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    const params = new URLSearchParams({ userId, status: NotificationStatus.UNREAD });

    const response = await fetch(`${this.baseUrl}?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch unread notifications');
    const data = await response.json();
    return data.notifications;
  }

  /**
   * Get notification by ID
   */
  async getNotification(notificationId: string): Promise<Notification> {
    const response = await fetch(`${this.baseUrl}/${notificationId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch notification');
    return response.json();
  }

  /**
   * Get grouped notifications
   */
  async getGroupedNotifications(userId: string): Promise<NotificationGroup[]> {
    const params = new URLSearchParams({ userId });

    const response = await fetch(`${this.baseUrl}/grouped?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch grouped notifications');
    return response.json();
  }

  // ==================== NOTIFICATION ACTIONS ====================

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<Notification> {
    const response = await fetch(`${this.baseUrl}/${notificationId}/read`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to mark as read');
    return response.json();
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<{ updated: number }> {
    const response = await fetch(`${this.baseUrl}/mark-all-read`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) throw new Error('Failed to mark all as read');
    return response.json();
  }

  /**
   * Archive notification
   */
  async archiveNotification(notificationId: string): Promise<Notification> {
    const response = await fetch(`${this.baseUrl}/${notificationId}/archive`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to archive notification');
    return response.json();
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/${notificationId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to delete notification');
    return response.json();
  }

  /**
   * Bulk delete notifications
   */
  async bulkDelete(notificationIds: string[]): Promise<{ deleted: number }> {
    const response = await fetch(`${this.baseUrl}/bulk-delete`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ notificationIds }),
    });

    if (!response.ok) throw new Error('Failed to bulk delete notifications');
    return response.json();
  }

  /**
   * Clear all notifications
   */
  async clearAll(userId: string): Promise<{ deleted: number }> {
    const response = await fetch(`${this.baseUrl}/clear-all`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) throw new Error('Failed to clear all notifications');
    return response.json();
  }

  // ==================== SENDING NOTIFICATIONS ====================

  /**
   * Send notification to user
   */
  async sendNotification(request: CreateNotificationRequest): Promise<Notification[]> {
    const response = await fetch(`${this.baseUrl}/send`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Failed to send notification');
    return response.json();
  }

  /**
   * Send bulk notification
   */
  async sendBulkNotification(request: BulkNotificationRequest): Promise<{ sent: number }> {
    const response = await fetch(`${this.baseUrl}/send-bulk`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Failed to send bulk notification');
    return response.json();
  }

  // ==================== PREFERENCES ====================

  /**
   * Get notification preferences
   */
  async getPreferences(): Promise<NotificationPreferences> {
    const response = await fetch(`${this.baseUrl}/preferences`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch preferences');
    return response.json();
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const response = await fetch(`${this.baseUrl}/preferences`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(preferences),
    });

    if (!response.ok) throw new Error('Failed to update preferences');
    return response.json();
  }

  /**
   * Toggle notification type
   */
  async toggleNotificationType(type: NotificationType, enabled: boolean): Promise<NotificationPreferences> {
    const response = await fetch(`${this.baseUrl}/preferences/toggle-type`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ type, enabled }),
    });

    if (!response.ok) throw new Error('Failed to toggle notification type');
    return response.json();
  }

  /**
   * Toggle notification channel
   */
  async toggleChannel(channel: NotificationChannel, enabled: boolean): Promise<NotificationPreferences> {
    const response = await fetch(`${this.baseUrl}/preferences/toggle-channel`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ channel, enabled }),
    });

    if (!response.ok) throw new Error('Failed to toggle channel');
    return response.json();
  }

  /**
   * Set do not disturb
   */
  async setDoNotDisturb(startTime: string, endTime: string): Promise<NotificationPreferences> {
    const response = await fetch(`${this.baseUrl}/preferences/do-not-disturb`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ startTime, endTime }),
    });

    if (!response.ok) throw new Error('Failed to set do not disturb');
    return response.json();
  }

  /**
   * Disable do not disturb
   */
  async disableDoNotDisturb(): Promise<NotificationPreferences> {
    const response = await fetch(`${this.baseUrl}/preferences/do-not-disturb`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to disable do not disturb');
    return response.json();
  }

  // ==================== DEVICE MANAGEMENT ====================

  /**
   * Register push notification device
   */
  async registerDevice(deviceToken: string, platform: 'ios' | 'android'): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/devices/register`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ deviceToken, platform }),
    });

    if (!response.ok) throw new Error('Failed to register device');
    return response.json();
  }

  /**
   * Unregister push notification device
   */
  async unregisterDevice(deviceToken: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/devices/unregister`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ deviceToken }),
    });

    if (!response.ok) throw new Error('Failed to unregister device');
    return response.json();
  }

  // ==================== STATISTICS ====================

  /**
   * Get notification statistics
   */
  async getStats(userId: string): Promise<NotificationStats> {
    const params = new URLSearchParams({ userId });

    const response = await fetch(`${this.baseUrl}/stats?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  }

  /**
   * Get notification history
   */
  async getHistory(
    userId: string,
    days: number = 30
  ): Promise<Array<{ date: string; count: number }>> {
    const params = new URLSearchParams({ userId, days: days.toString() });

    const response = await fetch(`${this.baseUrl}/history?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch history');
    return response.json();
  }
}

export default new NotificationsApiService();
