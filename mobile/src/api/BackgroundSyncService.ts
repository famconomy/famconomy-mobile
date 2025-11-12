// Background Syncing Service - Offline Support, Data Synchronization

// ============================================
// ENUMS
// ============================================

export enum SyncStatus {
  PENDING = 'pending',
  SYNCING = 'syncing',
  SYNCED = 'synced',
  FAILED = 'failed',
  CONFLICT = 'conflict'
}

export enum SyncPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum EntityType {
  TASK = 'task',
  MESSAGE = 'message',
  EVENT = 'event',
  TRANSACTION = 'transaction',
  TASK_COMPLETION = 'task_completion',
  MESSAGE_READ = 'message_read',
  PROFILE_UPDATE = 'profile_update',
  SETTINGS_UPDATE = 'settings_update'
}

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface SyncQueue {
  id: string;
  deviceId: string;
  userId: string;
  entityType: EntityType;
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  payload: Record<string, any>;
  priority: SyncPriority;
  status: SyncStatus;
  retryCount: number;
  maxRetries: number;
  lastAttemptAt?: string;
  queuedAt: string;
  syncedAt?: string;
  failureReason?: string;
}

export interface OfflineData {
  id: string;
  deviceId: string;
  userId: string;
  entityType: EntityType;
  entityId: string;
  data: Record<string, any>;
  timestamp: string;
  isStale: boolean;
}

export interface SyncConflict {
  id: string;
  deviceId: string;
  entityType: EntityType;
  entityId: string;
  localVersion: any;
  remoteVersion: any;
  conflictType: 'update_conflict' | 'delete_conflict' | 'version_conflict';
  detectedAt: string;
  resolvedAt?: string;
  resolution?: 'local' | 'remote' | 'merged';
}

export interface SyncStatusSummary {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt?: string;
  nextSyncAt?: string;
  queuedItemsCount: number;
  failedItemsCount: number;
  conflictCount: number;
  syncProgress: number; // percentage
}

export interface SyncConfig {
  autoSync: boolean;
  syncInterval: number; // milliseconds
  maxRetries: number;
  retryDelay: number; // milliseconds
  batchSize: number;
  conflictResolutionStrategy: 'local' | 'remote' | 'manual' | 'merge';
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  persistenceEnabled: boolean;
}

export interface BackgroundSyncTask {
  id: string;
  name: string;
  interval: number; // milliseconds
  lastRunAt?: string;
  nextRunAt: string;
  isRunning: boolean;
  enabled: boolean;
}

export interface CacheEntry {
  id: string;
  entityType: EntityType;
  entityId: string;
  data: Record<string, any>;
  expiresAt: string;
  lastAccessedAt: string;
  accessCount: number;
}

export interface SyncStats {
  totalItemsQueued: number;
  totalItemsSynced: number;
  totalSyncFailures: number;
  averageSyncTime: number; // milliseconds
  successRate: number; // percentage
  conflictRate: number; // percentage
  lastSyncTime: string;
  nextScheduledSync: string;
}

export interface ManualSyncRequest {
  entityTypes?: EntityType[];
  priority?: SyncPriority;
  forceSync?: boolean;
}

export interface ResolveSyncConflictRequest {
  conflictId: string;
  resolution: 'local' | 'remote' | 'merged';
  mergedData?: Record<string, any>;
}

// ============================================
// BACKGROUND SYNCING API SERVICE
// ============================================

