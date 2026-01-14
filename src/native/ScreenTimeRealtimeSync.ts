/**
 * Screen Time Realtime Sync
 * 
 * Subscribes to Supabase Realtime for screen time grant updates
 * and syncs them to the native FamilyControls module.
 */

import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { AuthStorage } from '../auth/useAuthBridge';
import { FamilyControlsBridge, syncGrantFromServer } from './FamilyControlsBridge';
import type { ScreenTimeGrant } from '@famconomy/shared';
import { API_CONFIG } from '@famconomy/shared';

let realtimeChannel: RealtimeChannel | null = null;
let supabaseClient: ReturnType<typeof createClient> | null = null;

interface ScreenTimeGrantRow {
  GrantID: string;
  ChildUserID: string;
  FamilyID: string;
  GrantedMinutes: number;
  UsedMinutes: number;
  Status: string;
  GrantedAt: string;
  ExpiresAt: string;
  RevokedAt: string | null;
  SourceTaskID: string | null;
  GrantedByUserID: string;
  AllowedAppBundleIds: string[] | null;
  AllowedCategories: string[] | null;
}

/**
 * Initialize Supabase client for realtime subscriptions
 */
async function initSupabaseClient(): Promise<ReturnType<typeof createClient> | null> {
  if (supabaseClient) return supabaseClient;

  const session = await AuthStorage.getStoredSession();
  if (!session) {
    console.log('[ScreenTimeSync] No session, cannot initialize Supabase');
    return null;
  }

  // Get Supabase URL and key from environment or use defaults
  const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[ScreenTimeSync] Missing Supabase configuration');
    return null;
  }

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false, // We manage session ourselves
    },
    global: {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    },
  });

  return supabaseClient;
}

/**
 * Map database row to ScreenTimeGrant type
 */
function mapRowToGrant(row: ScreenTimeGrantRow): ScreenTimeGrant {
  return {
    grantId: row.GrantID,
    childUserId: row.ChildUserID,
    familyId: row.FamilyID,
    grantedMinutes: row.GrantedMinutes,
    usedMinutes: row.UsedMinutes,
    remainingMinutes: row.GrantedMinutes - row.UsedMinutes,
    status: row.Status as ScreenTimeGrant['status'],
    grantedAt: row.GrantedAt,
    expiresAt: row.ExpiresAt,
    revokedAt: row.RevokedAt || undefined,
    sourceTaskId: row.SourceTaskID || undefined,
    grantedByUserId: row.GrantedByUserID,
    allowedAppBundleIds: row.AllowedAppBundleIds || undefined,
    allowedCategories: row.AllowedCategories as ScreenTimeGrant['allowedCategories'],
  };
}

/**
 * Start listening for screen time grant updates for a child user
 */
export async function startScreenTimeSync(childUserId: string): Promise<() => void> {
  const client = await initSupabaseClient();
  if (!client) {
    console.error('[ScreenTimeSync] Failed to initialize Supabase client');
    return () => {};
  }

  // Unsubscribe from any existing channel
  if (realtimeChannel) {
    await realtimeChannel.unsubscribe();
  }

  console.log('[ScreenTimeSync] Starting sync for child:', childUserId);

  // Subscribe to screen_time_grants table changes for this child
  realtimeChannel = client
    .channel(`screen_time_grants:${childUserId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'screen_time_grants',
        filter: `ChildUserID=eq.${childUserId}`,
      },
      async (payload) => {
        console.log('[ScreenTimeSync] Received update:', payload.eventType);

        const grant = mapRowToGrant(payload.new as ScreenTimeGrantRow);

        switch (payload.eventType) {
          case 'INSERT':
            await handleGrantCreated(grant);
            break;
          case 'UPDATE':
            await handleGrantUpdated(grant);
            break;
          case 'DELETE':
            await handleGrantDeleted(payload.old as ScreenTimeGrantRow);
            break;
        }
      }
    )
    .subscribe((status) => {
      console.log('[ScreenTimeSync] Subscription status:', status);
    });

  // Return unsubscribe function
  return () => {
    if (realtimeChannel) {
      realtimeChannel.unsubscribe();
      realtimeChannel = null;
    }
  };
}

/**
 * Handle new screen time grant
 */
async function handleGrantCreated(grant: ScreenTimeGrant): Promise<void> {
  console.log('[ScreenTimeSync] Grant created:', grant.grantId);

  if (grant.status === 'active') {
    // Use syncGrantFromServer for direct native persistence and enforcement
    const synced = await syncGrantFromServer(grant);

    if (!synced) {
      console.warn('[ScreenTimeSync] Failed to sync grant via syncGrantFromServer, falling back');
      // Fallback to handleRequest if native method unavailable
      await FamilyControlsBridge.handleRequest({
        action: 'grant',
        childUserId: grant.childUserId,
        duration: grant.remainingMinutes,
        allowedApps: grant.allowedAppBundleIds,
        allowedCategories: grant.allowedCategories,
      });
    }
  }
}

/**
 * Handle screen time grant update
 */
async function handleGrantUpdated(grant: ScreenTimeGrant): Promise<void> {
  console.log('[ScreenTimeSync] Grant updated:', grant.grantId, 'status:', grant.status);

  switch (grant.status) {
    case 'active':
      // Use syncGrantFromServer for direct native sync
      const synced = await syncGrantFromServer(grant);

      if (!synced) {
        console.warn('[ScreenTimeSync] Failed to sync update via syncGrantFromServer, falling back');
        await FamilyControlsBridge.handleRequest({
          action: 'grant',
          childUserId: grant.childUserId,
          duration: grant.remainingMinutes,
          allowedApps: grant.allowedAppBundleIds,
          allowedCategories: grant.allowedCategories,
        });
      }
      break;

    case 'expired':
    case 'revoked':
      // Remove access
      await FamilyControlsBridge.handleRequest({
        action: 'revoke',
        childUserId: grant.childUserId,
      });
      break;
  }
}

/**
 * Handle screen time grant deletion
 */
async function handleGrantDeleted(oldGrant: ScreenTimeGrantRow): Promise<void> {
  console.log('[ScreenTimeSync] Grant deleted:', oldGrant.GrantID);

  // Revoke access when grant is deleted
  await FamilyControlsBridge.handleRequest({
    action: 'revoke',
    childUserId: oldGrant.ChildUserID,
  });
}

/**
 * Fetch current active grants for a child
 */
export async function fetchActiveGrants(childUserId: string): Promise<ScreenTimeGrant[]> {
  const client = await initSupabaseClient();
  if (!client) return [];

  const { data, error } = await client
    .from('screen_time_grants')
    .select('*')
    .eq('ChildUserID', childUserId)
    .eq('Status', 'active')
    .gte('ExpiresAt', new Date().toISOString());

  if (error) {
    console.error('[ScreenTimeSync] Error fetching grants:', error);
    return [];
  }

  return (data || []).map(mapRowToGrant);
}

/**
 * Stop all realtime subscriptions
 */
export async function stopScreenTimeSync(): Promise<void> {
  if (realtimeChannel) {
    await realtimeChannel.unsubscribe();
    realtimeChannel = null;
  }
  supabaseClient = null;
}
