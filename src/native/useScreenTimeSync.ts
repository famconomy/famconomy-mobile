/**
 * Screen Time Sync Hook
 * 
 * React hook for managing screen time sync lifecycle in child accounts.
 */

import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { 
  startScreenTimeSync, 
  stopScreenTimeSync, 
  fetchActiveGrants 
} from './ScreenTimeRealtimeSync';
import { FamilyControlsBridge } from './FamilyControlsBridge';
import type { ScreenTimeGrant, UserRole } from '@famconomy/shared';

interface UseScreenTimeSyncOptions {
  userId: string;
  role: UserRole;
  enabled?: boolean;
}

export function useScreenTimeSync({ userId, role, enabled = true }: UseScreenTimeSyncOptions) {
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isChildAccount = role === 'child';

  /**
   * Start sync when app becomes active
   */
  const startSync = useCallback(async () => {
    if (!enabled || !isChildAccount) return;

    try {
      // Fetch current grants first
      const grants = await fetchActiveGrants(userId);
      
      // Apply any active grants to native module
      for (const grant of grants) {
        if (grant.status === 'active') {
          await FamilyControlsBridge.handleRequest({
            action: 'grant',
            childUserId: grant.childUserId,
            duration: grant.remainingMinutes,
            allowedApps: grant.allowedAppBundleIds,
            allowedCategories: grant.allowedCategories,
          });
        }
      }

      // Start realtime subscription
      unsubscribeRef.current = await startScreenTimeSync(userId);
      console.log('[useScreenTimeSync] Sync started for user:', userId);
    } catch (error) {
      console.error('[useScreenTimeSync] Failed to start sync:', error);
    }
  }, [userId, role, enabled, isChildAccount]);

  /**
   * Stop sync when app goes to background
   */
  const stopSync = useCallback(async () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    await stopScreenTimeSync();
    console.log('[useScreenTimeSync] Sync stopped');
  }, []);

  /**
   * Handle app state changes
   */
  useEffect(() => {
    if (!enabled || !isChildAccount) return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        startSync();
      } else if (nextAppState === 'background') {
        // Keep sync running in background for realtime updates
        // Native module will handle enforcement
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Start sync on mount
    startSync();

    return () => {
      subscription.remove();
      stopSync();
    };
  }, [enabled, isChildAccount, startSync, stopSync]);

  /**
   * Manually refresh grants
   */
  const refreshGrants = useCallback(async (): Promise<ScreenTimeGrant[]> => {
    if (!isChildAccount) return [];
    return fetchActiveGrants(userId);
  }, [userId, isChildAccount]);

  return {
    isEnabled: enabled && isChildAccount,
    refreshGrants,
    stopSync,
  };
}
