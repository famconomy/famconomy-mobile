/**
 * Push Notifications Bridge
 * 
 * Handles push notification registration and handling for both platforms.
 * Uses Supabase Edge Functions for sending notifications.
 */

import { Platform, NativeModules, NativeEventEmitter, PermissionsAndroid } from 'react-native';
import { AuthStorage } from '../auth/useAuthBridge';

// React Native's built-in PushNotificationIOS or use react-native-push-notification
const { PushNotificationModule } = NativeModules;

export interface PushNotificationPayload {
  type: 'task_completed' | 'screen_time_granted' | 'task_approved' | 'task_rejected' | 'family_invite';
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface NotificationHandler {
  onNotificationReceived: (notification: PushNotificationPayload) => void;
  onNotificationOpened: (notification: PushNotificationPayload) => void;
}

let notificationHandler: NotificationHandler | null = null;
let deviceToken: string | null = null;

/**
 * Initialize push notifications and request permissions
 */
export async function initializePushNotifications(): Promise<string | null> {
  try {
    // Request permissions
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.warn('[PushNotifications] Permission denied');
      return null;
    }

    // Get device token
    deviceToken = await getDeviceToken();
    if (!deviceToken) {
      console.error('[PushNotifications] Failed to get device token');
      return null;
    }

    // Register token with Supabase
    await registerTokenWithServer(deviceToken);

    // Set up notification listeners
    setupNotificationListeners();

    console.log('[PushNotifications] Initialized successfully');
    return deviceToken;
  } catch (error) {
    console.error('[PushNotifications] Initialization failed:', error);
    return null;
  }
}

/**
 * Request notification permission from user
 */
async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    // iOS uses native permission request
    if (!PushNotificationModule?.requestPermissions) {
      console.warn('[PushNotifications] Native module not available');
      return false;
    }
    
    const result = await PushNotificationModule.requestPermissions({
      alert: true,
      badge: true,
      sound: true,
    });
    
    return result.alert || result.badge || result.sound;
  } else {
    // Android 13+ requires runtime permission
    if (Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true; // Android < 13 doesn't need permission
  }
}

/**
 * Get the device push token (APNs for iOS, FCM for Android)
 */
async function getDeviceToken(): Promise<string | null> {
  if (!PushNotificationModule?.getDeviceToken) {
    console.warn('[PushNotifications] getDeviceToken not available');
    return null;
  }

  try {
    const token = await PushNotificationModule.getDeviceToken();
    return token;
  } catch (error) {
    console.error('[PushNotifications] Failed to get token:', error);
    return null;
  }
}

/**
 * Register push token with Supabase backend
 */
async function registerTokenWithServer(token: string): Promise<void> {
  const session = await AuthStorage.getStoredSession();
  if (!session) {
    console.warn('[PushNotifications] No session, cannot register token');
    return;
  }

  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/register-push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({
        token,
        platform: Platform.OS,
        deviceId: await getDeviceId(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to register token: ${response.status}`);
    }

    console.log('[PushNotifications] Token registered with server');
  } catch (error) {
    console.error('[PushNotifications] Failed to register token:', error);
  }
}

/**
 * Get unique device identifier
 */
async function getDeviceId(): Promise<string> {
  if (PushNotificationModule?.getDeviceId) {
    return PushNotificationModule.getDeviceId();
  }
  // Fallback to a generated ID stored in secure storage
  return 'unknown-device';
}

/**
 * Set up notification event listeners
 */
function setupNotificationListeners(): void {
  if (!PushNotificationModule) return;

  const emitter = new NativeEventEmitter(PushNotificationModule);

  // Notification received while app is in foreground
  emitter.addListener('onNotificationReceived', (notification: PushNotificationPayload) => {
    console.log('[PushNotifications] Received:', notification);
    notificationHandler?.onNotificationReceived(notification);
  });

  // User tapped on notification
  emitter.addListener('onNotificationOpened', (notification: PushNotificationPayload) => {
    console.log('[PushNotifications] Opened:', notification);
    notificationHandler?.onNotificationOpened(notification);
  });
}

/**
 * Set handler for notification events
 */
export function setNotificationHandler(handler: NotificationHandler): void {
  notificationHandler = handler;
}

/**
 * Clear notification handler
 */
export function clearNotificationHandler(): void {
  notificationHandler = null;
}

/**
 * Get current device token (if registered)
 */
export function getRegisteredToken(): string | null {
  return deviceToken;
}

/**
 * Update badge count (iOS only)
 */
export async function setBadgeCount(count: number): Promise<void> {
  if (Platform.OS === 'ios' && PushNotificationModule?.setBadgeCount) {
    await PushNotificationModule.setBadgeCount(count);
  }
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications(): Promise<void> {
  if (PushNotificationModule?.clearAllNotifications) {
    await PushNotificationModule.clearAllNotifications();
  }
}

/**
 * Unregister device from push notifications (e.g., on logout)
 */
export async function unregisterPushNotifications(): Promise<void> {
  if (!deviceToken) return;

  const session = await AuthStorage.getStoredSession();
  if (!session) return;

  try {
    await fetch(`${process.env.SUPABASE_URL}/functions/v1/unregister-push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({
        token: deviceToken,
      }),
    });

    deviceToken = null;
    console.log('[PushNotifications] Unregistered successfully');
  } catch (error) {
    console.error('[PushNotifications] Failed to unregister:', error);
  }
}
