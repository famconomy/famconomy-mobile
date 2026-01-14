/**
 * Android Permissions Helper
 * 
 * Handles checking and requesting special Android permissions
 * required for screen time management.
 */

import { Platform, NativeModules, Linking, Alert } from 'react-native';

const { DevicePolicyModule } = NativeModules;

export interface AndroidPermissionStatus {
  usageStats: boolean;
  overlay: boolean;
  deviceAdmin: boolean;
  allGranted: boolean;
}

/**
 * Check if all required Android permissions are granted
 */
export async function checkAndroidPermissions(): Promise<AndroidPermissionStatus> {
  if (Platform.OS !== 'android') {
    return { usageStats: true, overlay: true, deviceAdmin: true, allGranted: true };
  }

  const usageStats = await checkUsageStatsPermission();
  const overlay = await checkOverlayPermission();
  const deviceAdmin = await checkDeviceAdminPermission();

  return {
    usageStats,
    overlay,
    deviceAdmin,
    allGranted: usageStats && overlay && deviceAdmin,
  };
}

/**
 * Check if Usage Stats permission is granted
 */
async function checkUsageStatsPermission(): Promise<boolean> {
  if (!DevicePolicyModule?.hasUsageStatsPermission) {
    return false;
  }
  return DevicePolicyModule.hasUsageStatsPermission();
}

/**
 * Check if Overlay permission is granted
 */
async function checkOverlayPermission(): Promise<boolean> {
  if (!DevicePolicyModule?.hasOverlayPermission) {
    return false;
  }
  return DevicePolicyModule.hasOverlayPermission();
}

/**
 * Check if Device Admin is enabled
 */
async function checkDeviceAdminPermission(): Promise<boolean> {
  if (!DevicePolicyModule?.isAuthorized) {
    return false;
  }
  return DevicePolicyModule.isAuthorized();
}

/**
 * Open Usage Stats settings
 */
export function openUsageStatsSettings(): void {
  if (Platform.OS === 'android') {
    Linking.sendIntent('android.settings.USAGE_ACCESS_SETTINGS');
  }
}

/**
 * Open Overlay permission settings
 */
export function openOverlaySettings(): void {
  if (Platform.OS === 'android') {
    Linking.sendIntent('android.settings.action.MANAGE_OVERLAY_PERMISSION');
  }
}

/**
 * Request Device Admin permission
 */
export async function requestDeviceAdmin(): Promise<boolean> {
  if (!DevicePolicyModule?.requestAuthorization) {
    return false;
  }
  return DevicePolicyModule.requestAuthorization();
}

/**
 * Show a guided permission flow dialog
 */
export async function showPermissionsGuide(
  onComplete: () => void
): Promise<void> {
  const status = await checkAndroidPermissions();
  
  if (status.allGranted) {
    onComplete();
    return;
  }

  const missingPermissions: string[] = [];
  if (!status.deviceAdmin) missingPermissions.push('Device Admin');
  if (!status.usageStats) missingPermissions.push('Usage Access');
  if (!status.overlay) missingPermissions.push('Display over apps');

  Alert.alert(
    'Permissions Required',
    `To manage screen time, FamConomy needs the following permissions:\n\n• ${missingPermissions.join('\n• ')}\n\nYou'll be guided through each setting.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Continue', 
        onPress: () => requestPermissionsSequentially(status, onComplete)
      },
    ]
  );
}

/**
 * Request permissions one by one
 */
async function requestPermissionsSequentially(
  status: AndroidPermissionStatus,
  onComplete: () => void
): Promise<void> {
  // Step 1: Device Admin
  if (!status.deviceAdmin) {
    Alert.alert(
      'Step 1: Device Admin',
      'Enable FamConomy as a device administrator to control app access.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Settings', 
          onPress: async () => {
            await requestDeviceAdmin();
            // Continue after a delay (user may still be in settings)
            setTimeout(() => checkAndContinue('usageStats', status, onComplete), 2000);
          }
        },
      ]
    );
    return;
  }

  // Step 2: Usage Stats
  if (!status.usageStats) {
    Alert.alert(
      'Step 2: Usage Access',
      'Allow FamConomy to view app usage to track screen time.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Settings', 
          onPress: () => {
            openUsageStatsSettings();
            setTimeout(() => checkAndContinue('overlay', status, onComplete), 2000);
          }
        },
      ]
    );
    return;
  }

  // Step 3: Overlay
  if (!status.overlay) {
    Alert.alert(
      'Step 3: Display Over Apps',
      'Allow FamConomy to display over other apps to block access when screen time expires.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Settings', 
          onPress: () => {
            openOverlaySettings();
            setTimeout(() => checkAndComplete(onComplete), 2000);
          }
        },
      ]
    );
    return;
  }

  onComplete();
}

async function checkAndContinue(
  nextStep: 'usageStats' | 'overlay',
  originalStatus: AndroidPermissionStatus,
  onComplete: () => void
): Promise<void> {
  const newStatus = await checkAndroidPermissions();
  
  if (nextStep === 'usageStats' && !newStatus.usageStats) {
    requestPermissionsSequentially({ ...originalStatus, deviceAdmin: true }, onComplete);
  } else if (nextStep === 'overlay' && !newStatus.overlay) {
    requestPermissionsSequentially({ ...originalStatus, deviceAdmin: true, usageStats: true }, onComplete);
  } else {
    checkAndComplete(onComplete);
  }
}

async function checkAndComplete(onComplete: () => void): Promise<void> {
  const finalStatus = await checkAndroidPermissions();
  
  if (finalStatus.allGranted) {
    Alert.alert('Success', 'All permissions granted! FamConomy can now manage screen time.');
    onComplete();
  } else {
    Alert.alert(
      'Permissions Incomplete',
      'Some permissions were not granted. Screen time management may not work correctly.',
      [
        { text: 'Try Again', onPress: () => showPermissionsGuide(onComplete) },
        { text: 'Continue Anyway', onPress: onComplete },
      ]
    );
  }
}
