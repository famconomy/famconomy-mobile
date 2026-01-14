/**
 * Native Bridge Hook
 * 
 * Handles routing messages from the PWA to native modules
 * and sending responses back to the WebView.
 */

import { useCallback, RefObject } from 'react';
import { Platform, Share } from 'react-native';
import { WebView } from 'react-native-webview';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

import type {
  PWAToNativeMessage,
  NativeToPWAMessage,
  ScreenTimeRequestPayload,
  DeviceInfoResponsePayload,
  HapticFeedbackPayload,
  ShareRequestPayload,
} from '@famconomy/shared';

import { FamilyControlsBridge } from '../native/FamilyControlsBridge';
import { getDeviceInfo } from '../native/DeviceInfoBridge';
import { authenticate, getBiometryType } from '../native/BiometricsBridge';

export function useNativeBridge(webViewRef: RefObject<WebView>) {
  /**
   * Send a message to the WebView
   */
  const sendToWebView = useCallback((message: NativeToPWAMessage) => {
    if (webViewRef.current) {
      const script = `
        (function() {
          var bridge = window.FamconomyNative;
          if (bridge && bridge._handleResponse) {
            bridge._handleResponse('${message.id}', ${JSON.stringify(message.payload)});
          }
          // Also dispatch as custom event for general listeners
          window.dispatchEvent(new CustomEvent('famconomy:native', {
            detail: ${JSON.stringify(message)}
          }));
        })();
        true;
      `;
      webViewRef.current.injectJavaScript(script);
    }
  }, [webViewRef]);

  /**
   * Handle incoming messages from the PWA
   */
  const handleNativeMessage = useCallback(async (
    message: PWAToNativeMessage
  ): Promise<NativeToPWAMessage | null> => {
    const { id, type, payload, timestamp } = message;

    try {
      switch (type) {
        case 'SCREEN_TIME_REQUEST': {
          const stPayload = payload as ScreenTimeRequestPayload;
          const result = await FamilyControlsBridge.handleRequest(stPayload);
          return {
            id,
            type: 'SCREEN_TIME_RESPONSE',
            payload: result,
            timestamp: Date.now(),
          };
        }

        case 'DEVICE_INFO_REQUEST': {
          const deviceInfo = await getDeviceInfo();
          return {
            id,
            type: 'DEVICE_INFO_RESPONSE',
            payload: deviceInfo,
            timestamp: Date.now(),
          };
        }

        case 'HAPTIC_FEEDBACK': {
          const hapticPayload = payload as HapticFeedbackPayload;
          triggerHaptic(hapticPayload.type);
          return null; // No response needed
        }

        case 'SHARE_REQUEST': {
          const sharePayload = payload as ShareRequestPayload;
          await Share.share({
            title: sharePayload.title,
            message: sharePayload.message || '',
            url: sharePayload.url,
          });
          return null; // No response needed
        }

        case 'BIOMETRIC_AUTH_REQUEST': {
          // Implement biometric authentication
          const bioPayload = payload as { reason: string };
          const result = await authenticate({
            reason: bioPayload.reason || 'Authentication Required',
          });
          return {
            id,
            type: 'BIOMETRIC_AUTH_RESPONSE',
            payload: result,
            timestamp: Date.now(),
          };
        }

        default:
          console.warn('[NativeBridge] Unknown message type:', type);
          return {
            id,
            type: 'ERROR',
            payload: {
              code: 'UNKNOWN_MESSAGE_TYPE',
              message: `Unknown message type: ${type}`,
              originalMessageId: id,
            },
            timestamp: Date.now(),
          };
      }
    } catch (error) {
      console.error('[NativeBridge] Error handling message:', error);
      return {
        id,
        type: 'ERROR',
        payload: {
          code: 'NATIVE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          originalMessageId: id,
        },
        timestamp: Date.now(),
      };
    }
  }, []);

  return {
    sendToWebView,
    handleNativeMessage,
  };
}

/**
 * Trigger haptic feedback
 */
function triggerHaptic(type: HapticFeedbackPayload['type']) {
  const hapticMap = {
    light: 'impactLight' as const,
    medium: 'impactMedium' as const,
    heavy: 'impactHeavy' as const,
    success: 'notificationSuccess' as const,
    warning: 'notificationWarning' as const,
    error: 'notificationError' as const,
  };

  try {
    ReactNativeHapticFeedback.trigger(hapticMap[type] || 'impactMedium', {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });
  } catch (error) {
    // Haptic feedback not available, ignore
  }
}
