/**
 * Device Info Bridge
 * 
 * Provides device information and permission status to the PWA.
 */

import { Platform, NativeModules } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { check, PERMISSIONS, RESULTS } from 'react-native-permissions';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { DeviceInfoResponsePayload } from '@famconomy/shared';
import { STORAGE_KEYS } from '@famconomy/shared';

/**
 * Get or generate a unique device ID
 */
async function getDeviceId(): Promise<string> {
  let deviceId = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);
  
  if (!deviceId) {
    // Generate a new device ID
    deviceId = `${Platform.OS}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
  }
  
  return deviceId;
}

/**
 * Check notification permission status
 * Note: iOS uses different notification API, Android uses POST_NOTIFICATIONS
 */
async function getNotificationPermission(): Promise<'granted' | 'denied' | 'not_determined'> {
  try {
    // On iOS, notification permissions are handled differently
    // We'll return 'not_determined' until FamilyControls implementation
    if (Platform.OS === 'ios') {
      // iOS notification permissions need to be checked via native module
      // For now, return not_determined as a placeholder
      return 'not_determined';
    }
    
    // Android uses POST_NOTIFICATIONS permission
    const permission = PERMISSIONS.ANDROID.POST_NOTIFICATIONS;

    const result = await check(permission);
    
    switch (result) {
      case RESULTS.GRANTED:
      case RESULTS.LIMITED:
        return 'granted';
      case RESULTS.DENIED:
      case RESULTS.BLOCKED:
        return 'denied';
      default:
        return 'not_determined';
    }
  } catch {
    return 'not_determined';
  }
}

/**
 * Check FamilyControls authorization (iOS only)
 */
async function getFamilyControlsPermission(): Promise<'authorized' | 'denied' | 'not_determined'> {
  if (Platform.OS !== 'ios') {
    return 'not_determined';
  }

  try {
    const { FamilyControlsModule } = NativeModules;
    if (!FamilyControlsModule?.getAuthorizationStatus) {
      return 'not_determined';
    }

    const status = await FamilyControlsModule.getAuthorizationStatus();
    return status;
  } catch {
    return 'not_determined';
  }
}

/**
 * Check Screen Time permission (Android Usage Stats)
 */
async function getScreenTimePermission(): Promise<'authorized' | 'denied' | 'not_determined'> {
  if (Platform.OS !== 'android') {
    return getFamilyControlsPermission(); // iOS uses FamilyControls
  }

  try {
    const { UsageStatsModule } = NativeModules;
    if (!UsageStatsModule?.hasPermission) {
      return 'not_determined';
    }

    const hasPermission = await UsageStatsModule.hasPermission();
    return hasPermission ? 'authorized' : 'denied';
  } catch {
    return 'not_determined';
  }
}

/**
 * Get comprehensive device information
 */
export async function getDeviceInfo(): Promise<DeviceInfoResponsePayload> {
  const [
    deviceId,
    deviceName,
    deviceModel,
    osVersion,
    appVersion,
    notificationPermission,
    familyControlsPermission,
    screenTimePermission,
  ] = await Promise.all([
    getDeviceId(),
    DeviceInfo.getDeviceName(),
    DeviceInfo.getModel(),
    DeviceInfo.getSystemVersion(),
    DeviceInfo.getVersion(),
    getNotificationPermission(),
    getFamilyControlsPermission(),
    getScreenTimePermission(),
  ]);

  return {
    deviceId,
    platform: Platform.OS as 'ios' | 'android',
    deviceName,
    deviceModel,
    osVersion,
    appVersion,
    permissions: {
      notifications: notificationPermission,
      familyControls: familyControlsPermission,
      screenTime: screenTimePermission,
    },
  };
}
