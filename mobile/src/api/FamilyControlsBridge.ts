/**
 * FamilyControlsBridge.ts
 * TypeScript interface for the native Family Controls module
 * 
 * This file defines all types and interfaces for communicating with the Swift module.
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const FAMILY_CONTROLS_MODULE = NativeModules.FamilyControlsBridge;

// MARK: - Types

export interface FamilyControlsResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface ScreenTimeData {
  userId: string;
  remaining: number;        // seconds
  limit: number;            // seconds
  used: number;             // seconds
  percentage: number;
  lastUpdated: number;      // timestamp
}

export interface DeviceStatus {
  deviceId: string;
  isLocked: boolean;
  screenTimeRemaining: number;
  activeDowntime: boolean;
  blockedApps: string[];
  lastUpdated: number;
}

export interface AuthStatus {
  authorized: boolean;
  familyId: string;
  userRole: 'parent' | 'child' | 'guardian' | 'admin' | 'none';
  canControlOtherDevices: boolean;
  timestamp: number;
}

export type FamilyControlsEvent =
  | 'SCREEN_TIME_WARNING'
  | 'SCREEN_TIME_EXCEEDED'
  | 'DOWNTIME_STARTED'
  | 'DOWNTIME_ENDED'
  | 'SCREEN_TIME_LIMIT_SET'
  | 'ADDITIONAL_TIME_APPROVED'
  | 'MONITORING_ENABLED'
  | 'APP_BLOCKED'
  | 'APP_UNBLOCKED'
  | 'DEVICE_LOCKED'
  | 'DEVICE_UNLOCKED'
  | 'DEVICE_STATUS_CHANGED'
  | 'AUTHORIZATION_CHANGED'
  | 'PERMISSION_REQUIRED'
  | 'AUTHORIZATION_ERROR'
  | 'STATUS_UPDATED'
  | 'ERROR_OCCURRED'
  | 'READY_STATE_CHANGED';

export type AppCategory =
  | 'social_media'
  | 'entertainment'
  | 'productivity'
  | 'games'
  | 'education'
  | 'other';

export interface Subscription {
  remove: () => void;
}

// MARK: - FamilyControlsBridge

class FamilyControlsBridgeImpl {
  private eventEmitter: NativeEventEmitter | null = null;
  private isInitialized = false;

  constructor() {
    if (Platform.OS === 'ios' && FAMILY_CONTROLS_MODULE) {
      this.eventEmitter = new NativeEventEmitter(FAMILY_CONTROLS_MODULE);
      this.isInitialized = true;
    }
  }

  /**
   * Check if the Family Controls module is available
   */
  isAvailable(): boolean {
    return Platform.OS === 'ios' && FAMILY_CONTROLS_MODULE != null;
  }

  // MARK: - Authorization Methods

  /**
   * Request Family Controls access for a family
   */
  async requestFamilyControlsAccess(familyId: string): Promise<boolean> {
    if (!this.isAvailable()) {
      throw new Error('Family Controls module not available');
    }

    return FAMILY_CONTROLS_MODULE.requestFamilyControlsAccess(familyId);
  }

  /**
   * Check current authorization status
   */
  async checkAuthorizationStatus(familyId: string): Promise<AuthStatus> {
    if (!this.isAvailable()) {
      throw new Error('Family Controls module not available');
    }

    return FAMILY_CONTROLS_MODULE.checkAuthorizationStatus(familyId);
  }

  // MARK: - Screen Time Methods

  /**
   * Set screen time limit for a user
   */
  async setScreenTimeLimit(params: {
    userId: string;
    minutes: number;
    category?: AppCategory;
  }): Promise<FamilyControlsResponse<void>> {
    if (!this.isAvailable()) {
      throw new Error('Family Controls module not available');
    }

    return FAMILY_CONTROLS_MODULE.setScreenTimeLimit(params);
  }

  /**
   * Get screen time information for a user
   */
  async getScreenTimeInfo(
    userId: string
  ): Promise<FamilyControlsResponse<ScreenTimeData>> {
    if (!this.isAvailable()) {
      throw new Error('Family Controls module not available');
    }

    return FAMILY_CONTROLS_MODULE.getScreenTimeInfo(userId);
  }

  /**
   * Get remaining screen time in seconds
   */
  async getRemainingScreenTime(
    userId: string
  ): Promise<FamilyControlsResponse<number>> {
    if (!this.isAvailable()) {
      throw new Error('Family Controls module not available');
    }

    return FAMILY_CONTROLS_MODULE.getRemainingScreenTime(userId);
  }

  /**
   * Approve additional screen time for a user
   */
  async approveAdditionalTime(params: {
    userId: string;
    minutes: number;
  }): Promise<FamilyControlsResponse<void>> {
    if (!this.isAvailable()) {
      throw new Error('Family Controls module not available');
    }

    return FAMILY_CONTROLS_MODULE.approveAdditionalTime(params);
  }

  /**
   * Enable screen time monitoring with warnings
   */
  async enableScreenTimeMonitoring(params: {
    userId: string;
    warningThreshold?: number;  // percent (default: 20)
  }): Promise<FamilyControlsResponse<void>> {
    if (!this.isAvailable()) {
      throw new Error('Family Controls module not available');
    }

    return FAMILY_CONTROLS_MODULE.enableScreenTimeMonitoring(params);
  }

  // MARK: - Device Control Methods

  /**
   * Block an application by bundle ID
   */
  async blockApplication(bundleId: string): Promise<FamilyControlsResponse<void>> {
    if (!this.isAvailable()) {
      throw new Error('Family Controls module not available');
    }

    return FAMILY_CONTROLS_MODULE.blockApplication(bundleId);
  }

  /**
   * Unblock an application
   */
  async unblockApplication(bundleId: string): Promise<FamilyControlsResponse<void>> {
    if (!this.isAvailable()) {
      throw new Error('Family Controls module not available');
    }

    return FAMILY_CONTROLS_MODULE.unblockApplication(bundleId);
  }

  /**
   * Get list of blocked applications
   */
  async getBlockedApplications(): Promise<FamilyControlsResponse<string[]>> {
    if (!this.isAvailable()) {
      throw new Error('Family Controls module not available');
    }

    return FAMILY_CONTROLS_MODULE.getBlockedApplications();
  }

  /**
   * Get device status
   */
  async getDeviceStatus(deviceId: string): Promise<FamilyControlsResponse<DeviceStatus>> {
    if (!this.isAvailable()) {
      throw new Error('Family Controls module not available');
    }

    return FAMILY_CONTROLS_MODULE.getDeviceStatus(deviceId);
  }

  /**
   * Lock the device
   */
  async lockDevice(): Promise<FamilyControlsResponse<void>> {
    if (!this.isAvailable()) {
      throw new Error('Family Controls module not available');
    }

    return FAMILY_CONTROLS_MODULE.lockDevice();
  }

  // MARK: - Event Methods

  /**
   * Acknowledge a warning event
   */
  async acknowledgeWarning(warningId: string): Promise<FamilyControlsResponse<void>> {
    if (!this.isAvailable()) {
      throw new Error('Family Controls module not available');
    }

    return FAMILY_CONTROLS_MODULE.acknowledgeWarning(warningId);
  }

  // MARK: - Event Listener Methods

  /**
   * Add event listener for Family Controls events
   */
  addListener(
    event: FamilyControlsEvent,
    callback: (data: any) => void
  ): Subscription {
    if (!this.eventEmitter) {
      return { remove: () => {} };
    }

    const subscription = this.eventEmitter.addListener(event, callback);

    return {
      remove: () => subscription.remove(),
    };
  }

  /**
   * Listen to screen time warnings
   */
  onScreenTimeWarning(
    callback: (data: {
      userId: string;
      remaining: number;
      percentage: number;
      warningId: string;
      timestamp: number;
    }) => void
  ): Subscription {
    return this.addListener('SCREEN_TIME_WARNING', callback);
  }

  /**
   * Listen to screen time exceeded events
   */
  onScreenTimeExceeded(
    callback: (data: { userId: string; timestamp: number }) => void
  ): Subscription {
    return this.addListener('SCREEN_TIME_EXCEEDED', callback);
  }

  /**
   * Listen to app blocked events
   */
  onAppBlocked(
    callback: (data: {
      bundleId: string;
      appName: string;
      timestamp: number;
    }) => void
  ): Subscription {
    return this.addListener('APP_BLOCKED', callback);
  }

  /**
   * Listen to device locked events
   */
  onDeviceLocked(callback: (data: { timestamp: number }) => void): Subscription {
    return this.addListener('DEVICE_LOCKED', callback);
  }

  /**
   * Listen to authorization changed events
   */
  onAuthorizationChanged(
    callback: (data: {
      authorized: boolean;
      familyId: string;
      userRole: string;
      timestamp: number;
    }) => void
  ): Subscription {
    return this.addListener('AUTHORIZATION_CHANGED', callback);
  }

  /**
   * Listen to device status changed events
   */
  onDeviceStatusChanged(
    callback: (data: DeviceStatus) => void
  ): Subscription {
    return this.addListener('DEVICE_STATUS_CHANGED', callback);
  }

  /**
   * Listen to error events
   */
  onError(
    callback: (data: {
      code: string;
      message: string;
      details?: Record<string, any>;
      timestamp: number;
    }) => void
  ): Subscription {
    return this.addListener('ERROR_OCCURRED', callback);
  }
}

// MARK: - Export

export const FamilyControlsBridge = new FamilyControlsBridgeImpl();

export default FamilyControlsBridge;
