// Screen Time Management Service - Set Limits, Track Usage, App-Specific Controls

// ============================================
// ENUMS
// ============================================

export enum ScreenTimeCategory {
  ALL_APPS = 'all_apps',
  GAMES = 'games',
  SOCIAL_MEDIA = 'social_media',
  PRODUCTIVITY = 'productivity',
  ENTERTAINMENT = 'entertainment',
  EDUCATION = 'education',
  HEALTH = 'health'
}

export enum LimitType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly'
}

export enum DayOfWeek {
  MONDAY = 0,
  TUESDAY = 1,
  WEDNESDAY = 2,
  THURSDAY = 3,
  FRIDAY = 4,
  SATURDAY = 5,
  SUNDAY = 6
}

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface ScreenTimeLimit {
  id: string;
  deviceId: string;
  childUserId: string;
  category: ScreenTimeCategory;
  limitType: LimitType;
  limitMinutes: number;
  warningMinutes?: number; // Alert when time remaining reaches this
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DowntimeSchedule {
  id: string;
  deviceId: string;
  childUserId: string;
  name: string;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  daysOfWeek: DayOfWeek[];
  enabled: boolean;
  allowCalls: boolean;
  allowEmergencyContacts: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppScreenTime {
  bundleId: string;
  appName: string;
  appIcon?: string;
  category: ScreenTimeCategory;
  todayMinutes: number;
  weekMinutes: number;
  monthMinutes: number;
  trend: 'up' | 'down' | 'stable';
  notifications: number;
  crashes: number;
  lastUsedAt: string;
}

export interface ScreenTimeUsage {
  deviceId: string;
  childUserId: string;
  date: string;
  totalMinutes: number;
  byCategory: Record<ScreenTimeCategory, number>;
  byApp: AppScreenTime[];
  unlockCount: number;
  notificationsCount: number;
  screenOnTime: number; // in minutes
  activeTime: number; // time actually using vs just screen on
}

export interface ScreenTimeReport {
  deviceId: string;
  childUserId: string;
  period: 'day' | 'week' | 'month';
  startDate: string;
  endDate: string;
  data: ScreenTimeUsage[];
  averageDailyMinutes: number;
  totalMinutes: number;
  mostUsedCategory: ScreenTimeCategory;
  mostUsedApp: string;
  trends: ScreenTimeTrend[];
}

export interface ScreenTimeTrend {
  date: string;
  minutes: number;
  breakdownByCategory: Record<ScreenTimeCategory, number>;
}

export interface AppRestriction {
  bundleId: string;
  appName: string;
  blocked: boolean;
  ageRating?: number;
  allowedDuringDowntime: boolean;
  limitMinutes?: number; // per day
  createdAt: string;
  updatedAt: string;
}

export interface CreateScreenTimeLimitRequest {
  category: ScreenTimeCategory;
  limitType: LimitType;
  limitMinutes: number;
  warningMinutes?: number;
}

export interface UpdateScreenTimeLimitRequest extends Partial<CreateScreenTimeLimitRequest> {
  enabled?: boolean;
}

export interface CreateDowntimeScheduleRequest {
  name: string;
  startTime: string;
  endTime: string;
  daysOfWeek: DayOfWeek[];
  allowCalls?: boolean;
  allowEmergencyContacts?: boolean;
}

export interface CreateAppRestrictionRequest {
  bundleId: string;
  appName: string;
  blocked?: boolean;
  ageRating?: number;
  allowedDuringDowntime?: boolean;
  limitMinutes?: number;
}

export interface ScreenTimeStats {
  averageDailyScreenTime: number;
  totalAppRestrictions: number;
  activeDowntimeSchedules: number;
  activeScreenTimeLimits: number;
  downwardTrendDays: number; // days with decreasing usage
}

// ============================================
// SCREEN TIME MANAGEMENT API SERVICE
// ============================================

class ScreenTimeApiService {
  private baseUrl = '/api/screen-time';
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

  // ==================== SCREEN TIME LIMITS ====================

  /**
   * Create screen time limit
   */
  async createLimit(
    deviceId: string,
    request: CreateScreenTimeLimitRequest
  ): Promise<ScreenTimeLimit> {
    const response = await fetch(`${this.baseUrl}/limits`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ deviceId, ...request }),
    });

    if (!response.ok) throw new Error('Failed to create screen time limit');
    return response.json();
  }

  /**
   * Get screen time limits
   */
  async getLimits(deviceId: string): Promise<ScreenTimeLimit[]> {
    const params = new URLSearchParams({ deviceId });

    const response = await fetch(`${this.baseUrl}/limits?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch screen time limits');
    return response.json();
  }

  /**
   * Get specific limit
   */
  async getLimit(limitId: string): Promise<ScreenTimeLimit> {
    const response = await fetch(`${this.baseUrl}/limits/${limitId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch limit');
    return response.json();
  }

  /**
   * Update screen time limit
   */
  async updateLimit(limitId: string, request: UpdateScreenTimeLimitRequest): Promise<ScreenTimeLimit> {
    const response = await fetch(`${this.baseUrl}/limits/${limitId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Failed to update limit');
    return response.json();
  }

  /**
   * Delete screen time limit
   */
  async deleteLimit(limitId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/limits/${limitId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to delete limit');
    return response.json();
  }

  // ==================== DOWNTIME SCHEDULES ====================

  /**
   * Create downtime schedule
   */
  async createDowntime(
    deviceId: string,
    request: CreateDowntimeScheduleRequest
  ): Promise<DowntimeSchedule> {
    const response = await fetch(`${this.baseUrl}/downtime`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ deviceId, ...request }),
    });

    if (!response.ok) throw new Error('Failed to create downtime schedule');
    return response.json();
  }

  /**
   * Get downtime schedules
   */
  async getDowntimeSchedules(deviceId: string): Promise<DowntimeSchedule[]> {
    const params = new URLSearchParams({ deviceId });

    const response = await fetch(`${this.baseUrl}/downtime?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch downtime schedules');
    return response.json();
  }

  /**
   * Update downtime schedule
   */
  async updateDowntime(
    scheduleId: string,
    request: Partial<CreateDowntimeScheduleRequest>
  ): Promise<DowntimeSchedule> {
    const response = await fetch(`${this.baseUrl}/downtime/${scheduleId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Failed to update downtime schedule');
    return response.json();
  }

  /**
   * Delete downtime schedule
   */
  async deleteDowntime(scheduleId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/downtime/${scheduleId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to delete downtime schedule');
    return response.json();
  }

  /**
   * Enable/disable downtime immediately
   */
  async setDowntimeActive(scheduleId: string, active: boolean): Promise<DowntimeSchedule> {
    const response = await fetch(`${this.baseUrl}/downtime/${scheduleId}/active`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ active }),
    });

    if (!response.ok) throw new Error('Failed to set downtime active');
    return response.json();
  }

  // ==================== USAGE TRACKING ====================

  /**
   * Get today's screen time usage
   */
  async getTodayUsage(deviceId: string): Promise<ScreenTimeUsage> {
    const params = new URLSearchParams({ deviceId });

    const response = await fetch(`${this.baseUrl}/usage/today?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch today usage');
    return response.json();
  }

  /**
   * Get usage for specific date
   */
  async getUsageForDate(deviceId: string, date: string): Promise<ScreenTimeUsage> {
    const params = new URLSearchParams({ deviceId, date });

    const response = await fetch(`${this.baseUrl}/usage?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch usage');
    return response.json();
  }

  /**
   * Get screen time report
   */
  async getReport(
    deviceId: string,
    period: 'day' | 'week' | 'month',
    startDate: string,
    endDate: string
  ): Promise<ScreenTimeReport> {
    const params = new URLSearchParams({
      deviceId,
      period,
      startDate,
      endDate,
    });

    const response = await fetch(`${this.baseUrl}/reports?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch report');
    return response.json();
  }

  /**
   * Get app-specific usage
   */
  async getAppUsage(deviceId: string, bundleId: string): Promise<AppScreenTime> {
    const params = new URLSearchParams({ deviceId, bundleId });

    const response = await fetch(`${this.baseUrl}/apps?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch app usage');
    return response.json();
  }

  /**
   * Get top apps
   */
  async getTopApps(deviceId: string, limit: number = 10): Promise<AppScreenTime[]> {
    const params = new URLSearchParams({ deviceId, limit: limit.toString() });

    const response = await fetch(`${this.baseUrl}/top-apps?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch top apps');
    return response.json();
  }

  // ==================== APP RESTRICTIONS ====================

  /**
   * Create app restriction
   */
  async createAppRestriction(
    deviceId: string,
    request: CreateAppRestrictionRequest
  ): Promise<AppRestriction> {
    const response = await fetch(`${this.baseUrl}/app-restrictions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ deviceId, ...request }),
    });

    if (!response.ok) throw new Error('Failed to create app restriction');
    return response.json();
  }

  /**
   * Get app restrictions
   */
  async getAppRestrictions(deviceId: string): Promise<AppRestriction[]> {
    const params = new URLSearchParams({ deviceId });

    const response = await fetch(`${this.baseUrl}/app-restrictions?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch app restrictions');
    return response.json();
  }

  /**
   * Update app restriction
   */
  async updateAppRestriction(
    restrictionId: string,
    request: Partial<CreateAppRestrictionRequest>
  ): Promise<AppRestriction> {
    const response = await fetch(`${this.baseUrl}/app-restrictions/${restrictionId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Failed to update app restriction');
    return response.json();
  }

  /**
   * Delete app restriction
   */
  async deleteAppRestriction(restrictionId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/app-restrictions/${restrictionId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to delete app restriction');
    return response.json();
  }

  /**
   * Bulk create app restrictions
   */
  async bulkCreateRestrictions(
    deviceId: string,
    restrictions: CreateAppRestrictionRequest[]
  ): Promise<AppRestriction[]> {
    const response = await fetch(`${this.baseUrl}/app-restrictions/bulk`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ deviceId, restrictions }),
    });

    if (!response.ok) throw new Error('Failed to bulk create restrictions');
    return response.json();
  }

  // ==================== STATISTICS ====================

  /**
   * Get screen time statistics
   */
  async getStats(deviceId: string): Promise<ScreenTimeStats> {
    const params = new URLSearchParams({ deviceId });

    const response = await fetch(`${this.baseUrl}/stats?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  }

  /**
   * Get weekly comparison
   */
  async getWeeklyComparison(deviceId: string): Promise<Record<string, number>> {
    const params = new URLSearchParams({ deviceId });

    const response = await fetch(`${this.baseUrl}/weekly-comparison?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch weekly comparison');
    return response.json();
  }

  /**
   * Request screen time extension
   */
  async requestExtension(deviceId: string, minutes: number): Promise<{ success: boolean; expiresAt: string }> {
    const response = await fetch(`${this.baseUrl}/request-extension`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ deviceId, minutes }),
    });

    if (!response.ok) throw new Error('Failed to request extension');
    return response.json();
  }

  /**
   * Approve screen time extension
   */
  async approveExtension(deviceId: string, extensionId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/approve-extension`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ deviceId, extensionId }),
    });

    if (!response.ok) throw new Error('Failed to approve extension');
    return response.json();
  }

  /**
   * Deny screen time extension
   */
  async denyExtension(deviceId: string, extensionId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/deny-extension`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ deviceId, extensionId }),
    });

    if (!response.ok) throw new Error('Failed to deny extension');
    return response.json();
  }
}

export default new ScreenTimeApiService();
