/**
 * Biometrics Bridge
 * 
 * Handles biometric authentication requests from the PWA.
 * Uses react-native-biometrics.
 */

import { Platform, Alert } from 'react-native';
import ReactNativeBiometrics, { BiometryType } from 'react-native-biometrics';
import type { BiometricAuthResponsePayload } from '@famconomy/shared';

// Initialize
const rnBiometrics = new ReactNativeBiometrics();

export interface BiometricAuthRequest {
  reason: string;
  fallbackToPin?: boolean;
}

/**
 * Handle biometric authentication request
 */
export async function authenticate(request: BiometricAuthRequest): Promise<BiometricAuthResponsePayload> {
  try {
    // 1. Check if biometrics are available
    const { available, biometryType } = await rnBiometrics.isSensorAvailable();

    if (!available || !biometryType) {
      // If not available, we can't authenticate
      // Note: We could fallback to device PIN if fallbackToPin is true,
      // but react-native-biometrics is focused on biometrics.
      return { 
        success: false, 
        error: 'Biometrics not available' 
      };
    }

    // 2. Request authentication
    const { success, error } = await rnBiometrics.simplePrompt({
      promptMessage: request.reason || 'Confirm Identity',
      cancelButtonText: 'Cancel',
      fallbackPromptMessage: 'Use Passcode', // iOS only
    });

    if (success) {
      return { success: true };
    } else {
      return { 
        success: false, 
        error: error || 'Authentication failed' 
      };
    }

  } catch (error) {
    console.error('[BiometricsBridge] Error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Check biometric availability type
 */
export async function getBiometryType(): Promise<BiometryType | undefined> {
  const { available, biometryType } = await rnBiometrics.isSensorAvailable();
  return available ? biometryType : undefined;
}
