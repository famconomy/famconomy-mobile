/**
 * @famconomy/shared
 * 
 * Shared types and constants for FamConomy web and mobile apps.
 * Provides type-safe communication between PWA and React Native shell.
 */

// Auth types
export type {
  UserRole,
  UserStatus,
  User,
  Profile,
  UserPreferences,
  Session,
  AuthCredentials,
  AuthResponse,
  NativeSession,
} from './types/auth';

// Family types
export type {
  Family,
  FamilyMember,
  FamilyInvite,
  FamilySettings,
} from './types/family';

// Task types
export type {
  TaskStatus,
  TaskCategory,
  TaskPriority,
  RecurrenceType,
  RewardType,
  Task,
  TaskCompletion,
  TaskCompletedEvent,
} from './types/tasks';

// Screen time types
export type {
  ScreenTimeGrantStatus,
  DevicePlatform,
  ScreenTimeGrant,
  AppCategory,
  ManagedDevice,
  ScreenTimeSchedule,
  ScreenTimeUsage,
} from './types/screenTime';

// Bridge types - PWA to Native
export type {
  PWAToNativeMessageType,
  PWAToNativeMessage,
  AuthSessionUpdatePayload,
  ScreenTimeRequestPayload,
  DeviceInfoRequestPayload,
  HapticFeedbackPayload,
  ShareRequestPayload,
  BiometricAuthRequestPayload,
} from './types/bridge';

// Bridge types - Native to PWA
export type {
  NativeToPWAMessageType,
  NativeToPWAMessage,
  AuthSessionRestoredPayload,
  ScreenTimeResponsePayload,
  ScreenTimeUpdatePayload,
  DeviceInfoResponsePayload,
  PushTokenResponsePayload,
  PushNotificationPayload,
  DeepLinkPayload,
  BiometricAuthResponsePayload,
  FamilyControlsStatusPayload,
  ErrorPayload,
} from './types/bridge';

// Bridge helpers
export { createMessageId, isMessageType } from './types/bridge';

// Constants
export {
  API_CONFIG,
  SCREEN_TIME_DEFAULTS,
  REWARD_DEFAULTS,
  BRIDGE_CONFIG,
  DEEP_LINK_SCHEMES,
  STORAGE_KEYS,
  FEATURE_FLAGS,
} from './constants';
