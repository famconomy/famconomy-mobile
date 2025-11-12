// Device Control Service - App Blocking, Device Locking, Content Restrictions

// ============================================
// ENUMS
// ============================================

export enum ContentRestrictionLevel {
  UNRESTRICTED = 'unrestricted',
  MILD = 'mild',
  MODERATE = 'moderate',
  STRICT = 'strict'
}

export enum LockType {
  DEVICE_LOCK = 'device_lock',
  APP_LOCK = 'app_lock',
  PURCHASE_LOCK = 'purchase_lock'
}

export enum ContentCategory {
  MOVIES = 'movies',
  TV_SHOWS = 'tv_shows',
  APPS = 'apps',
  GAMES = 'games',
  BOOKS = 'books',
  MUSIC = 'music',
  PODCASTS = 'podcasts',
  NEWS = 'news',
  WEB_CONTENT = 'web_content'
}

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface DeviceLock {
  id: string;
  deviceId: string;
  lockType: LockType;
  enabled: boolean;
  passcode?: string;
  biometricEnabled: boolean;
  allowEmergencyCalls: boolean;
  allowEmergencyContacts: boolean;
  createdAt: string;
  updatedAt: string;
  lockedAt?: string;
}

export interface AppBlock {
  id: string;
  deviceId: string;
  bundleId: string;
  appName: string;
  appIcon?: string;
  blocked: boolean;
  blockedReason?: string;
  ageRating?: number;
  lastBlocked?: string;
  blockCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WebFilter {
  id: string;
  deviceId: string;
  enabled: boolean;
  restrictionLevel: ContentRestrictionLevel;
  blockedDomains: string[];
  allowedDomains: string[];
  allowedCategories: string[];
  blockedCategories: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ContentRating {
  category: ContentCategory;
  level: ContentRestrictionLevel;
  ageRating?: number;
  allowPurchases: boolean;
}

export interface ContentRestriction {
  id: string;
  deviceId: string;
  childUserId: string;
  ratings: ContentRating[];
  allowExplicitContent: boolean;
  allowInAppPurchases: boolean;
  allowAppInstallation: boolean;
  allowSettingChanges: boolean;
  allowScreenRecording: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BlockAttempt {
  id: string;
  deviceId: string;
  bundleId: string;
  appName: string;
  attemptedAt: string;
  attemptCount: number;
  reason: string;
}

export interface CreateAppBlockRequest {
  bundleId: string;
  appName: string;
  appIcon?: string;
  blockedReason?: string;
  ageRating?: number;
}

export interface CreateWebFilterRequest {
  enabled: boolean;
  restrictionLevel: ContentRestrictionLevel;
  blockedDomains?: string[];
  allowedDomains?: string[];
}

export interface CreateContentRestrictionRequest {
  ratings: ContentRating[];
  allowExplicitContent?: boolean;
  allowInAppPurchases?: boolean;
  allowAppInstallation?: boolean;
  allowSettingChanges?: boolean;
  allowScreenRecording?: boolean;
}

export interface DeviceControlStats {
  totalBlockedApps: number;
  totalBlockAttempts: number;
  webFilterEnabled: boolean;
  restrictionLevel: ContentRestrictionLevel;
  lastBlockedApp?: string;
}

// ============================================
// DEVICE CONTROL API SERVICE
// ============================================

class DeviceControlApiService {
  private baseUrl = '/api/device-control';
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

  // ==================== DEVICE LOCKING ====================

  /**
   * Create or enable device lock
   */
  async createDeviceLock(
    deviceId: string,
    lockType: LockType,
    passcode?: string
  ): Promise<DeviceLock> {
    const response = await fetch(`${this.baseUrl}/locks`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ deviceId, lockType, passcode }),
    });

    if (!response.ok) throw new Error('Failed to create device lock');
    return response.json();
  }

  /**
   * Get device locks
   */
  async getDeviceLocks(deviceId: string): Promise<DeviceLock[]> {
    const params = new URLSearchParams({ deviceId });

    const response = await fetch(`${this.baseUrl}/locks?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch device locks');
    return response.json();
  }

  /**
   * Update device lock
   */
  async updateDeviceLock(
    lockId: string,
    updates: Partial<DeviceLock>
  ): Promise<DeviceLock> {
    const response = await fetch(`${this.baseUrl}/locks/${lockId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updates),
    });

