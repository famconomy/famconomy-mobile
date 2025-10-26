// Settings Service - Preferences, Themes, Privacy, Account Management

// ============================================
// ENUMS
// ============================================

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  AUTO = 'auto'
}

export enum Language {
  ENGLISH = 'en',
  SPANISH = 'es',
  FRENCH = 'fr',
  GERMAN = 'de',
  PORTUGUESE = 'pt',
  JAPANESE = 'ja',
  CHINESE = 'zh'
}

export enum PrivacyLevel {
  PRIVATE = 'private',
  SEMI_PRIVATE = 'semi_private',
  PUBLIC = 'public'
}

export enum DataRetention {
  ONE_MONTH = '1_month',
  THREE_MONTHS = '3_months',
  SIX_MONTHS = '6_months',
  ONE_YEAR = '1_year',
  PERMANENT = 'permanent'
}

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface AppSettings {
  userId: string;
  familyId: string;
  theme: Theme;
  language: Language;
  currency: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  showOnboarding: boolean;
}

export interface PrivacySettings {
  userId: string;
  profileVisibility: PrivacyLevel;
  showOnlineStatus: boolean;
  showLastActive: boolean;
  allowMessagesFromNonFamily: boolean;
  dataRetention: DataRetention;
  allowAnalytics: boolean;
  allowMarketing: boolean;
  blockList: string[]; // User IDs
}

export interface NotificationSettings {
  pushNotifications: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  doNotDisturbEnabled: boolean;
  doNotDisturbStart?: string;
  doNotDisturbEnd?: string;
}

export interface SecuritySettings {
  twoFactorAuthEnabled: boolean;
  biometricAuthEnabled: boolean;
  loginAlerts: boolean;
  sessionTimeout: number; // in minutes
  rememberDevice: boolean;
  allowedDevices: Device[];
}

export interface Device {
  id: string;
  name: string;
  deviceId: string;
  platform: 'ios' | 'android' | 'web';
  lastUsed: string;
  isCurrentDevice: boolean;
  trustLevel: 'low' | 'medium' | 'high';
}

export interface AccountSettings {
  userId: string;
  email: string;
  phone?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  changeEmailRequests: ChangeRequest[];
  changePhoneRequests: ChangeRequest[];
  lastPasswordChange: string;
  accountCreatedAt: string;
  lastLoginAt: string;
}

export interface ChangeRequest {
  id: string;
  type: 'email' | 'phone';
  newValue: string;
  status: 'pending' | 'verified' | 'rejected';
  createdAt: string;
  expiresAt: string;
  verificationCode?: string;
}

export interface FamilySettings {
  familyId: string;
  familyName: string;
  theme: Theme;
  language: Language;
  currency: string;
  timezone: string;
  maxMembers: number;
  currentMembers: number;
  privacyLevel: PrivacyLevel;
  allowMemberInvites: boolean;
  requireApprovalForInvites: boolean;
  defaultMemberRole: 'parent' | 'teen' | 'child';
}

export interface AllSettings {
  app: AppSettings;
  privacy: PrivacySettings;
  notifications: NotificationSettings;
  security: SecuritySettings;
  account: AccountSettings;
  family: FamilySettings;
}

export interface UpdateAppSettingsRequest extends Partial<AppSettings> {}
export interface UpdatePrivacySettingsRequest extends Partial<PrivacySettings> {}
export interface UpdateNotificationSettingsRequest extends Partial<NotificationSettings> {}
export interface UpdateSecuritySettingsRequest extends Partial<SecuritySettings> {}
export interface UpdateFamilySettingsRequest extends Partial<FamilySettings> {}

// ============================================
// SETTINGS API SERVICE
// ============================================

class SettingsApiService {
  private baseUrl = '/api/settings';
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

  // ==================== GENERAL SETTINGS ====================

