/**
 * Simplified App Entry Point
 * 
 * PWA Wrapper Architecture - the app is primarily a WebView container
 * that loads app.famconomy.com with native capabilities for screen time
 * management and push notifications.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StatusBar, Platform, View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { WebViewContainer, WebViewContainerRef } from './webview/WebViewContainer';
import { SplashScreen } from './screens/SplashScreen';
import { PermissionsScreen } from './screens/PermissionsScreen';
import { FamilyControlsBridge } from './native/FamilyControlsBridge';
import { useScreenTimeSync } from './native/useScreenTimeSync';
import { 
  initializePushNotifications, 
  setNotificationHandler,
  clearNotificationHandler,
  unregisterPushNotifications,
} from './native/PushNotificationsBridge';
import { 
  initializeDeepLinks, 
  routeToPwaUrl,
  type DeepLinkRoute,
} from './native/DeepLinkHandler';
import { AuthStorage } from './auth/useAuthBridge';
import type { UserRole, NativeSession, PushNotificationPayload } from '@famconomy/shared';

type AppState = 'loading' | 'permissions' | 'ready';

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [needsPermissions, setNeedsPermissions] = useState(false);
  const [session, setSession] = useState<NativeSession | null>(null);
  const [initialRoute, setInitialRoute] = useState<string | null>(null);
  
  const webViewRef = useRef<WebViewContainerRef>(null);

  // Screen time sync for child accounts
  useScreenTimeSync({
    userId: session?.userId || '',
    role: (session?.role as UserRole) || 'parent',
    enabled: isAuthenticated && session?.role === 'child',
  });

  useEffect(() => {
    initializeApp();
    
    return () => {
      // Cleanup on unmount
      clearNotificationHandler();
    };
  }, []);

  // Set up deep link handler
  const handleDeepLink = useCallback((route: DeepLinkRoute) => {
    const pwaUrl = routeToPwaUrl(route);
    console.log('[App] Deep link navigation:', pwaUrl);
    
    if (webViewRef.current) {
      webViewRef.current.navigateTo(pwaUrl);
    } else {
      // Store for when WebView is ready
      setInitialRoute(pwaUrl);
    }
  }, []);

  async function initializeApp() {
    try {
      // Initialize deep links first to capture initial URL
      initializeDeepLinks(handleDeepLink);
      
      // Check if we have a stored session
      const storedSession = await AuthStorage.getStoredSession();
      setSession(storedSession);
      setIsAuthenticated(!!storedSession);

      // Initialize push notifications if authenticated
      if (storedSession) {
        await initializePushNotifications();
        setupNotificationHandlers();
      }

      // Check if FamilyControls needs authorization (iOS only)
      if (Platform.OS === 'ios') {
        const isAuthorized = await FamilyControlsBridge.isAuthorized();
        if (!isAuthorized && storedSession?.role === 'parent') {
          setNeedsPermissions(true);
          setAppState('permissions');
          return;
        }
      }

      setAppState('ready');
    } catch (error) {
      console.error('[App] Initialization error:', error);
      setAppState('ready'); // Proceed anyway, PWA can handle auth
    }
  }

  function setupNotificationHandlers() {
    setNotificationHandler({
      onNotificationReceived: (notification) => {
        console.log('[App] Notification received:', notification.type);
        // In-app notifications are handled by the PWA
        // Could show a native toast here if desired
      },
      onNotificationOpened: (notification) => {
        console.log('[App] Notification opened:', notification.type);
        // Navigate to relevant screen based on notification type
        const route = getRouteForNotification(notification);
        if (route && webViewRef.current) {
          webViewRef.current.navigateTo(routeToPwaUrl(route));
        }
      },
    });
  }

  function getRouteForNotification(notification: PushNotificationPayload): DeepLinkRoute | null {
    const data = notification.data as Record<string, string> | undefined;
    
    switch (notification.type) {
      case 'task_completed':
      case 'task_approved':
      case 'task_rejected':
        return { path: `/tasks/${data?.taskId || ''}` };
      case 'screen_time_granted':
        return { path: '/screen-time' };
      case 'family_invite':
        return { path: `/family/invite/${data?.inviteCode || ''}` };
      default:
        return null;
    }
  }

  function handlePermissionsComplete() {
    setNeedsPermissions(false);
    setAppState('ready');
  }

  async function handleAuthChange(authenticated: boolean) {
    setIsAuthenticated(authenticated);
    
    // Refresh session when auth changes
    if (authenticated) {
      const newSession = await AuthStorage.getStoredSession();
      setSession(newSession);
      
      // Initialize push notifications on login
      await initializePushNotifications();
      setupNotificationHandlers();
    } else {
      // Unregister push notifications on logout
      await unregisterPushNotifications();
      setSession(null);
    }
    
    // Check permissions again if user just logged in as parent
    if (authenticated && Platform.OS === 'ios') {
      FamilyControlsBridge.isAuthorized().then((isAuth) => {
        if (!isAuth) {
          setNeedsPermissions(true);
          setAppState('permissions');
        }
      });
    }
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <StatusBar 
          barStyle="dark-content" 
          backgroundColor="#ffffff" 
        />
        
        {appState === 'loading' && (
          <SplashScreen />
        )}
        
        {appState === 'permissions' && (
          <PermissionsScreen onComplete={handlePermissionsComplete} />
        )}
        
        {appState === 'ready' && (
          <WebViewContainer 
            ref={webViewRef}
            onAuthChange={handleAuthChange}
            initialRoute={initialRoute}
          />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
