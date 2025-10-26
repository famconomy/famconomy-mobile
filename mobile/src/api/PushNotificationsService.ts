// Push Notifications Service - APNs Integration, Badge Counts, Rich Notifications

// ============================================
// ENUMS
// ============================================

export enum PushNotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high'
}

export enum PushDeliveryStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  BOUNCED = 'bounced'
}

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface APNsDeviceToken {
  deviceId: string;
  userId: string;
  token: string;
  deviceType: 'ios' | 'android';
  platform: string;
  osVersion: string;
  appVersion: string;
  isProduction: boolean;
  isValid: boolean;
  registeredAt: string;
  lastUsedAt: string;
  expiresAt?: string;
}

export interface PushNotification {
  id: string;
  deviceId: string;
  userId: string;
  title: string;
  body: string;
  badge?: number;
  sound?: string;
  category?: string;
  customData?: Record<string, any>;
  priority: PushNotificationPriority;
  deliveryStatus: PushDeliveryStatus;
  sentAt: string;
  deliveredAt?: string;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
}

export interface RichPushNotification extends PushNotification {
  imageUrl?: string;
  videoUrl?: string;
  attachmentUrl?: string;
  actions?: PushAction[];
  interactiveCategory?: string;
}

export interface PushAction {
  id: string;
  title: string;
  icon?: string;
  authenticationRequired: boolean;
  destructive: boolean;
  foreground: boolean;
}

export interface BulkPushRequest {
  recipientIds: string[];
  title: string;
  body: string;
  badge?: number;
  sound?: string;
  customData?: Record<string, any>;
  priority?: PushNotificationPriority;
  imageUrl?: string;
  delay?: number; // seconds
}

export interface PushNotificationStats {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  deliveryRate: number; // percentage
  averageDeliveryTime: number; // milliseconds
  failureReasons: Record<string, number>;
}

export interface PushCampaign {
  id: string;
  name: string;
  description?: string;
  title: string;
  body: string;
  recipientCount: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  schedule?: {
    scheduledFor: string;
    timezone: string;
  };
  createdAt: string;
  sentAt?: string;
}

export interface SendPushRequest {
  deviceId: string;
  title: string;
  body: string;
  badge?: number;
  sound?: string;
  customData?: Record<string, any>;
  priority?: PushNotificationPriority;
  imageUrl?: string;
  videoUrl?: string;
  actions?: PushAction[];
}

export interface RegisterDeviceTokenRequest {
  token: string;
  deviceType: 'ios' | 'android';
  platform: string;
  osVersion: string;
  appVersion: string;
}

// ============================================
// PUSH NOTIFICATIONS API SERVICE
// ============================================

class PushNotificationsApiService {
  private baseUrl = '/api/push-notifications';
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

  // ==================== DEVICE TOKEN MANAGEMENT ====================

  /**
   * Register device token for push notifications
   */
  async registerDeviceToken(request: RegisterDeviceTokenRequest): Promise<APNsDeviceToken> {
    const response = await fetch(`${this.baseUrl}/register-token`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Failed to register device token');
    return response.json();
  }

  /**
   * Update device token
   */
  async updateDeviceToken(oldToken: string, newToken: string): Promise<APNsDeviceToken> {
    const response = await fetch(`${this.baseUrl}/update-token`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ oldToken, newToken }),
    });

    if (!response.ok) throw new Error('Failed to update device token');
    return response.json();
  }

  /**
   * Unregister device token
   */
  async unregisterDeviceToken(token: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/unregister-token`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ token }),
    });

    if (!response.ok) throw new Error('Failed to unregister device token');
    return response.json();
  }

  /**
   * Get registered device tokens
   */
  async getDeviceTokens(userId: string): Promise<APNsDeviceToken[]> {
    const params = new URLSearchParams({ userId });

    const response = await fetch(`${this.baseUrl}/tokens?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch device tokens');
    return response.json();
  }

  /**
   * Validate device token
   */
  async validateToken(token: string): Promise<{ valid: boolean }> {
    const response = await fetch(`${this.baseUrl}/validate-token`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ token }),
    });

    if (!response.ok) throw new Error('Failed to validate token');
    return response.json();
  }

  // ==================== SENDING NOTIFICATIONS ====================

  /**
   * Send push notification
   */
  async sendPushNotification(request: SendPushRequest): Promise<PushNotification> {
    const response = await fetch(`${this.baseUrl}/send`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Failed to send push notification');
    return response.json();
  }

  /**
   * Send bulk push notifications
   */
  async sendBulkNotifications(request: BulkPushRequest): Promise<{ campaignId: string; scheduled: number }> {
    const response = await fetch(`${this.baseUrl}/send-bulk`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Failed to send bulk notifications');
    return response.json();
  }

  /**
   * Schedule push notification
   */
  async scheduleNotification(
    request: SendPushRequest & { scheduledFor: string; timezone: string }
  ): Promise<PushCampaign> {
    const response = await fetch(`${this.baseUrl}/schedule`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Failed to schedule notification');
    return response.json();
  }

  /**
   * Update badge count
   */
  async updateBadgeCount(userId: string, count: number): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/badge`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ userId, count }),
    });

    if (!response.ok) throw new Error('Failed to update badge count');
    return response.json();
  }

  /**
   * Clear badge count
   */
  async clearBadgeCount(userId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/badge/clear`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) throw new Error('Failed to clear badge count');
    return response.json();
  }

  // ==================== NOTIFICATION MANAGEMENT ====================

  /**
   * Get push notifications
   */
  async getPushNotifications(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ notifications: PushNotification[]; total: number }> {
    const params = new URLSearchParams({
      userId,
      limit: limit.toString(),
      offset: offset.toString(),
    });

    const response = await fetch(`${this.baseUrl}?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch push notifications');
    return response.json();
  }

  /**
   * Get notification by ID
   */
  async getNotification(notificationId: string): Promise<PushNotification> {
    const response = await fetch(`${this.baseUrl}/${notificationId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch notification');
    return response.json();
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/${notificationId}/read`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to mark as read');
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

  // ==================== CAMPAIGNS ====================

  /**
   * Get push campaigns
   */
  async getCampaigns(): Promise<PushCampaign[]> {
    const response = await fetch(`${this.baseUrl}/campaigns`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch campaigns');
    return response.json();
  }

  /**
   * Get campaign details
   */
  async getCampaign(campaignId: string): Promise<PushCampaign> {
    const response = await fetch(`${this.baseUrl}/campaigns/${campaignId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch campaign');
    return response.json();
  }

  /**
   * Cancel scheduled campaign
   */
  async cancelCampaign(campaignId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/campaigns/${campaignId}/cancel`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to cancel campaign');
    return response.json();
  }

  // ==================== STATISTICS & ANALYTICS ====================

  /**
   * Get push notification statistics
   */
  async getStats(): Promise<PushNotificationStats> {
    const response = await fetch(`${this.baseUrl}/stats`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats(campaignId: string): Promise<any> {
    const params = new URLSearchParams({ campaignId });

    const response = await fetch(`${this.baseUrl}/campaigns/${campaignId}/stats?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch campaign stats');
    return response.json();
  }

  /**
   * Handle push notification interaction
   */
  async handleNotificationInteraction(
    notificationId: string,
    action: string,
    customData?: Record<string, any>
  ): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/${notificationId}/interact`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ action, customData }),
    });

    if (!response.ok) throw new Error('Failed to handle notification interaction');
    return response.json();
  }
}

export default new PushNotificationsApiService();
