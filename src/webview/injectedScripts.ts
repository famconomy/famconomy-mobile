/**
 * WebView Injected Scripts
 * 
 * JavaScript that gets injected into the PWA WebView to enable
 * communication between the web app and React Native.
 */

// Inline constants to avoid import issues in template literals
const INJECTED_OBJECT_NAME = 'FamconomyNative';
const PWA_READY_EVENT = 'famconomy:ready';
const MESSAGE_TIMEOUT_MS = 30000;

/**
 * Script injected on page load to set up the native bridge
 */
export const BRIDGE_SETUP_SCRIPT = `
(function() {
  // Prevent double initialization
  if (window.${INJECTED_OBJECT_NAME}) {
    return;
  }

  // Create the native bridge object
  window.${INJECTED_OBJECT_NAME} = {
    // Platform detection
    platform: null,
    isReady: false,
    
    // Pending response callbacks
    _pendingCallbacks: new Map(),
    
    // Send message to native
    postMessage: function(message) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(message));
      }
    },
    
    // Register callback for response
    _registerCallback: function(messageId, callback, timeout) {
      this._pendingCallbacks.set(messageId, {
        callback: callback,
        timer: setTimeout(function() {
          this._pendingCallbacks.delete(messageId);
          callback({ error: 'Timeout waiting for native response' });
        }.bind(this), timeout || ${MESSAGE_TIMEOUT_MS})
      });
    },
    
    // Handle response from native
    _handleResponse: function(messageId, payload) {
      var pending = this._pendingCallbacks.get(messageId);
      if (pending) {
        clearTimeout(pending.timer);
        this._pendingCallbacks.delete(messageId);
        pending.callback(payload);
      }
    },
    
    // Called by native when bridge is ready
    _onReady: function(platform) {
      this.platform = platform;
      this.isReady = true;
      window.dispatchEvent(new CustomEvent('${PWA_READY_EVENT}', {
        detail: { platform: platform }
      }));
    }
  };

  // Notify that we're ready for native initialization
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'BRIDGE_READY',
      timestamp: Date.now()
    }));
  }
})();
`;

/**
 * Script to capture Supabase auth session changes and forward to native
 */
export const AUTH_CAPTURE_SCRIPT = `
(function() {
  // Wait for the bridge to be ready
  if (!window.${INJECTED_OBJECT_NAME}) {
    console.warn('[FamConomy] Native bridge not available');
    return;
  }

  // Listen for storage changes (Supabase stores session in localStorage)
  var originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key, value) {
    originalSetItem.apply(this, arguments);
    
    // Check if this is a Supabase auth token update
    if (key.includes('supabase') && key.includes('auth')) {
      try {
        var session = JSON.parse(value);
        if (session && session.access_token) {
          window.${INJECTED_OBJECT_NAME}.postMessage({
            id: 'auth_' + Date.now(),
            type: 'AUTH_SESSION_UPDATE',
            payload: {
              session: {
                accessToken: session.access_token,
                refreshToken: session.refresh_token,
                expiresAt: session.expires_at,
                userId: session.user?.id,
                familyId: session.user?.user_metadata?.family_id,
                role: session.user?.user_metadata?.role || 'parent'
              }
            },
            timestamp: Date.now()
          });
        }
      } catch (e) {
        // Not a JSON session, ignore
      }
    }
  };

  // Also capture logout (removeItem)
  var originalRemoveItem = localStorage.removeItem;
  localStorage.removeItem = function(key) {
    originalRemoveItem.apply(this, arguments);
    
    if (key.includes('supabase') && key.includes('auth')) {
      window.${INJECTED_OBJECT_NAME}.postMessage({
        id: 'auth_' + Date.now(),
        type: 'AUTH_LOGOUT',
        payload: {},
        timestamp: Date.now()
      });
    }
  };
})();
`;

/**
 * Script to expose native capabilities to the PWA
 */
export const NATIVE_API_SCRIPT = `
(function() {
  var bridge = window.${INJECTED_OBJECT_NAME};
  if (!bridge) return;

  // Expose native APIs to the PWA
  window.FamconomyAPI = {
    // Request screen time action
    requestScreenTime: function(action, options) {
      return new Promise(function(resolve, reject) {
        var messageId = 'st_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        bridge._registerCallback(messageId, function(response) {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        });
        
        bridge.postMessage({
          id: messageId,
          type: 'SCREEN_TIME_REQUEST',
          payload: {
            action: action,
            childUserId: options?.childUserId,
            duration: options?.duration,
            allowedApps: options?.allowedApps,
            allowedCategories: options?.allowedCategories
          },
          timestamp: Date.now()
        });
      });
    },
    
    // Get device info
    getDeviceInfo: function() {
      return new Promise(function(resolve, reject) {
        var messageId = 'di_' + Date.now();
        
        bridge._registerCallback(messageId, function(response) {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        });
        
        bridge.postMessage({
          id: messageId,
          type: 'DEVICE_INFO_REQUEST',
          payload: { includePermissions: true },
          timestamp: Date.now()
        });
      });
    },
    
    // Trigger haptic feedback
    haptic: function(type) {
      bridge.postMessage({
        id: 'haptic_' + Date.now(),
        type: 'HAPTIC_FEEDBACK',
        payload: { type: type || 'medium' },
        timestamp: Date.now()
      });
    },
    
    // Native share
    share: function(options) {
      return new Promise(function(resolve) {
        bridge.postMessage({
          id: 'share_' + Date.now(),
          type: 'SHARE_REQUEST',
          payload: options,
          timestamp: Date.now()
        });
        resolve(); // Share doesn't need response
      });
    },
    
    // Check if running in native app
    isNativeApp: function() {
      return bridge.isReady;
    },
    
    // Get platform
    getPlatform: function() {
      return bridge.platform;
    }
  };

  console.log('[FamConomy] Native API initialized');
})();
`;

/**
 * Combined injection script
 */
export const FULL_INJECTION_SCRIPT = `
${BRIDGE_SETUP_SCRIPT}
${AUTH_CAPTURE_SCRIPT}
${NATIVE_API_SCRIPT}
true; // Required for iOS
`;
