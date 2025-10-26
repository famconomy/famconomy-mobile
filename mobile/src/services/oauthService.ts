/**
 * oauthService.ts
 * Native OAuth provider integration for mobile
 * Uses Firebase and native OAuth libraries
 */

import apiClient from '../api/apiClient';
import { Platform, NativeModules } from 'react-native';
import OAUTH_CONFIG from '../config/oauthConfig';

export interface OAuthResponse {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  full_name?: string;
  avatar?: string;
  profilePhotoUrl?: string;
  role: 'parent' | 'guardian' | 'child' | 'admin' | 'none';
  status: string;
  created_at?: string;
  updated_at?: string;
}

export class OAuthService {
  private static getEnv(value: string | undefined, message: string) {
    if (!value || !value.trim()) {
      throw new Error(message);
    }
    return value.trim();
  }

  /**
   * Google Sign-In - Native implementation
   */
  static async loginWithGoogle(): Promise<OAuthResponse> {
    try {
      console.log('[OAuth] Attempting native Google Sign-In...');
      
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');

      const resolveGoogleClientId = (): string => {
        // Priority order for client ID resolution:
        // 1. Environment variable
        // 2. Config file (from app.json)
        // 3. Native constants
        // 4. Native module

        const envValue = process.env.REACT_APP_GOOGLE_IOS_CLIENT_ID?.trim();
        if (envValue) {
          console.log('[OAuth] Using Google iOS Client ID from environment');
          return envValue;
        }

        if (OAUTH_CONFIG.google.iosClientId) {
          console.log('[OAuth] Using Google iOS Client ID from oauthConfig');
          return OAUTH_CONFIG.google.iosClientId;
        }

        try {
          const constants = GoogleSignin.getConstants?.();
          if (constants?.IOS_CLIENT_ID) {
            console.log('[OAuth] Using Google Client ID from GoogleSignin constants');
            return constants.IOS_CLIENT_ID;
          }
          if (constants?.clientID) {
            console.log('[OAuth] Using Google Client ID from GoogleSignin clientID');
            return constants.clientID;
          }
        } catch (err) {
          console.warn('[OAuth] Failed to read Google Sign-In constants', err);
        }

        const nativeId = (NativeModules as any)?.RNGoogleSignin?.iosClientId || (NativeModules as any)?.RNGoogleSignin?.clientID;
        if (typeof nativeId === 'string' && nativeId.length > 0) {
          console.log('[OAuth] Using Google Client ID from native module');
          return nativeId;
        }

        throw new Error(
          'Google iOS Client ID not found. Add GoogleService-Info.plist to Xcode project or set REACT_APP_GOOGLE_IOS_CLIENT_ID environment variable'
        );
      };

      const googleClientId = resolveGoogleClientId();
      
      console.log('[OAuth] Configuring Google Sign-In...');
      GoogleSignin.configure({
        iosClientId: googleClientId,
        webClientId: OAUTH_CONFIG.google.webClientId,
      });
      
      // Initialize if needed
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }

      console.log('[OAuth] Triggering Google Sign-In sheet...');
      await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();
      
      console.log('[OAuth] Native Google Sign-In successful, exchanging tokens with backend');

      // Send to backend
      const response = await apiClient.post('/auth/oauth/google', {
        accessToken: tokens.accessToken,
        idToken: tokens.idToken,
        refreshToken: tokens.refreshToken,
      });
      
      const user = response.data?.user;
      if (!user) {
        throw new Error('Google OAuth succeeded but no user profile returned from backend');
      }
      
      console.log('[OAuth] Google login successful:', user.email);
      return user as OAuthResponse;
    } catch (error) {
      console.error('[OAuth] Google Sign-In failed:', error);
      throw error;
    }
  }

  /**
   * Apple Sign-In
   */
  static async loginWithApple(): Promise<OAuthResponse> {
    try {
      console.log('Attempting native Apple Sign-In...');
      
      if (Platform.OS !== 'ios') {
        throw new Error('Apple Sign-In only available on iOS');
      }

      const { authorize } = require('react-native-app-auth');

      const clientId = this.getEnv(
        OAUTH_CONFIG.apple.clientId,
        'Apple OAuth is not configured. Set REACT_APP_APPLE_CLIENT_ID.'
      );

      const redirectUrl = this.getEnv(
        OAUTH_CONFIG.apple.redirectUri,
        'Apple redirect URL missing. Set REACT_APP_APPLE_REDIRECT_URL.'
      );

      const result = await authorize({
        clientId,
        redirectUrl,
        responseType: 'code',
        scopes: ['name', 'email'],
        serviceConfiguration: {
          authorizationEndpoint: 'https://appleid.apple.com/auth/authorize',
          tokenEndpoint: 'https://appleid.apple.com/auth/token',
        },
        additionalParameters: {
          response_mode: 'form_post',
        },
      });

      if (!result.idToken) {
        throw new Error('Apple Sign-In failed to return an identity token');
      }

      console.log('Native Apple Sign-In successful');
      
      // Send to backend
      const response = await apiClient.post('/auth/oauth/apple', {
        identityToken: result.idToken,
        authorizationCode: result.authorizationCode,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        fullName: result.tokenAdditionalParameters?.name ?? result.additionalParameters,
      });

      const user = response.data?.user;
      if (!user) {
        throw new Error('Apple login succeeded but no user profile was returned.');
      }
      return user as OAuthResponse;
    } catch (error) {
      console.error('Apple Sign-In error:', error);
      throw error;
    }
  }

  /**
   * Microsoft Sign-In - Native MSAL implementation
   */
  static async loginWithMicrosoft(): Promise<OAuthResponse> {
    try {
      console.log('Attempting native Microsoft Sign-In...');
      
      const { authorize } = require('react-native-app-auth');
      
      const clientId = this.getEnv(
        OAUTH_CONFIG.microsoft.clientId,
        'Microsoft OAuth not configured - set REACT_APP_MICROSOFT_CLIENT_ID.'
      );
      const redirectUrl = OAUTH_CONFIG.microsoft.redirectUri;

      const result = await authorize({
        clientId,
        redirectUrl,
        scopes: ['openid', 'profile', 'email', 'offline_access', 'https://graph.microsoft.com/User.Read'],
        serviceConfiguration: {
          authorizationEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
          tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        },
        responseType: 'code',
        skipCodeExchange: true,
        usePKCE: true,
      });

      if (!result.authorizationCode) {
        throw new Error('Microsoft Sign-In failed to return an authorization code.');
      }
      
      console.log('Native Microsoft Sign-In successful');
      
      // Send to backend
      const response = await apiClient.post('/auth/oauth/microsoft', {
        authorizationCode: result.authorizationCode,
        codeVerifier: result.codeVerifier,
      });

      const user = response.data?.user;
      if (!user) {
        throw new Error('Microsoft login succeeded but no user profile was returned.');
      }
      return user as OAuthResponse;
    } catch (error) {
      console.error('Microsoft Sign-In error:', error);
      throw error;
    }
  }

  /**
   * Facebook Sign-In
   */
  static async loginWithFacebook(): Promise<OAuthResponse> {
    try {
      console.log('Attempting native Facebook Sign-In...');

      const { authorize } = require('react-native-app-auth');

      const clientId = this.getEnv(
        OAUTH_CONFIG.facebook.appId,
        'Facebook OAuth not configured - set REACT_APP_FACEBOOK_APP_ID.'
      );
      const redirectUrl = OAUTH_CONFIG.facebook.redirectUri;

      const result = await authorize({
        clientId,
        redirectUrl,
        scopes: ['public_profile', 'email'],
        serviceConfiguration: {
          authorizationEndpoint: 'https://www.facebook.com/v19.0/dialog/oauth',
          tokenEndpoint: 'https://graph.facebook.com/v19.0/oauth/access_token',
        },
        responseType: 'code',
        skipCodeExchange: true,
        usePKCE: false,
      });

      if (!result.authorizationCode) {
        throw new Error('Facebook Sign-In failed to return an authorization code.');
      }

      console.log('Native Facebook Sign-In successful');
      
      // Send to backend
      const response = await apiClient.post('/auth/oauth/facebook', {
        authorizationCode: result.authorizationCode,
      });

      const user = response.data?.user;
      if (!user) {
        throw new Error('Facebook login succeeded but no user profile was returned.');
      }

      return user as OAuthResponse;
    } catch (error) {
      console.error('Facebook Sign-In error:', error);
      throw error;
    }
  }
}

export default OAuthService;
