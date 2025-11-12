// Family Controls Authorization Service - Permission Management UI

// ============================================
// ENUMS
// ============================================

export enum AuthorizationStatus {
  NOT_REQUESTED = 'not_requested',
  DENIED = 'denied',
  APPROVED = 'approved',
  RESTRICTED = 'restricted'
}

export enum ControlType {
  SCREEN_TIME = 'screen_time',
  APP_BLOCKING = 'app_blocking',
  CONTENT_RESTRICTION = 'content_restriction',
  DEVICE_CONTROL = 'device_control',
  COMMUNICATION = 'communication'
}

export enum ContentRestriction {
  MOVIES = 'movies',
  TV_SHOWS = 'tv_shows',
  APPS = 'apps',
  GAMES = 'games',
  MUSIC = 'music',
  PODCASTS = 'podcasts',
  NEWS = 'news',
  BOOKS = 'books'
}

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface AuthorizationStatusRecord {
  childDeviceId: string;
  status: AuthorizationStatus;
  requestedAt: string;
  approvedAt?: string;
  deniedAt?: string;
  expiresAt?: string;
}

export interface DeviceControl {
  id: string;
  childDeviceId: string;
  parentUserId: string;
  controlType: ControlType;
  enabled: boolean;
  appliedAt: string;
  settings: Record<string, any>;
}

export interface FamilyControlsPermission {
  id: string;
  parentDeviceId: string;
  childDeviceId: string;
  childName: string;
  deviceModel: string;
  osVersion: string;
  authorizationStatus: AuthorizationStatus;
  grantedPermissions: ControlType[];
  deniedPermissions: ControlType[];
  activeControls: DeviceControl[];
  lastSyncedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthorizationShield {
  id: string;
  parentUserId: string;
  childUserId: string;
  deviceId: string;
  displayText: string;
  reason: string;
  actionButtons: {
    primary: string;
    secondary?: string;
  };
  icon?: string;
  backgroundColor?: string;
  severity: 'info' | 'warning' | 'critical';
  dismissible: boolean;
  createdAt: string;
  dismissedAt?: string;
}

export interface GrantAuthorizationRequest {
  childDeviceId: string;
  childName: string;
  deviceModel: string;
  osVersion: string;
  requestedPermissions: ControlType[];
}

export interface RevokeAuthorizationRequest {
  childDeviceId: string;
  reason?: string;
}

export interface DeviceControlConfig {
  deviceId: string;
  controlType: ControlType;
  enabled: boolean;
  settings: Record<string, any>;
}

export interface FamilyControlsStats {
  totalManagedDevices: number;
  authorizedDevices: number;
  pendingAuthorization: number;
  activeControls: number;
  blockedAppsCount: number;
  screenTimeLimitEnforced: number;
}

// ============================================
// FAMILY CONTROLS API SERVICE
// ============================================

class FamilyControlsApiService {
  private baseUrl = '/api/family-controls';
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

  // ==================== AUTHORIZATION ====================

