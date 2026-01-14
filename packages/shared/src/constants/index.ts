/**
 * Shared Constants
 */

// API Configuration
export const API_CONFIG = {
  SUPABASE_FUNCTIONS_PATH: '/functions/v1',
  PWA_URL: 'https://app.famconomy.com',
  PWA_URL_DEV: 'http://localhost:5173',
} as const;

// Screen Time Defaults
export const SCREEN_TIME_DEFAULTS = {
  DEFAULT_DAILY_LIMIT_MINUTES: 120,
  MIN_GRANT_MINUTES: 5,
  MAX_GRANT_MINUTES: 240,
  DEFAULT_ALLOWED_START_HOUR: 8,   // 8 AM
  DEFAULT_ALLOWED_END_HOUR: 21,    // 9 PM
  GRANT_EXPIRY_HOURS: 24,
} as const;

// Task Reward Defaults
export const REWARD_DEFAULTS = {
  MIN_SCREENTIME_REWARD_MINUTES: 5,
  MAX_SCREENTIME_REWARD_MINUTES: 60,
  POINTS_TO_MINUTES_RATIO: 10,  // 10 points = 1 minute
} as const;

// WebView Bridge
export const BRIDGE_CONFIG = {
  MESSAGE_TIMEOUT_MS: 30000,
  INJECTED_OBJECT_NAME: 'FamconomyNative',
  PWA_READY_EVENT: 'famconomy:ready',
} as const;

// Deep Link Schemes
export const DEEP_LINK_SCHEMES = {
  IOS: 'famconomy://',
  ANDROID: 'famconomy://',
  UNIVERSAL: 'https://app.famconomy.com',
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  SESSION: '@famconomy/session',
  DEVICE_ID: '@famconomy/device_id',
  PUSH_TOKEN: '@famconomy/push_token',
  ONBOARDING_COMPLETE: '@famconomy/onboarding_complete',
} as const;

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_BIOMETRIC_AUTH: true,
  ENABLE_FAMILY_CONTROLS: true,
  ENABLE_REALTIME_SYNC: true,
  ENABLE_OFFLINE_MODE: false,
} as const;
