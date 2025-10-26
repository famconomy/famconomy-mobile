/**
 * Family Controls Types (Mobile)
 * Re-exports from shared package for mobile app
 * These types mirror the shared package types for local use
 */

// Authorization Types
export type AuthorizationScope = 'screenTime' | 'deviceControl' | 'appBlock' | 'all';
export type UserRole_FC = 'admin' | 'parent' | 'guardian' | 'child' | 'none';

export interface AuthorizationRequest {
  targetUserId: string;
  scope: AuthorizationScope[];
  reason?: string;
  requesterRole: UserRole_FC;
  requestExpiresIn?: number; // minutes
}

export interface AuthorizationResult {
  authorized: boolean;
  authorizationToken?: string;
  grantedScopes: AuthorizationScope[];
  expiresAt?: number; // UNIX timestamp
  requiresUserConsent: boolean;
  consentUrl?: string;
  sessionId: string;
  timestamp: number;
}

export interface AuthorizationStatus {
  authorized: boolean;
  token: string;
  grantedScopes: AuthorizationScope[];
  expiresAt: number;
  isExpired: boolean;
  daysUntilExpiration?: number;
  requiresRenewal: boolean;
  lastUsedAt?: number;
  usageCount: number;
  targetUserId: string;
  grantedByUserId: string;
  grantedAt: number;
  timestamp: number;
}

// Screen Time Types
export interface ScreenTimeSchedule {
  targetUserId: string;
  dailyLimitMinutes?: number;
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  appliedDays?: string[]; // ["MON", "TUE", ...]
  categoryLimits?: CategoryLimit[];
  allowOverrides: boolean;
  overrideApproverId?: string;
  metadata?: Record<string, string>;
}

export interface CategoryLimit {
  category: string; // "Social", "Gaming", "Productivity"
  dailyMinutes: number;
  weeklyMinutes?: number;
}

export interface ScreenTimeStatus {
  userId: string;
  today: DailyStats;
  thisWeek: WeeklyStats;
  thisMonth: MonthlyStats;
  limits?: ScreenTimeLimits;
  warnings?: WarningInfo[];
  prediction?: UsagePrediction;
  lastUpdated: number;
  timestamp: number;
}

export interface DailyStats {
  totalMinutesUsed: number;
  limitMinutes?: number;
  percentageUsed: number;
  categoryBreakdown: Record<string, number>; // category -> minutes
  appBreakdown?: Record<string, number>; // bundle ID -> minutes
  lastActiveTime?: number;
}

export interface WeeklyStats {
  totalMinutesUsed: number;
  dailyAverage: number;
  highestDay?: { day: string; minutes: number };
  lowestDay?: { day: string; minutes: number };
  trendPercentage: number;
}

export interface MonthlyStats {
  totalMinutesUsed: number;
  dailyAverage: number;
  weeklyAverage: number;
}

export interface ScreenTimeLimits {
  dailyMinutes: number;
  appliedDays: string[];
  startTime?: string;
  endTime?: string;
}

export interface WarningInfo {
  type: string; // "THRESHOLD_80", "LIMIT_REACHED", "SCHEDULE_START"
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestedAction?: string;
  timestamp: number;
}

export interface UsagePrediction {
  predictedTotalMinutes: number;
  confidence: number; // 0.0-1.0
  overtimeMinutes?: number;
  estimatedLimitHitTime?: string; // HH:mm
}

// Device Control Types
export interface DeviceStatus {
  deviceId: string;
  deviceName: string;
  osVersion: string;
  isLocked: boolean;
  blockedApps: AppBlockStatus[];
  contentRestrictions: ContentRestrictionStatus;
  lastModifiedAt: number;
  timestamp: number;
}

export interface AppBlockStatus {
  bundleId: string;
  appName: string;
  isBlocked: boolean;
  blockedUntil?: number;
  reason?: string;
}

export interface ContentRestrictionStatus {
  webContentRestricted: boolean;
  explicitContent: boolean;
  purchasesRestricted: boolean;
  siriRestricted: boolean;
}

// Error Types
export interface FamilyControlsError {
  code: string; // e.g., "AUTH_002"
  message: string;
  domain: 'Authorization' | 'Schedule' | 'Status' | 'Network' | 'Validation' | 'System';
  statusCode?: number;
  underlyingError?: string;
  retryable: boolean;
  retryAfterSeconds?: number;
  userFriendlyMessage: string;
  timestamp: number;
}

// Event Types
export type FamilyControlsEventType =
  | 'AUTHORIZATION_GRANTED'
  | 'AUTHORIZATION_REVOKED'
  | 'AUTHORIZATION_EXPIRED'
  | 'SCREEN_TIME_WARNING'
  | 'SCHEDULE_ACTIVATED'
  | 'DEVICE_LOCKED'
  | 'APP_BLOCKED'
  | 'POLLING_ERROR'
  | 'POLLING_RECOVERED'
  | 'MODULE_ERROR';

export interface FamilyControlsEvent<T = any> {
  type: FamilyControlsEventType;
  data: T;
  timestamp: number;
}

export interface AuthorizationGrantedEvent {
  authorizationToken: string;
  grantedByUserId: string;
  targetUserId: string;
  grantedScopes: AuthorizationScope[];
  expiresAt: number;
  timestamp: number;
}

export interface AuthorizationRevokedEvent {
  authorizationToken: string;
  revokedByUserId: string;
  revokedAt: number;
  reason?: string;
  timestamp: number;
}

export interface ScreenTimeWarningEvent {
  userId: string;
  warningType: string; // "THRESHOLD_20", "THRESHOLD_50", "THRESHOLD_80", "LIMIT_REACHED"
  remainingMinutes: number;
  usagePercentage: number; // 0-100
  suggestedAction?: string;
  timestamp: number;
}

export interface ScheduleActivatedEvent {
  scheduleId: string;
  targetUserId: string;
  type: string; // "TIME_LIMIT", "DOWNTIME", "BREAK"
  details: Record<string, any>;
  timestamp: number;
}

export interface DeviceLockedEvent {
  deviceId: string;
  lockReason: string; // "LIMIT_REACHED", "MANUAL", "SCHEDULE"
  unlockAt?: number;
  timestamp: number;
}

export interface AppBlockedEvent {
  bundleId: string;
  appName: string;
  blockReason: string;
  blockedUntil?: number;
  timestamp: number;
}

// Polling Types
export interface PollingOptions {
  intervalSeconds: number; // 60-3600
  userIds?: string[]; // nil = current user
  includeEvents: boolean;
  backoffStrategy?: 'exponential' | 'linear' | 'fixed';
  maxAttempts?: number;
}

export interface PollingResult {
  success: boolean;
  pollingId: string;
  startedAt: number;
  nextPollAt: number;
  message?: string;
}

// Module Initialization
export interface InitConfig {
  userId: string;
  familyId: number;
  userRole: UserRole_FC;
  apiBaseUrl: string;
  apiToken: string;
  enablePersistence: boolean;
  enablePolling: boolean;
  pollingIntervalSeconds: number;
}

export interface InitializationResult {
  success: boolean;
  moduleVersion: string;
  osVersion: string;
  frameworksAvailable: string[];
  sessionId: string;
  message?: string;
  timestamp: number;
}
