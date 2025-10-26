// User and Family Types
export type UserRole = 'admin' | 'parent' | 'child' | 'guardian';
export type UserStatus = 'active' | 'inactive' | 'pending';
export type FamilyRole = 'parent' | 'child' | 'guardian' | 'other';

export interface User {
  id: string;
  userId?: string;
  UserID?: string;
  fullName?: string;
  FirstName?: string;
  LastName?: string;
  email: string;
  Email?: string;
  role: UserRole;
  status?: UserStatus;
  avatar?: string;
  ProfilePhotoUrl?: string;
  familyId: string;
  signupDate?: string;
  CreatedDate?: string;
  lastLogin?: string | null;
  phoneNumber?: string;
  PhoneNumber?: string;
  smsEnabled?: boolean;
  birthDate?: string;
  BirthDate?: string;
  RelationshipID?: number;
}

export interface Family {
  id?: string;
  FamilyID?: number;
  name?: string;
  FamilyName?: string;
  members?: User[];
  createdAt?: string;
  CreatedDate?: string;
  updatedAt?: string;
  UpdatedDate?: string;
  ownerId?: string;
  CreatedByUserID?: string;
  FamilyCrestUrl?: string;
  FamilyMantra?: string;
  FamilyValues?: string[];
  rewardMode?: 'points' | 'screenTime' | 'currency' | 'hybrid';
}

export interface FamilyMember {
  id: string;
  userId: string;
  familyId: string;
  role: FamilyRole;
  permissions: string[];
  joinedAt: string;
  nickname?: string;
  birthDate?: string;
  avatar?: string;
  color?: string;
  status: 'active' | 'inactive';
}

export interface FamilyInvite {
  id: string;
  InvitationID?: number;
  familyId: string;
  FamilyID?: number;
  email: string;
  Email?: string;
  role?: FamilyRole;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  expiresAt: string;
  ExpiresAt?: string;
  Token?: string;
  InvitedBy?: string;
}

export interface FamilySettings {
  id: string;
  familyId: string;
  name: string;
  timezone: string;
  currency: string;
  language: string;
  notificationPreferences: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  privacySettings: {
    shareCalendar: boolean;
    shareBudget: boolean;
    shareLocation: boolean;
  };
}

export interface Relationship {
  RelationshipID: number;
  RelationshipName: string;
}

// Task Types
export type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'approved';

export interface Task {
  id: string;
  title: string;
  description?: string;
  familyId: string;
  assignedTo?: string;
  status: TaskStatus;
  dueDate?: string | Date;
  completedAt?: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  ApprovalStatusID?: number;
  attachments?: TaskAttachment[];
}

export interface TaskAttachment {
  id: number;
  taskId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
  url: string;
}

// Message Types
export interface Message {
  id: string;
  content: string;
  senderId: string;
  chatId: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  type: 'text' | 'image' | 'file';
  metadata?: {
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    imageUrl?: string;
  };
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage?: Message;
  lastMessageAt?: string;
  createdAt: string;
}

// Screen Time Types
export interface ScreenTime {
  id: string;
  userId: string;
  familyId: string;
  appName: string;
  duration: number;
  date: string | Date;
  createdAt?: string | Date;
}

// Gig Types
export interface Gig {
  id: string;
  familyId: string;
  title: string;
  description?: string;
  reward?: number;
  assignedTo?: string;
  status: 'open' | 'assigned' | 'completed';
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

// Room Types
export interface Room {
  id: string;
  familyId: string;
  name: string;
  createdAt?: string | Date;
}

// Shopping List Types
export interface ShoppingList {
  id: string;
  familyId: string;
  title: string;
  items: ShoppingListItem[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface ShoppingListItem {
  id: string;
  text: string;
  completed: boolean;
}

// Recipe and Meal Types
export interface Recipe {
  id: string;
  familyId: string;
  title: string;
  ingredients: string[];
  instructions: string;
  createdAt?: string | Date;
}

export interface Meal {
  id: string;
  familyId: string;
  date: string | Date;
  recipes: string[];
  createdAt?: string | Date;
}

// Wishlist Types
export interface Wishlist {
  id: string;
  familyId: string;
  userId: string;
  items: WishlistItem[];
  createdAt?: string | Date;
}

export interface WishlistItem {
  id: string;
  title: string;
  description?: string;
  url?: string;
  completed: boolean;
}

// Guidelines Types
export interface Guideline {
  id: string;
  name: string;
  description?: string;
  familyId: string;
  createdAt?: string | Date;
}

// Budget Types
export interface Budget {
  id: string;
  familyId: string;
  name: string;
  amount: number;
  spent: number;
  period: 'weekly' | 'monthly' | 'yearly';
  createdAt?: string | Date;
}

// Savings Goal Types
export interface SavingsGoal {
  id: string;
  userId: string;
  familyId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  dueDate?: string | Date;
  createdAt?: string | Date;
}

// ============================================================
// Family Controls (iOS) Types
// ============================================================

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

// Backend Persistence Model
export interface FamilyControlsAccount {
  id?: string;
  userId: string;
  familyId: number;
  authorizationToken?: string;
  tokenExpiresAt?: number;
  screenTimeLimitMinutes?: number;
  dailyScreenTimeMinutes?: number;
  lastSyncAt?: number;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface ScreenTimeRecord {
  id?: string;
  userId: string;
  familyId: number;
  date: string | Date;
  totalMinutesUsed: number;
  dailyLimitMinutes?: number;
  categoryBreakdown?: Record<string, number>;
  appBreakdown?: Record<string, number>;
  createdAt?: string | Date;
}

export interface AuthorizationToken {
  id?: string;
  userId: string;
  targetUserId: string;
  familyId: number;
  token: string;
  grantedScopes: AuthorizationScope[];
  expiresAt: number;
  lastUsedAt?: number;
  usageCount: number;
  isRevoked: boolean;
  revokedAt?: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

