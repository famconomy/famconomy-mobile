/**
 * FamilyControls Bridge
 * 
 * TypeScript interface to the native FamilyControls module (iOS)
 * and DevicePolicyManager (Android) for screen time management.
 */

import { Platform, NativeModules, NativeEventEmitter } from 'react-native';

import type {
  ScreenTimeRequestPayload,
  ScreenTimeResponsePayload,
  ScreenTimeGrant,
  AppCategory,
} from '@famconomy/shared';

const { FamilyControlsModule, DevicePolicyModule } = NativeModules;

/**
 * Bridge for screen time management across platforms
 */
export const FamilyControlsBridge = {
  /**
   * Handle screen time request from PWA
   */
  async handleRequest(request: ScreenTimeRequestPayload): Promise<ScreenTimeResponsePayload> {
    const { action, childUserId, duration, allowedApps, allowedCategories } = request;

    try {
      switch (action) {
        case 'grant':
          return await grantScreenTime(childUserId!, duration!, allowedApps, allowedCategories);
        
        case 'revoke':
          return await revokeScreenTime(childUserId!);
        
        case 'query':
          return await queryScreenTime(childUserId!);
        
        case 'sync':
          return await syncWithServer();
        
        default:
          return {
            success: false,
            error: `Unknown action: ${action}`,
          };
      }
    } catch (error) {
      console.error('[FamilyControlsBridge] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Check if FamilyControls is authorized
   */
  async isAuthorized(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      if (!FamilyControlsModule?.isAuthorized) return false;
      return FamilyControlsModule.isAuthorized();
    } else {
      if (!DevicePolicyModule?.isDeviceOwner) return false;
      return DevicePolicyModule.isDeviceOwner();
    }
  },

  /**
   * Request FamilyControls authorization (iOS)
   */
  async requestAuthorization(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      if (!FamilyControlsModule?.requestAuthorization) {
        throw new Error('FamilyControlsModule not available');
      }
      return FamilyControlsModule.requestAuthorization();
    } else {
      // Android requires user to enable in Settings
      throw new Error('Please enable Device Admin in Settings');
    }
  },

  /**
   * Subscribe to screen time updates from native
   */
  subscribe(callback: (grant: ScreenTimeGrant) => void): () => void {
    const moduleName = Platform.OS === 'ios' ? 'FamilyControlsModule' : 'DevicePolicyModule';
    const nativeModule = Platform.OS === 'ios' ? FamilyControlsModule : DevicePolicyModule;
    
    if (!nativeModule) {
      console.warn('[FamilyControlsBridge] Native module not available');
      return () => {};
    }

    const emitter = new NativeEventEmitter(nativeModule);
    const subscription = emitter.addListener('onScreenTimeUpdate', callback);
    
    return () => subscription.remove();
  },
};

/**
 * Grant screen time to a child
 */
async function grantScreenTime(
  childUserId: string,
  durationMinutes: number,
  allowedApps?: string[],
  allowedCategories?: AppCategory[]
): Promise<ScreenTimeResponsePayload> {
  if (Platform.OS === 'ios') {
    if (!FamilyControlsModule?.grantScreenTime) {
      return { success: false, error: 'FamilyControls not available' };
    }

    const result = await FamilyControlsModule.grantScreenTime({
      childUserId,
      durationMinutes,
      allowedBundleIds: allowedApps,
      allowedCategories: allowedCategories?.map(c => mapCategoryToiOS(c)),
    });

    return {
      success: result.success,
      remainingMinutes: result.remainingMinutes,
      error: result.error,
    };
  } else {
    if (!DevicePolicyModule?.grantScreenTime) {
      return { success: false, error: 'DevicePolicy not available' };
    }

    const result = await DevicePolicyModule.grantScreenTime({
      childUserId,
      durationMinutes,
      allowedPackages: allowedApps,
    });

    return {
      success: result.success,
      remainingMinutes: result.remainingMinutes,
      error: result.error,
    };
  }
}

/**
 * Revoke screen time from a child
 */
async function revokeScreenTime(childUserId: string): Promise<ScreenTimeResponsePayload> {
  const module = Platform.OS === 'ios' ? FamilyControlsModule : DevicePolicyModule;
  
  if (!module?.revokeScreenTime) {
    return { success: false, error: 'Screen time module not available' };
  }

  const result = await module.revokeScreenTime({ childUserId });
  return {
    success: result.success,
    remainingMinutes: 0,
    error: result.error,
  };
}

/**
 * Query current screen time status
 */
async function queryScreenTime(childUserId: string): Promise<ScreenTimeResponsePayload> {
  const module = Platform.OS === 'ios' ? FamilyControlsModule : DevicePolicyModule;
  
  if (!module?.getScreenTimeStatus) {
    return { success: false, error: 'Screen time module not available' };
  }

  const result = await module.getScreenTimeStatus({ childUserId });
  return {
    success: true,
    remainingMinutes: result.remainingMinutes,
    grants: result.activeGrants,
  };
}

/**
 * Sync local state with server
 */
async function syncWithServer(): Promise<ScreenTimeResponsePayload> {
  // This will be called to refresh grants from Supabase
  // Implementation depends on Supabase Realtime subscription
  return { success: true };
}

/**
 * Sync a specific grant from the server to the native layer.
 * This uses Codex's new syncGrantFromServer native method for
 * direct persistence and enforcement.
 */
export async function syncGrantFromServer(grant: ScreenTimeGrant): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') {
      if (!FamilyControlsModule?.syncGrantFromServer) {
        console.warn('[FamilyControlsBridge] syncGrantFromServer not available on iOS');
        return false;
      }
      
      // Map to format expected by native module
      const nativeGrant = {
        grantId: grant.grantId,
        childUserId: grant.childUserId,
        durationMinutes: grant.grantedMinutes,
        expiresAt: grant.expiresAt,
        allowedBundleIds: grant.allowedAppBundleIds,
        allowedCategories: grant.allowedCategories?.map(c => mapCategoryToiOS(c)),
        status: grant.status,
      };
      
      const result = await FamilyControlsModule.syncGrantFromServer(nativeGrant);
      return result?.success ?? false;
      
    } else if (Platform.OS === 'android') {
      if (!DevicePolicyModule?.syncGrantFromServer) {
        console.warn('[FamilyControlsBridge] syncGrantFromServer not available on Android');
        return false;
      }
      
      const nativeGrant = {
        grantId: grant.grantId,
        childUserId: grant.childUserId,
        durationMinutes: grant.grantedMinutes,
        expiresAt: grant.expiresAt,
        allowedPackages: grant.allowedAppBundleIds,
        status: grant.status,
      };
      
      const result = await DevicePolicyModule.syncGrantFromServer(nativeGrant);
      return result?.success ?? false;
    }
    
    return false;
  } catch (error) {
    console.error('[FamilyControlsBridge] syncGrantFromServer error:', error);
    return false;
  }
}

/**
 * Map app category to iOS FamilyControls category
 */
function mapCategoryToiOS(category: AppCategory): string {
  const mapping: Record<AppCategory, string> = {
    games: 'games',
    social: 'socialNetworking',
    entertainment: 'entertainment',
    education: 'education',
    productivity: 'productivity',
    all: 'all',
  };
  return mapping[category] || 'all';
}
