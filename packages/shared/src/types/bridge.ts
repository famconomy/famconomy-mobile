/**
 * WebView ↔ Native Bridge Message Types
 * 
 * These types define the communication protocol between
 * the PWA (running in WebView) and the React Native shell.
 */

import type { NativeSession } from './auth';
import type { ScreenTimeGrant, AppCategory } from './screenTime';

// ============================================================
// Message Direction: PWA → Native
// ============================================================

export type PWAToNativeMessageType =
  | 'BRIDGE_READY'
  | 'AUTH_SESSION_UPDATE'
  | 'AUTH_LOGOUT'
  | 'SCREEN_TIME_REQUEST'
  | 'DEVICE_INFO_REQUEST'
  | 'PUSH_TOKEN_REQUEST'
  | 'NAVIGATION_REQUEST'
  | 'HAPTIC_FEEDBACK'
  | 'SHARE_REQUEST'
  | 'BIOMETRIC_AUTH_REQUEST';

export interface PWAToNativeMessage<T = unknown> {
  id: string;  // Unique message ID for response correlation
  type: PWAToNativeMessageType;
  payload: T;
  timestamp: number;
}

/** Sent when user logs in or session refreshes */
export interface AuthSessionUpdatePayload {
  session: NativeSession;
}

/** Request screen time action */
export interface ScreenTimeRequestPayload {
  action: 'grant' | 'revoke' | 'query' | 'sync';
  childUserId?: string;
  grantId?: string;
  duration?: number;  // minutes
  allowedApps?: string[];
  allowedCategories?: AppCategory[];
}

/** Request device info */
export interface DeviceInfoRequestPayload {
  includePermissions?: boolean;
}

/** Request haptic feedback */
export interface HapticFeedbackPayload {
  type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';
}

/** Request native share sheet */
export interface ShareRequestPayload {
  title?: string;
  message?: string;
  url?: string;
}

/** Request biometric authentication */
export interface BiometricAuthRequestPayload {
  reason: string;
  fallbackToPasscode?: boolean;
}

// ============================================================
// Message Direction: Native → PWA
// ============================================================

export type NativeToPWAMessageType =
  | 'BRIDGE_INITIALIZED'
  | 'AUTH_SESSION_RESTORED'
  | 'SCREEN_TIME_RESPONSE'
  | 'SCREEN_TIME_UPDATE'
  | 'DEVICE_INFO_RESPONSE'
  | 'PUSH_TOKEN_RESPONSE'
  | 'PUSH_NOTIFICATION_RECEIVED'
  | 'DEEP_LINK_RECEIVED'
  | 'BIOMETRIC_AUTH_RESPONSE'
  | 'FAMILY_CONTROLS_STATUS'
  | 'ERROR';

export interface NativeToPWAMessage<T = unknown> {
  id: string;  // Correlates with request ID
  type: NativeToPWAMessageType;
  payload: T;
  timestamp: number;
}

/** Session restored from secure storage on app launch */
export interface AuthSessionRestoredPayload {
  session: NativeSession | null;
  hasValidSession: boolean;
}

/** Response to screen time request */
export interface ScreenTimeResponsePayload {
  success: boolean;
  grants?: ScreenTimeGrant[];
  remainingMinutes?: number;
  error?: string;
}

/** Real-time update from Supabase via native listener */
export interface ScreenTimeUpdatePayload {
  event: 'grant_created' | 'grant_updated' | 'grant_expired' | 'grant_revoked';
  grant: ScreenTimeGrant;
}

/** Device information response */
export interface DeviceInfoResponsePayload {
  deviceId: string;
  platform: 'ios' | 'android';
  deviceName: string;
  deviceModel: string;
  osVersion: string;
  appVersion: string;
  permissions: {
    notifications: 'granted' | 'denied' | 'not_determined';
    familyControls: 'authorized' | 'denied' | 'not_determined';
    screenTime: 'authorized' | 'denied' | 'not_determined';
  };
}

/** Push notification token */
export interface PushTokenResponsePayload {
  token: string | null;
  platform: 'ios' | 'android';
}

/** Push notification received while app is open */
export interface PushNotificationPayload {
  notificationId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/** Deep link received */
export interface DeepLinkPayload {
  url: string;
  path: string;
  params: Record<string, string>;
}

/** Biometric auth result */
export interface BiometricAuthResponsePayload {
  success: boolean;
  error?: string;
}

/** FamilyControls authorization status */
export interface FamilyControlsStatusPayload {
  isAuthorized: boolean;
  isParent: boolean;
  canManageScreenTime: boolean;
  error?: string;
}

/** Error response */
export interface ErrorPayload {
  code: string;
  message: string;
  originalMessageId?: string;
}

// ============================================================
// Bridge Helpers
// ============================================================

/**
 * Creates a unique message ID
 */
export function createMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Type guard to check message type
 */
export function isMessageType<T extends PWAToNativeMessageType>(
  message: PWAToNativeMessage,
  type: T
): message is PWAToNativeMessage<
  T extends 'AUTH_SESSION_UPDATE' ? AuthSessionUpdatePayload :
  T extends 'SCREEN_TIME_REQUEST' ? ScreenTimeRequestPayload :
  T extends 'HAPTIC_FEEDBACK' ? HapticFeedbackPayload :
  unknown
> {
  return message.type === type;
}