    if (!response.ok) throw new Error('Failed to update device lock');
    return response.json();
  }

  /**
   * Disable device lock
   */
  async disableDeviceLock(lockId: string, passcode?: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/locks/${lockId}/disable`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ passcode }),
    });

    if (!response.ok) throw new Error('Failed to disable device lock');
    return response.json();
  }

  /**
   * Lock device immediately
   */
  async lockDeviceNow(deviceId: string): Promise<{ success: boolean; lockedAt: string }> {
    const response = await fetch(`${this.baseUrl}/locks/lock-now`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ deviceId }),
    });

    if (!response.ok) throw new Error('Failed to lock device');
    return response.json();
  }

  /**
   * Unlock device
   */
  async unlockDevice(deviceId: string, passcode: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/locks/unlock`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ deviceId, passcode }),
    });

    if (!response.ok) throw new Error('Failed to unlock device');
    return response.json();
  }

  /**
   * Reset device lock passcode
   */
  async resetPasscode(deviceId: string, newPasscode: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/locks/reset-passcode`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ deviceId, newPasscode }),
    });

    if (!response.ok) throw new Error('Failed to reset passcode');
    return response.json();
  }

  // ==================== APP BLOCKING ====================

  /**
   * Block app
   */
  async blockApp(deviceId: string, request: CreateAppBlockRequest): Promise<AppBlock> {
    const response = await fetch(`${this.baseUrl}/blocked-apps`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ deviceId, ...request }),
    });

    if (!response.ok) throw new Error('Failed to block app');
    return response.json();
  }

  /**
   * Get blocked apps
   */
  async getBlockedApps(deviceId: string): Promise<AppBlock[]> {
    const params = new URLSearchParams({ deviceId });

    const response = await fetch(`${this.baseUrl}/blocked-apps?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch blocked apps');
    return response.json();
  }

  /**
   * Unblock app
   */
  async unblockApp(appBlockId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/blocked-apps/${appBlockId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to unblock app');
    return response.json();
  }

  /**
   * Update app block
   */
  async updateAppBlock(appBlockId: string, updates: Partial<AppBlock>): Promise<AppBlock> {
    const response = await fetch(`${this.baseUrl}/blocked-apps/${appBlockId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updates),
    });

    if (!response.ok) throw new Error('Failed to update app block');
    return response.json();
  }

  /**
   * Bulk block apps
   */
  async bulkBlockApps(
    deviceId: string,
    apps: CreateAppBlockRequest[]
  ): Promise<AppBlock[]> {
    const response = await fetch(`${this.baseUrl}/blocked-apps/bulk`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ deviceId, apps }),
    });

    if (!response.ok) throw new Error('Failed to bulk block apps');
    return response.json();
  }

  // ==================== WEB FILTERING ====================

  /**
   * Create web filter
   */
  async createWebFilter(deviceId: string, request: CreateWebFilterRequest): Promise<WebFilter> {
    const response = await fetch(`${this.baseUrl}/web-filters`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ deviceId, ...request }),
    });

    if (!response.ok) throw new Error('Failed to create web filter');
    return response.json();
  }

  /**
   * Get web filter
   */
  async getWebFilter(deviceId: string): Promise<WebFilter | null> {
    const params = new URLSearchParams({ deviceId });

    const response = await fetch(`${this.baseUrl}/web-filters?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch web filter');
    const data = await response.json();
    return data.length > 0 ? data[0] : null;
  }

  /**
   * Update web filter
   */
  async updateWebFilter(filterId: string, request: Partial<CreateWebFilterRequest>): Promise<WebFilter> {
    const response = await fetch(`${this.baseUrl}/web-filters/${filterId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Failed to update web filter');
    return response.json();
  }

  /**
   * Add blocked domain
   */
  async addBlockedDomain(filterId: string, domain: string): Promise<WebFilter> {
    const response = await fetch(`${this.baseUrl}/web-filters/${filterId}/blocked-domains`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ domain }),
    });

    if (!response.ok) throw new Error('Failed to add blocked domain');
    return response.json();
  }

  /**
   * Remove blocked domain
   */
  async removeBlockedDomain(filterId: string, domain: string): Promise<WebFilter> {
    const response = await fetch(`${this.baseUrl}/web-filters/${filterId}/blocked-domains/${encodeURIComponent(domain)}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to remove blocked domain');
    return response.json();
  }

  /**
   * Add allowed domain
   */
  async addAllowedDomain(filterId: string, domain: string): Promise<WebFilter> {
    const response = await fetch(`${this.baseUrl}/web-filters/${filterId}/allowed-domains`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ domain }),
    });

    if (!response.ok) throw new Error('Failed to add allowed domain');
    return response.json();
  }

  // ==================== CONTENT RESTRICTIONS ====================

  /**
   * Create content restriction
   */
  async createContentRestriction(
    deviceId: string,
    request: CreateContentRestrictionRequest
  ): Promise<ContentRestriction> {
    const response = await fetch(`${this.baseUrl}/content-restrictions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ deviceId, ...request }),
    });

    if (!response.ok) throw new Error('Failed to create content restriction');
    return response.json();
  }

  /**
   * Get content restriction
   */
  async getContentRestriction(deviceId: string): Promise<ContentRestriction | null> {
    const params = new URLSearchParams({ deviceId });

    const response = await fetch(`${this.baseUrl}/content-restrictions?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch content restriction');
    const data = await response.json();
    return data.length > 0 ? data[0] : null;
  }

  /**
   * Update content restriction
   */
  async updateContentRestriction(
    restrictionId: string,
    request: Partial<CreateContentRestrictionRequest>
  ): Promise<ContentRestriction> {
    const response = await fetch(`${this.baseUrl}/content-restrictions/${restrictionId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Failed to update content restriction');
    return response.json();
  }

  /**
   * Set content rating level
   */
  async setContentRatingLevel(
    restrictionId: string,
    category: ContentCategory,
    level: ContentRestrictionLevel
  ): Promise<ContentRestriction> {
    const response = await fetch(`${this.baseUrl}/content-restrictions/${restrictionId}/rating`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ category, level }),
    });

    if (!response.ok) throw new Error('Failed to set content rating');
    return response.json();
  }

  // ==================== BLOCK ATTEMPTS ====================

  /**
   * Get block attempts
   */
  async getBlockAttempts(deviceId: string, limit: number = 50): Promise<BlockAttempt[]> {
    const params = new URLSearchParams({ deviceId, limit: limit.toString() });

    const response = await fetch(`${this.baseUrl}/block-attempts?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch block attempts');
    return response.json();
  }

  /**
   * Get block attempts for specific app
   */
  async getAppBlockAttempts(deviceId: string, bundleId: string): Promise<BlockAttempt[]> {
    const params = new URLSearchParams({ deviceId, bundleId });

    const response = await fetch(`${this.baseUrl}/block-attempts/app?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch app block attempts');
    return response.json();
  }

  /**
   * Clear block attempt history
   */
  async clearBlockAttempts(deviceId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/block-attempts/clear`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ deviceId }),
    });

    if (!response.ok) throw new Error('Failed to clear block attempts');
    return response.json();
  }

  // ==================== STATISTICS ====================

  /**
   * Get device control statistics
   */
  async getStats(deviceId: string): Promise<DeviceControlStats> {
    const params = new URLSearchParams({ deviceId });

    const response = await fetch(`${this.baseUrl}/stats?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  }

  /**
   * Get enforcement report
   */
  async getEnforcementReport(
    deviceId: string,
    startDate: string,
    endDate: string
  ): Promise<any> {
    const params = new URLSearchParams({ deviceId, startDate, endDate });

    const response = await fetch(`${this.baseUrl}/enforcement-report?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch enforcement report');
    return response.json();
  }

  /**
   * Request device unlock
   */
  async requestUnlock(deviceId: string, reason?: string): Promise<{ success: boolean; expiresAt: string }> {
    const response = await fetch(`${this.baseUrl}/request-unlock`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ deviceId, reason }),
    });

    if (!response.ok) throw new Error('Failed to request unlock');
    return response.json();
  }

  /**
   * Approve unlock request
   */
  async approveUnlock(deviceId: string, unlockRequestId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/approve-unlock`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ deviceId, unlockRequestId }),
    });

    if (!response.ok) throw new Error('Failed to approve unlock');
    return response.json();
  }

  /**
   * Deny unlock request
   */
  async denyUnlock(deviceId: string, unlockRequestId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/deny-unlock`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ deviceId, unlockRequestId }),
    });

    if (!response.ok) throw new Error('Failed to deny unlock');
    return response.json();
  }
}

export default new DeviceControlApiService();
