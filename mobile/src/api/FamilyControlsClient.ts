import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import type {
  AuthorizationRequest,
  AuthorizationResult,
  AuthorizationStatus,
  ScreenTimeStatus,
  ScreenTimeSchedule,
  DeviceStatus,
  FamilyControlsError,
  FamilyControlsEvent,
  InitConfig,
  InitializationResult,
  PollingOptions,
  PollingResult,
  AuthorizationScope,
} from '../types/familyControls';

const { FamilyControlsNativeModule } = NativeModules;

/**
 * Family Controls Client
 * Manages communication with native iOS Family Controls module
 * Handles token persistence, polling, and error recovery
 */

interface ClientConfig {
  apiBaseUrl: string;
  maxRetries?: number;
  retryDelayMs?: number;
  enableAutoPersist?: boolean;
  enableAutoPolling?: boolean;
}

interface PersistenceOptions {
  token: string;
  expiresAt: number;
  scopes: AuthorizationScope[];
  userId: string;
  targetUserId: string;
  familyId: number;
}

export class FamilyControlsClient {
  private apiBaseUrl: string;
  private maxRetries: number;
  private retryDelayMs: number;
  private enableAutoPersist: boolean;
  private enableAutoPolling: boolean;
  private eventEmitter: NativeEventEmitter | null = null;
  private activePollingId: string | null = null;
  private eventListeners: Map<string, Set<Function>> = new Map();

  constructor(config: ClientConfig) {
    this.apiBaseUrl = config.apiBaseUrl;
    this.maxRetries = config.maxRetries ?? 3;
    this.retryDelayMs = config.retryDelayMs ?? 1000;
    this.enableAutoPersist = config.enableAutoPersist ?? true;
    this.enableAutoPolling = config.enableAutoPolling ?? false;

    // Initialize event emitter if on iOS
    if (Platform.OS === 'ios' && FamilyControlsNativeModule) {
      this.eventEmitter = new NativeEventEmitter(FamilyControlsNativeModule);
      this.setupEventListeners();
    }
  }

  /**
   * Setup native event listeners
   */
  private setupEventListeners() {
    if (!this.eventEmitter) return;

    // Listen for all family controls events
    const subscription = this.eventEmitter.addListener(
      'FamilyControlsEvent',
      (event: FamilyControlsEvent) => {
        this.handleNativeEvent(event);
      }
    );

    return () => subscription.remove();
  }

