/**
 * WebView Container
 * 
 * Main PWA wrapper component that loads app.famconomy.com in a WebView
 * and handles all native bridge communication.
 */

import React, { useRef, useCallback, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Platform,
  BackHandler,
  Linking,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FULL_INJECTION_SCRIPT } from './injectedScripts';
import { useNativeBridge } from '../bridges/useNativeBridge';
import { useAuthBridge } from '../auth/useAuthBridge';
import type {
  PWAToNativeMessage,
  NativeToPWAMessage,
  API_CONFIG,
} from '@famconomy/shared';

// Use production URL or dev URL based on __DEV__
const PWA_URL = __DEV__ 
  ? 'http://localhost:5173' 
  : 'https://app.famconomy.com';

interface WebViewContainerProps {
  onAuthChange?: (isAuthenticated: boolean) => void;
  initialPath?: string;
  initialRoute?: string | null;
}

export interface WebViewContainerRef {
  navigateTo: (url: string) => void;
  goBack: () => void;
  reload: () => void;
  injectScript: (script: string) => void;
}

export const WebViewContainer = forwardRef<WebViewContainerRef, WebViewContainerProps>(({
  onAuthChange,
  initialPath,
  initialRoute,
}, ref) => {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  
  const { handleNativeMessage, sendToWebView } = useNativeBridge(webViewRef);
  const { handleAuthMessage, restoreSession } = useAuthBridge();

  // Construct initial URL with optional path
  const initialUrl = initialRoute || (initialPath 
    ? `${PWA_URL}${initialPath}` 
    : PWA_URL);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    navigateTo: (url: string) => {
      webViewRef.current?.injectJavaScript(`
        window.location.href = '${url}';
        true;
      `);
    },
    goBack: () => {
      webViewRef.current?.goBack();
    },
    reload: () => {
      webViewRef.current?.reload();
    },
    injectScript: (script: string) => {
      webViewRef.current?.injectJavaScript(script);
    },
  }), []);

  /**
   * Handle messages from the WebView (PWA)
   */
  const onMessage = useCallback(async (event: WebViewMessageEvent) => {
    try {
      const message: PWAToNativeMessage = JSON.parse(event.nativeEvent.data);
      
      console.log('[WebView] Received message:', message.type);

      // Route message based on type
      switch (message.type) {
        case 'BRIDGE_READY':
          // Bridge is initialized, send platform info
          sendToWebView({
            id: message.id,
            type: 'BRIDGE_INITIALIZED',
            payload: { platform: Platform.OS },
            timestamp: Date.now(),
          });
          
          // Attempt to restore session
          const restoredSession = await restoreSession();
          if (restoredSession) {
            sendToWebView({
              id: `restore_${Date.now()}`,
              type: 'AUTH_SESSION_RESTORED',
              payload: {
                session: restoredSession,
                hasValidSession: true,
              },
              timestamp: Date.now(),
            });
            onAuthChange?.(true);
          }
          break;

        case 'AUTH_SESSION_UPDATE':
        case 'AUTH_LOGOUT':
          const authResult = await handleAuthMessage(message);
          onAuthChange?.(message.type === 'AUTH_SESSION_UPDATE');
          break;

        default:
          // Handle other native bridge messages
          const response = await handleNativeMessage(message);
          if (response) {
            sendToWebView(response);
          }
      }
    } catch (error) {
      console.error('[WebView] Error processing message:', error);
    }
  }, [handleNativeMessage, handleAuthMessage, sendToWebView, restoreSession, onAuthChange]);

  /**
   * Handle Android back button
   */
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onBackPress = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };

    BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
  }, [canGoBack]);

  /**
   * Handle deep links
   */
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const url = event.url;
      if (url.startsWith('famconomy://')) {
        const path = url.replace('famconomy://', '/');
        webViewRef.current?.injectJavaScript(`
          window.location.href = '${PWA_URL}${path}';
          true;
        `);
      }
    };

    // Handle deep link when app is already open
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Handle deep link that opened the app
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => subscription.remove();
  }, []);

  /**
   * Handle external links (open in browser)
   */
  const onShouldStartLoadWithRequest = useCallback((request: { url: string }) => {
    const url = request.url;
    
    // Allow loading the PWA and its resources
    if (url.startsWith(PWA_URL) || url.startsWith('about:')) {
      return true;
    }

    // Open external links in system browser
    if (url.startsWith('http://') || url.startsWith('https://')) {
      Linking.openURL(url);
      return false;
    }

    return true;
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <WebView
        ref={webViewRef}
        source={{ uri: initialUrl }}
        style={styles.webview}
        
        // Injection
        injectedJavaScriptBeforeContentLoaded={FULL_INJECTION_SCRIPT}
        
        // Message handling
        onMessage={onMessage}
        
        // Navigation state
        onNavigationStateChange={(navState) => {
          setCanGoBack(navState.canGoBack);
        }}
        
        // Loading
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        
        // External links
        onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        
        // Features
        javaScriptEnabled={true}
        domStorageEnabled={true}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        
        // iOS specific
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        allowsBackForwardNavigationGestures={true}
        
        // Android specific
        mixedContentMode="compatibility"
        
        // Security
        originWhitelist={['*']}
        
        // Performance
        cacheEnabled={true}
        cacheMode="LOAD_DEFAULT"
      />
      
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      )}
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default WebViewContainer;