  /**
   * Get all settings
   */
  async getAllSettings(): Promise<AllSettings> {
    const response = await fetch(`${this.baseUrl}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch settings');
    return response.json();
  }

  /**
   * Reset settings to defaults
   */
  async resetToDefaults(category?: string): Promise<AllSettings | object> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);

    const response = await fetch(`${this.baseUrl}/reset?${params}`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to reset settings');
    return response.json();
  }

  // ==================== APP SETTINGS ====================

  /**
   * Get app settings
   */
  async getAppSettings(): Promise<AppSettings> {
    const response = await fetch(`${this.baseUrl}/app`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch app settings');
    return response.json();
  }

  /**
   * Update app settings
   */
  async updateAppSettings(request: UpdateAppSettingsRequest): Promise<AppSettings> {
    const response = await fetch(`${this.baseUrl}/app`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Failed to update app settings');
    return response.json();
  }

  /**
   * Change theme
   */
  async changeTheme(theme: Theme): Promise<AppSettings> {
    return this.updateAppSettings({ theme });
  }

  /**
   * Change language
   */
  async changeLanguage(language: Language): Promise<AppSettings> {
    return this.updateAppSettings({ language });
  }

  /**
   * Change timezone
   */
  async changeTimezone(timezone: string): Promise<AppSettings> {
    return this.updateAppSettings({ timezone });
  }

  // ==================== PRIVACY SETTINGS ====================

  /**
   * Get privacy settings
   */
  async getPrivacySettings(): Promise<PrivacySettings> {
    const response = await fetch(`${this.baseUrl}/privacy`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch privacy settings');
    return response.json();
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(request: UpdatePrivacySettingsRequest): Promise<PrivacySettings> {
    const response = await fetch(`${this.baseUrl}/privacy`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Failed to update privacy settings');
    return response.json();
  }

  /**
   * Block user
   */
  async blockUser(userId: string): Promise<PrivacySettings> {
    const response = await fetch(`${this.baseUrl}/privacy/block`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) throw new Error('Failed to block user');
    return response.json();
  }

  /**
   * Unblock user
   */
  async unblockUser(userId: string): Promise<PrivacySettings> {
    const response = await fetch(`${this.baseUrl}/privacy/unblock`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) throw new Error('Failed to unblock user');
    return response.json();
  }

  // ==================== NOTIFICATION SETTINGS ====================

  /**
   * Get notification settings
   */
  async getNotificationSettings(): Promise<NotificationSettings> {
    const response = await fetch(`${this.baseUrl}/notifications`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch notification settings');
    return response.json();
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(request: UpdateNotificationSettingsRequest): Promise<NotificationSettings> {
    const response = await fetch(`${this.baseUrl}/notifications`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Failed to update notification settings');
    return response.json();
  }

  // ==================== SECURITY SETTINGS ====================

  /**
   * Get security settings
   */
  async getSecuritySettings(): Promise<SecuritySettings> {
    const response = await fetch(`${this.baseUrl}/security`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch security settings');
    return response.json();
  }

  /**
   * Enable two-factor authentication
   */
  async enableTwoFactorAuth(): Promise<{ secret: string; qrCode: string }> {
    const response = await fetch(`${this.baseUrl}/security/2fa/enable`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to enable 2FA');
    return response.json();
  }

  /**
   * Verify two-factor authentication
   */
  async verifyTwoFactorAuth(code: string): Promise<{ success: boolean; backupCodes?: string[] }> {
    const response = await fetch(`${this.baseUrl}/security/2fa/verify`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ code }),
    });

    if (!response.ok) throw new Error('Failed to verify 2FA');
    return response.json();
  }

  /**
   * Disable two-factor authentication
   */
  async disableTwoFactorAuth(password: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/security/2fa/disable`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ password }),
    });

    if (!response.ok) throw new Error('Failed to disable 2FA');
    return response.json();
  }

  /**
   * Get trusted devices
   */
  async getTrustedDevices(): Promise<Device[]> {
    const response = await fetch(`${this.baseUrl}/security/devices`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch devices');
    return response.json();
  }

  /**
   * Revoke device
   */
  async revokeDevice(deviceId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/security/devices/${deviceId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to revoke device');
    return response.json();
  }

  /**
   * Revoke all sessions
   */
  async revokeAllSessions(): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/security/revoke-all-sessions`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to revoke sessions');
    return response.json();
  }

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/security/change-password`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (!response.ok) throw new Error('Failed to change password');
    return response.json();
  }

  // ==================== ACCOUNT SETTINGS ====================

  /**
   * Get account settings
   */
  async getAccountSettings(): Promise<AccountSettings> {
    const response = await fetch(`${this.baseUrl}/account`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch account settings');
    return response.json();
  }

  /**
   * Request email change
   */
  async requestEmailChange(newEmail: string): Promise<{ success: boolean; verificationSent: boolean }> {
    const response = await fetch(`${this.baseUrl}/account/change-email`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ newEmail }),
    });

    if (!response.ok) throw new Error('Failed to request email change');
    return response.json();
  }

  /**
   * Verify email change
   */
  async verifyEmailChange(code: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/account/verify-email`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ code }),
    });

    if (!response.ok) throw new Error('Failed to verify email');
    return response.json();
  }

  /**
   * Request phone change
   */
  async requestPhoneChange(newPhone: string): Promise<{ success: boolean; verificationSent: boolean }> {
    const response = await fetch(`${this.baseUrl}/account/change-phone`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ newPhone }),
    });

    if (!response.ok) throw new Error('Failed to request phone change');
    return response.json();
  }

  /**
   * Delete account
   */
  async deleteAccount(password: string, reason?: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/account/delete`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ password, reason }),
    });

    if (!response.ok) throw new Error('Failed to delete account');
    return response.json();
  }

  // ==================== FAMILY SETTINGS ====================

  /**
   * Get family settings
   */
  async getFamilySettings(familyId: string): Promise<FamilySettings> {
    const params = new URLSearchParams({ familyId });

    const response = await fetch(`${this.baseUrl}/family?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch family settings');
    return response.json();
  }

  /**
   * Update family settings
   */
  async updateFamilySettings(
    familyId: string,
    request: UpdateFamilySettingsRequest
  ): Promise<FamilySettings> {
    const response = await fetch(`${this.baseUrl}/family`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ familyId, ...request }),
    });

    if (!response.ok) throw new Error('Failed to update family settings');
    return response.json();
  }

  // ==================== DATA MANAGEMENT ====================

  /**
   * Export personal data
   */
  async exportPersonalData(): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/export-data`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to export data');
    return response.blob();
  }

  /**
   * Request data deletion
   */
  async requestDataDeletion(password: string): Promise<{ success: boolean; deleteDate: string }> {
    const response = await fetch(`${this.baseUrl}/request-deletion`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ password }),
    });

    if (!response.ok) throw new Error('Failed to request deletion');
    return response.json();
  }

  /**
   * Cancel data deletion
   */
  async cancelDataDeletion(): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/cancel-deletion`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to cancel deletion');
    return response.json();
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/clear-cache`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to clear cache');
    return response.json();
  }
}

export default new SettingsApiService();
