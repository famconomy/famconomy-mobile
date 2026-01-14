/**
 * Auth Bridge Hook
 * 
 * Handles authentication state synchronization between
 * the PWA (Supabase Auth) and native secure storage.
 */

import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

import type {
  PWAToNativeMessage,
  NativeSession,
  AuthSessionUpdatePayload,
} from '@famconomy/shared';
import { STORAGE_KEYS } from '@famconomy/shared';

const KEYCHAIN_SERVICE = 'com.famconomy.auth';

export function useAuthBridge() {
  /**
   * Handle auth messages from PWA
   */
  const handleAuthMessage = useCallback(async (
    message: PWAToNativeMessage
  ): Promise<void> => {
    switch (message.type) {
      case 'AUTH_SESSION_UPDATE': {
        const { session } = message.payload as AuthSessionUpdatePayload;
        await saveSession(session);
        console.log('[AuthBridge] Session saved for user:', session.userId);
        break;
      }

      case 'AUTH_LOGOUT': {
        await clearSession();
        console.log('[AuthBridge] Session cleared');
        break;
      }
    }
  }, []);

  /**
   * Restore session from secure storage on app launch
   */
  const restoreSession = useCallback(async (): Promise<NativeSession | null> => {
    try {
      const session = await getStoredSession();
      
      if (!session) {
        console.log('[AuthBridge] No stored session found');
        return null;
      }

      // Check if session is expired
      if (session.expiresAt < Date.now() / 1000) {
        console.log('[AuthBridge] Stored session is expired');
        await clearSession();
        return null;
      }

      console.log('[AuthBridge] Session restored for user:', session.userId);
      return session;
    } catch (error) {
      console.error('[AuthBridge] Error restoring session:', error);
      return null;
    }
  }, []);

  /**
   * Get the current access token for native API calls
   */
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const session = await getStoredSession();
    return session?.accessToken || null;
  }, []);

  /**
   * Check if user is authenticated
   */
  const isAuthenticated = useCallback(async (): Promise<boolean> => {
    const session = await getStoredSession();
    if (!session) return false;
    return session.expiresAt > Date.now() / 1000;
  }, []);

  return {
    handleAuthMessage,
    restoreSession,
    getAccessToken,
    isAuthenticated,
  };
}

/**
 * Save session to secure storage
 */
async function saveSession(session: NativeSession): Promise<void> {
  try {
    // Store sensitive tokens in Keychain
    await Keychain.setGenericPassword(
      session.userId,
      JSON.stringify({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      }),
      { service: KEYCHAIN_SERVICE }
    );

    // Store non-sensitive session metadata in AsyncStorage
    await AsyncStorage.setItem(
      STORAGE_KEYS.SESSION,
      JSON.stringify({
        userId: session.userId,
        familyId: session.familyId,
        role: session.role,
        expiresAt: session.expiresAt,
      })
    );
  } catch (error) {
    console.error('[AuthBridge] Error saving session:', error);
    throw error;
  }
}

/**
 * Get session from secure storage
 */
async function getStoredSession(): Promise<NativeSession | null> {
  try {
    // Get metadata from AsyncStorage
    const metadataJson = await AsyncStorage.getItem(STORAGE_KEYS.SESSION);
    if (!metadataJson) return null;

    const metadata = JSON.parse(metadataJson);

    // Get tokens from Keychain
    const credentials = await Keychain.getGenericPassword({ 
      service: KEYCHAIN_SERVICE 
    });
    
    if (!credentials) return null;

    const tokens = JSON.parse(credentials.password);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: metadata.expiresAt,
      userId: metadata.userId,
      familyId: metadata.familyId,
      role: metadata.role,
    };
  } catch (error) {
    console.error('[AuthBridge] Error getting stored session:', error);
    return null;
  }
}

/**
 * Clear session from secure storage
 */
async function clearSession(): Promise<void> {
  try {
    await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
    await AsyncStorage.removeItem(STORAGE_KEYS.SESSION);
  } catch (error) {
    console.error('[AuthBridge] Error clearing session:', error);
  }
}

/**
 * Export standalone functions for use outside React components
 */
export const AuthStorage = {
  saveSession,
  getStoredSession,
  clearSession,
};
