/**
 * Native Module Exports
 */

// Screen Time Management
export { FamilyControlsBridge, syncGrantFromServer } from './FamilyControlsBridge';
export { getDeviceInfo } from './DeviceInfoBridge';
export { 
  startScreenTimeSync, 
  stopScreenTimeSync, 
  fetchActiveGrants 
} from './ScreenTimeRealtimeSync';
export { useScreenTimeSync } from './useScreenTimeSync';

// Push Notifications
export {
  initializePushNotifications,
  setNotificationHandler,
  clearNotificationHandler,
  getRegisteredToken,
  setBadgeCount,
  clearAllNotifications,
  unregisterPushNotifications,
} from './PushNotificationsBridge';
export type { PushNotificationPayload } from './PushNotificationsBridge';

// Deep Links
export {
  initializeDeepLinks,
  routeToPwaUrl,
  createDeepLink,
  createUniversalLink,
  canOpenDeepLink,
  openExternalUrl,
  DEEP_LINK_PATHS,
} from './DeepLinkHandler';
export type { DeepLinkRoute } from './DeepLinkHandler';

// Android Permissions
export {
  checkAndroidPermissions,
  openUsageStatsSettings,
  openOverlaySettings,
  requestDeviceAdmin,
  showPermissionsGuide,
} from './AndroidPermissionsHelper';
export type { AndroidPermissionStatus } from './AndroidPermissionsHelper';

// Biometrics
export {
  authenticate,
  getBiometryType,
} from './BiometricsBridge';
export type { BiometricAuthRequest } from './BiometricsBridge';