  /**
   * Request authorization to manage child device
   */
  async requestAuthorization(request: GrantAuthorizationRequest): Promise<FamilyControlsPermission> {
    const response = await fetch(`${this.baseUrl}/authorize`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Failed to request authorization');
    return response.json();
  }

  /**
   * Get authorization status
   */
  async getAuthorizationStatus(deviceId: string): Promise<AuthorizationStatus> {
    const params = new URLSearchParams({ deviceId });

    const response = await fetch(`${this.baseUrl}/status?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch authorization status');
    return response.json();
  }

  /**
   * Revoke authorization
   */
  async revokeAuthorization(request: RevokeAuthorizationRequest): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/revoke`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Failed to revoke authorization');
    return response.json();
  }

  /**
   * Get managed devices
   */
  async getManagedDevices(familyId: string): Promise<FamilyControlsPermission[]> {
    const params = new URLSearchParams({ familyId });

    const response = await fetch(`${this.baseUrl}/devices?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch managed devices');
    return response.json();
  }

  /**
   * Get device details
   */
  async getDeviceDetails(deviceId: string): Promise<FamilyControlsPermission> {
    const response = await fetch(`${this.baseUrl}/devices/${deviceId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch device details');
    return response.json();
  }

  // ==================== DEVICE CONTROL ====================

  /**
   * Enable/disable control on device
   */
  async configureControl(deviceId: string, config: DeviceControlConfig): Promise<DeviceControl> {
    const response = await fetch(`${this.baseUrl}/devices/${deviceId}/controls`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(config),
    });

    if (!response.ok) throw new Error('Failed to configure control');
    return response.json();
  }

  /**
   * Get active controls on device
   */
  async getActiveControls(deviceId: string): Promise<DeviceControl[]> {
    const response = await fetch(`${this.baseUrl}/devices/${deviceId}/active-controls`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch active controls');
    return response.json();
  }

  /**
   * Update control settings
   */
  async updateControlSettings(
    deviceId: string,
    controlId: string,
    settings: Record<string, any>
  ): Promise<DeviceControl> {
    const response = await fetch(`${this.baseUrl}/devices/${deviceId}/controls/${controlId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ settings }),
    });

    if (!response.ok) throw new Error('Failed to update control settings');
    return response.json();
  }

  /**
   * Disable control on device
   */
  async disableControl(deviceId: string, controlId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/devices/${deviceId}/controls/${controlId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to disable control');
    return response.json();
  }

  // ==================== AUTHORIZATION SHIELD ====================

  /**
   * Show authorization shield
   */
  async showAuthorizationShield(
    parentUserId: string,
    childUserId: string,
    deviceId: string,
    reason: string
  ): Promise<AuthorizationShield> {
    const response = await fetch(`${this.baseUrl}/shields`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ parentUserId, childUserId, deviceId, reason }),
    });

    if (!response.ok) throw new Error('Failed to show authorization shield');
    return response.json();
  }

  /**
   * Get current authorization shields
   */
  async getShields(deviceId: string): Promise<AuthorizationShield[]> {
    const params = new URLSearchParams({ deviceId });

    const response = await fetch(`${this.baseUrl}/shields?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch shields');
    return response.json();
  }

  /**
   * Dismiss authorization shield
   */
  async dismissShield(shieldId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/shields/${shieldId}/dismiss`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to dismiss shield');
    return response.json();
  }

  // ==================== STATISTICS ====================

  /**
   * Get family controls statistics
   */
  async getStats(familyId: string): Promise<FamilyControlsStats> {
    const params = new URLSearchParams({ familyId });

    const response = await fetch(`${this.baseUrl}/stats?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  }

  /**
   * Get authorization request history
   */
  async getAuthorizationHistory(deviceId: string): Promise<any[]> {
    const params = new URLSearchParams({ deviceId });

    const response = await fetch(`${this.baseUrl}/history?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch history');
    return response.json();
  }

  // ==================== SYNC ====================

  /**
   * Sync device with server
   */
  async syncDevice(deviceId: string): Promise<{ success: boolean; lastSyncedAt: string }> {
    const response = await fetch(`${this.baseUrl}/devices/${deviceId}/sync`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to sync device');
    return response.json();
  }

  /**
   * Get pending actions for device
   */
  async getPendingActions(deviceId: string): Promise<any[]> {
    const params = new URLSearchParams({ deviceId });

    const response = await fetch(`${this.baseUrl}/devices/${deviceId}/pending-actions?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch pending actions');
    return response.json();
  }

  /**
   * Confirm action on device
   */
  async confirmAction(deviceId: string, actionId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/devices/${deviceId}/actions/${actionId}/confirm`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to confirm action');
    return response.json();
  }

  // ==================== CHILD DEVICE REGISTRATION ====================

  /**
   * Register child device for management
   */
  async registerChildDevice(
    familyId: string,
    childUserId: string,
    deviceInfo: {
      deviceId: string;
      deviceName: string;
      deviceModel: string;
      osVersion: string;
      platform: 'ios' | 'android';
    }
  ): Promise<FamilyControlsPermission> {
    const response = await fetch(`${this.baseUrl}/register-device`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ familyId, childUserId, deviceInfo }),
    });

    if (!response.ok) throw new Error('Failed to register child device');
    return response.json();
  }

  /**
   * Unregister child device
   */
  async unregisterChildDevice(deviceId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/devices/${deviceId}/unregister`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to unregister device');
    return response.json();
  }
}

export default new FamilyControlsApiService();