class BackgroundSyncApiService {
  private baseUrl = '/api/background-sync';
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
    };
  }

  // ==================== SYNC QUEUE MANAGEMENT ====================

  /**
   * Get sync queue
   */
  async getSyncQueue(
    userId: string,
    status?: SyncStatus,
    limit: number = 100
  ): Promise<SyncQueue[]> {
    const params = new URLSearchParams({ userId, limit: limit.toString() });
    if (status) params.append('status', status);

    const response = await fetch(`${this.baseUrl}/queue?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch sync queue');
    return response.json();
  }

  /**
   * Add item to sync queue
   */
  async queueSync(
    userId: string,
    entityType: EntityType,
    entityId: string,
    operation: 'create' | 'update' | 'delete',
    payload: Record<string, any>,
    priority?: SyncPriority
  ): Promise<SyncQueue> {
    const response = await fetch(`${this.baseUrl}/queue`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        userId,
        entityType,
        entityId,
        operation,
        payload,
        priority: priority || SyncPriority.NORMAL,
      }),
    });

    if (!response.ok) throw new Error('Failed to queue sync');
    return response.json();
  }

  /**
   * Remove item from sync queue
   */
  async dequeueSync(queueItemId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/queue/${queueItemId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to dequeue sync');
    return response.json();
  }

  /**
   * Clear entire sync queue
   */
  async clearSyncQueue(userId: string): Promise<{ cleared: number }> {
    const response = await fetch(`${this.baseUrl}/queue/clear`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) throw new Error('Failed to clear sync queue');
    return response.json();
  }

  /**
   * Prioritize sync item
   */
  async prioritizeSyncItem(queueItemId: string, priority: SyncPriority): Promise<SyncQueue> {
    const response = await fetch(`${this.baseUrl}/queue/${queueItemId}/prioritize`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ priority }),
    });

    if (!response.ok) throw new Error('Failed to prioritize sync item');
    return response.json();
  }

  // ==================== OFFLINE DATA ====================

  /**
   * Get offline data
   */
  async getOfflineData(userId: string, entityType?: EntityType): Promise<OfflineData[]> {
    const params = new URLSearchParams({ userId });
    if (entityType) params.append('entityType', entityType);

    const response = await fetch(`${this.baseUrl}/offline-data?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch offline data');
    return response.json();
  }

  /**
   * Store offline data
   */
  async storeOfflineData(
    userId: string,
    entityType: EntityType,
    entityId: string,
    data: Record<string, any>
  ): Promise<OfflineData> {
    const response = await fetch(`${this.baseUrl}/offline-data`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        userId,
        entityType,
        entityId,
        data,
      }),
    });

    if (!response.ok) throw new Error('Failed to store offline data');
    return response.json();
  }

  /**
   * Remove offline data
   */
  async removeOfflineData(offlineDataId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/offline-data/${offlineDataId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to remove offline data');
    return response.json();
  }

  /**
   * Clear all offline data
   */
  async clearOfflineData(userId: string): Promise<{ cleared: number }> {
    const response = await fetch(`${this.baseUrl}/offline-data/clear`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) throw new Error('Failed to clear offline data');
    return response.json();
  }

  // ==================== MANUAL SYNC ====================

  /**
   * Trigger manual sync
   */
  async triggerSync(userId: string, request?: ManualSyncRequest): Promise<{ syncId: string; itemsQueued: number }> {
    const response = await fetch(`${this.baseUrl}/sync/trigger`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ userId, ...request }),
    });

    if (!response.ok) throw new Error('Failed to trigger sync');
    return response.json();
  }

  /**
   * Get sync status
   */
  async getSyncStatus(userId: string): Promise<SyncStatus> {
    const params = new URLSearchParams({ userId });

    const response = await fetch(`${this.baseUrl}/sync/status?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch sync status');
    return response.json();
  }

  /**
   * Cancel ongoing sync
   */
  async cancelSync(userId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/sync/cancel`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) throw new Error('Failed to cancel sync');
    return response.json();
  }

  // ==================== SYNC CONFLICTS ====================

  /**
   * Get sync conflicts
   */
  async getSyncConflicts(userId: string): Promise<SyncConflict[]> {
    const params = new URLSearchParams({ userId });

    const response = await fetch(`${this.baseUrl}/conflicts?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch sync conflicts');
    return response.json();
  }

  /**
   * Get specific conflict
   */
  async getSyncConflict(conflictId: string): Promise<SyncConflict> {
    const response = await fetch(`${this.baseUrl}/conflicts/${conflictId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch conflict');
    return response.json();
  }

  /**
   * Resolve sync conflict
   */
  async resolveConflict(request: ResolveSyncConflictRequest): Promise<SyncConflict> {
    const response = await fetch(`${this.baseUrl}/conflicts/resolve`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Failed to resolve conflict');
    return response.json();
  }

  /**
   * Auto-resolve conflicts
   */
  async autoResolveConflicts(userId: string): Promise<{ resolved: number }> {
    const response = await fetch(`${this.baseUrl}/conflicts/auto-resolve`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) throw new Error('Failed to auto-resolve conflicts');
    return response.json();
  }

  // ==================== SYNC CONFIGURATION ====================

  /**
   * Get sync configuration
   */
  async getSyncConfig(userId: string): Promise<SyncConfig> {
    const params = new URLSearchParams({ userId });

    const response = await fetch(`${this.baseUrl}/config?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch sync config');
    return response.json();
  }

  /**
   * Update sync configuration
   */
  async updateSyncConfig(userId: string, config: Partial<SyncConfig>): Promise<SyncConfig> {
    const response = await fetch(`${this.baseUrl}/config`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ userId, ...config }),
    });

    if (!response.ok) throw new Error('Failed to update sync config');
    return response.json();
  }

  /**
   * Enable auto-sync
   */
  async enableAutoSync(userId: string): Promise<SyncConfig> {
    return this.updateSyncConfig(userId, { autoSync: true });
  }

  /**
   * Disable auto-sync
   */
  async disableAutoSync(userId: string): Promise<SyncConfig> {
    return this.updateSyncConfig(userId, { autoSync: false });
  }

  // ==================== CACHE MANAGEMENT ====================

  /**
   * Get cached data
   */
  async getCachedData(entityType: EntityType, entityId: string): Promise<CacheEntry | null> {
    const params = new URLSearchParams({ entityType, entityId });

    const response = await fetch(`${this.baseUrl}/cache?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch cached data');
    const data = await response.json();
    return data.length > 0 ? data[0] : null;
  }

  /**
   * Clear cache
   */
  async clearCache(userId: string): Promise<{ cleared: number }> {
    const response = await fetch(`${this.baseUrl}/cache/clear`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) throw new Error('Failed to clear cache');
    return response.json();
  }

  /**
   * Warm cache
   */
  async warmCache(userId: string, entityTypes: EntityType[]): Promise<{ cached: number }> {
    const response = await fetch(`${this.baseUrl}/cache/warm`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ userId, entityTypes }),
    });

    if (!response.ok) throw new Error('Failed to warm cache');
    return response.json();
  }

  // ==================== BACKGROUND TASKS ====================

  /**
   * Get background sync tasks
   */
  async getBackgroundTasks(userId: string): Promise<BackgroundSyncTask[]> {
    const params = new URLSearchParams({ userId });

    const response = await fetch(`${this.baseUrl}/background-tasks?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch background tasks');
    return response.json();
  }

  /**
   * Schedule background task
   */
  async scheduleBackgroundTask(
    userId: string,
    name: string,
    interval: number
  ): Promise<BackgroundSyncTask> {
    const response = await fetch(`${this.baseUrl}/background-tasks`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ userId, name, interval }),
    });

    if (!response.ok) throw new Error('Failed to schedule background task');
    return response.json();
  }

  /**
   * Cancel background task
   */
  async cancelBackgroundTask(taskId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/background-tasks/${taskId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to cancel background task');
    return response.json();
  }

  // ==================== STATISTICS ====================

  /**
   * Get sync statistics
   */
  async getSyncStats(userId: string): Promise<SyncStats> {
    const params = new URLSearchParams({ userId });

    const response = await fetch(`${this.baseUrl}/stats?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch sync stats');
    return response.json();
  }

  /**
   * Get sync history
   */
  async getSyncHistory(userId: string, limit: number = 50): Promise<any[]> {
    const params = new URLSearchParams({ userId, limit: limit.toString() });

    const response = await fetch(`${this.baseUrl}/history?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch sync history');
    return response.json();
  }
}

export default new BackgroundSyncApiService();
