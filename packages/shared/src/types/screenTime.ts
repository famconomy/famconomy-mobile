/**
 * Screen Time & Device Management Types
 * Core types for FamilyControls (iOS) and DevicePolicyManager (Android)
 */

export type ScreenTimeGrantStatus = 'active' | 'expired' | 'revoked';
export type DevicePlatform = 'ios' | 'android';

/**
 * Screen time grant issued when child completes tasks
 */
export interface ScreenTimeGrant {
  grantId: string;
  childUserId: string;
  familyId: string;
  
  // Time allocation
  grantedMinutes: number;
  usedMinutes: number;
  remainingMinutes: number;
  
  // Validity
  status: ScreenTimeGrantStatus;
  grantedAt: string;
  expiresAt: string;
  revokedAt?: string;
  
  // Source
  sourceTaskId?: string;
  grantedByUserId: string;
  
  // App restrictions (optional)
  allowedAppBundleIds?: string[];
  allowedCategories?: AppCategory[];
}

export type AppCategory = 
  | 'games'
  | 'social'
  | 'entertainment'
  | 'education'
  | 'productivity'
  | 'all';

/**
 * Device registered for screen time management
 */
export interface ManagedDevice {
  deviceId: string;
  userId: string;
  familyId: string;
  platform: DevicePlatform;
  deviceName: string;
  deviceModel?: string;
  osVersion?: string;
  
  // Management status
  isManaged: boolean;
  managedSince?: string;
  pushToken?: string;
  
  // Last sync
  lastSyncAt?: string;
}

/**
 * Screen time schedule (recurring limits)
 */
export interface ScreenTimeSchedule {
  scheduleId: string;
  childUserId: string;
  familyId: string;
  
  // Time limits
  dailyLimitMinutes: number;
  
  // Day-specific overrides
  weekdayLimitMinutes?: number;
  weekendLimitMinutes?: number;
  
  // Allowed hours (24h format)
  allowedStartHour: number;  // e.g., 8 = 8:00 AM
  allowedEndHour: number;    // e.g., 21 = 9:00 PM
  
  // App restrictions
  blockedAppBundleIds?: string[];
  blockedCategories?: AppCategory[];
  
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Usage tracking for reporting
 */
export interface ScreenTimeUsage {
  usageId: string;
  deviceId: string;
  userId: string;
  date: string;  // YYYY-MM-DD
  
  totalMinutes: number;
  byCategory: Record<AppCategory, number>;
  byApp: Array<{
    bundleId: string;
    appName: string;
    minutes: number;
  }>;
}