  /**
   * Handle native events and emit to local listeners
   */
  private handleNativeEvent(event: FamilyControlsEvent) {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event.data);
        } catch (error) {
          console.error(`Error in event listener for ${event.type}:`, error);
        }
      });
    }
  }

  /**
   * Initialize the native module
   */
  async initialize(config: InitConfig): Promise<InitializationResult> {
    return this.callNativeModule('initialize', config);
  }

  /**
   * Request authorization from the native module
   */
  async authorize(request: AuthorizationRequest): Promise<AuthorizationResult> {
    const result = await this.callNativeModuleWithRetry('authorize', request);

    // Persist token to backend if successful
    if (result.authorized && result.authorizationToken && this.enableAutoPersist) {
      await this.persistAuthorizationToken({
        token: result.authorizationToken,
        expiresAt: result.expiresAt || 0,
        scopes: result.grantedScopes,
        userId: request.requesterRole === 'child' ? request.targetUserId : '',
        targetUserId: request.targetUserId,
        familyId: 0, // Would need to pass from context
      }).catch((error) => {
        console.error('Failed to persist authorization token:', error);
        // Don't throw - token was granted even if persistence failed
      });
    }

    return result;
  }

  /**
   * Check authorization status
   */
  async checkAuthorization(token: string): Promise<AuthorizationStatus> {
    return this.callNativeModuleWithRetry('checkAuthorization', { token });
  }

  /**
   * Validate and use a token
   */
  async validateToken(token: string): Promise<{ valid: boolean; message?: string }> {
    return this.callNativeModuleWithRetry('validateToken', { token });
  }

  /**
   * Revoke an authorization token
   */
  async revokeAuthorization(token: string, reason?: string): Promise<void> {
    await this.callNativeModuleWithRetry('revokeAuthorization', { token, reason });
  }

  /**
   * Set screen time schedule
   */
  async setScreenTimeSchedule(schedule: ScreenTimeSchedule): Promise<{ success: boolean }> {
    return this.callNativeModuleWithRetry('setScreenTimeSchedule', schedule);
  }

  /**
   * Get current screen time status
   */
  async getScreenTimeStatus(userId: string): Promise<ScreenTimeStatus> {
    return this.callNativeModuleWithRetry('getScreenTimeStatus', { userId });
  }

  /**
   * Get device status
   */
  async getDeviceStatus(): Promise<DeviceStatus> {
    return this.callNativeModuleWithRetry('getDeviceStatus', {});
  }

  /**
   * Start polling for updates
   */
  async startPolling(options: PollingOptions): Promise<PollingResult> {
    const result = await this.callNativeModule('startPolling', options);
    if (result.success) {
      this.activePollingId = result.pollingId;
    }
    return result;
  }

  /**
   * Stop polling
   */
  async stopPolling(): Promise<void> {
    if (this.activePollingId) {
      await this.callNativeModule('stopPolling', { pollingId: this.activePollingId });
      this.activePollingId = null;
    }
  }

  /**
   * Add event listener for native events
   */
  addEventListener(
    eventType: string,
    listener: (data: any) => void
  ): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)!.add(listener);

    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(eventType);
      if (listeners) {
        listeners.delete(listener);
      }
    };
  }

  /**
   * Helper: Call native module with retry logic
   */
  private async callNativeModuleWithRetry(
    method: string,
    params: any
  ): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await this.callNativeModule(method, params);
      } catch (error) {
        lastError = error as Error;

        // Only retry on certain errors
        if (this.isRetryableError(error)) {
          if (attempt < this.maxRetries - 1) {
            const delayMs = this.retryDelayMs * Math.pow(2, attempt);
            await this.delay(delayMs);
            continue;
          }
        } else {
          // Non-retryable error, throw immediately
          throw error;
        }
      }
    }

    throw lastError || new Error(`Failed to call native module after ${this.maxRetries} attempts`);
  }

  /**
   * Call native module directly
   */
  private async callNativeModule(method: string, params: any): Promise<any> {
    if (Platform.OS !== 'ios' || !FamilyControlsNativeModule) {
      throw new Error('Family Controls not available on this platform');
    }

    try {
      const result = await FamilyControlsNativeModule[method](params);
      return result;
    } catch (error) {
      throw this.parseNativeError(error);
    }
  }

  /**
   * Persist authorization token to backend
   */
  private async persistAuthorizationToken(options: PersistenceOptions): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/family-controls/tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Authorization header would be added by interceptor
        },
        body: JSON.stringify({
          token: options.token,
          expiresAt: options.expiresAt,
          scopes: options.scopes,
          userId: options.userId,
          targetUserId: options.targetUserId,
          familyId: options.familyId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to persist token: ${response.status}`);
      }

      await response.json();
    } catch (error) {
      console.error('Error persisting authorization token:', error);
      throw error;
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (error.code) {
      // Retryable error codes
      const retryableCodes = ['NET_001', 'NET_002', 'NET_003', 'POLLING_ERROR'];
      return retryableCodes.includes(error.code);
    }
    return false;
  }

  /**
   * Parse error from native module
   */
  private parseNativeError(error: any): FamilyControlsError {
    if (error.code) {
      return error as FamilyControlsError;
    }

    return {
      code: 'SYS_001',
      message: error.message || 'Unknown error',
      domain: 'System',
      retryable: false,
      userFriendlyMessage: 'An unexpected error occurred',
      timestamp: Date.now(),
    };
  }

  /**
   * Utility: Delay for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.activePollingId) {
      await this.stopPolling();
    }
    this.eventListeners.clear();
  }
}

/**
 * Singleton instance
 */
let clientInstance: FamilyControlsClient | null = null;

/**
 * Get or create client instance
 */
export function getFamilyControlsClient(config?: ClientConfig): FamilyControlsClient {
  if (!clientInstance && config) {
    clientInstance = new FamilyControlsClient(config);
  }
  if (!clientInstance) {
    throw new Error('FamilyControlsClient not initialized. Call getFamilyControlsClient(config) first.');
  }
  return clientInstance;
}

/**
 * Initialize client
 */
export async function initializeFamilyControls(config: ClientConfig, initConfig: InitConfig) {
  const client = new FamilyControlsClient(config);
  await client.initialize(initConfig);
  clientInstance = client;
  return client;
}
