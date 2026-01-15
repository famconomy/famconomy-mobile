/**
 * Deep Link Handler
 * 
 * Handles famconomy:// URL scheme and universal links.
 * Routes deep links to appropriate PWA routes via WebView.
 */

import { Linking, Platform } from 'react-native';

export interface DeepLinkRoute {
  path: string;
  params?: Record<string, string>;
}

type DeepLinkHandler = (route: DeepLinkRoute) => void;

let deepLinkHandler: DeepLinkHandler | null = null;
let pendingDeepLink: DeepLinkRoute | null = null;

// URL Scheme configuration
const URL_SCHEME = 'famconomy';
const UNIVERSAL_LINK_DOMAIN = 'app.famconomy.com';

/**
 * Initialize deep link handling
 */
export async function initializeDeepLinks(handler: DeepLinkHandler): Promise<void> {
  deepLinkHandler = handler;

  // Check for initial URL (app opened via deep link)
  const initialUrl = await Linking.getInitialURL();
  if (initialUrl) {
    console.log('[DeepLinks] Initial URL:', initialUrl);
    handleDeepLink(initialUrl);
  }

  // Handle any pending deep link
  if (pendingDeepLink && deepLinkHandler) {
    deepLinkHandler(pendingDeepLink);
    pendingDeepLink = null;
  }

  // Listen for new deep links while app is running
  const subscription = Linking.addEventListener('url', (event) => {
    console.log('[DeepLinks] Received URL:', event.url);
    handleDeepLink(event.url);
  });

  // Return cleanup function
  return () => {
    subscription.remove();
    deepLinkHandler = null;
  };
}

/**
 * Parse and handle a deep link URL
 */
function handleDeepLink(url: string): void {
  const route = parseDeepLink(url);
  if (!route) {
    console.warn('[DeepLinks] Could not parse URL:', url);
    return;
  }

  console.log('[DeepLinks] Parsed route:', route);

  if (deepLinkHandler) {
    deepLinkHandler(route);
  } else {
    // Store for later if handler not ready
    pendingDeepLink = route;
  }
}

/**
 * Parse a deep link URL into a route
 * 
 * Supported formats:
 * - famconomy://tasks/123
 * - famconomy://family/invite/abc123
 * - famconomy://screen-time/grant/456
 * - https://app.famconomy.com/tasks/123
 */
function parseDeepLink(url: string): DeepLinkRoute | null {
  try {
    let path: string;
    let queryString: string = '';

    if (url.startsWith(`${URL_SCHEME}://`)) {
      // Custom URL scheme: famconomy://path/to/resource?param=value#hash
      const withoutScheme = url.replace(`${URL_SCHEME}://`, '');
      // Remove hash fragment first
      const [beforeHash] = withoutScheme.split('#');
      const [pathPart, queryPart] = beforeHash.split('?');
      path = '/' + pathPart;
      queryString = queryPart || '';
    } else if (url.includes(UNIVERSAL_LINK_DOMAIN)) {
      // Universal link: https://app.famconomy.com/path
      const parsed = new URL(url);
      path = parsed.pathname;
      queryString = parsed.search.replace(/^\?/, '');
    } else {
      return null;
    }

    // Parse query string manually (React Native URLSearchParams doesn't have forEach)
    const params: Record<string, string> = {};
    if (queryString) {
      queryString.split('&').forEach((pair) => {
        const [key, value] = pair.split('=');
        if (key) {
          params[decodeURIComponent(key)] = decodeURIComponent(value || '');
        }
      });
    }

    return { path, params };
  } catch (error) {
    console.error('[DeepLinks] Parse error:', error);
    return null;
  }
}

/**
 * Convert a route to a PWA URL
 */
export function routeToPwaUrl(route: DeepLinkRoute): string {
  let url = `https://${UNIVERSAL_LINK_DOMAIN}${route.path}`;
  
  if (route.params && Object.keys(route.params).length > 0) {
    const searchParams = new URLSearchParams(route.params);
    url += `?${searchParams.toString()}`;
  }
  
  return url;
}

/**
 * Create a deep link URL for sharing
 */
export function createDeepLink(path: string, params?: Record<string, string>): string {
  let url = `${URL_SCHEME}://${path.replace(/^\//, '')}`;
  
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }
  
  return url;
}

/**
 * Create a universal link URL for sharing (works on web too)
 */
export function createUniversalLink(path: string, params?: Record<string, string>): string {
  let url = `https://${UNIVERSAL_LINK_DOMAIN}${path.startsWith('/') ? path : '/' + path}`;
  
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }
  
  return url;
}

/**
 * Check if deep linking is available
 */
export async function canOpenDeepLink(url: string): Promise<boolean> {
  return Linking.canOpenURL(url);
}

/**
 * Open a URL (external browser or another app)
 */
export async function openExternalUrl(url: string): Promise<void> {
  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  } else {
    console.warn('[DeepLinks] Cannot open URL:', url);
  }
}

/**
 * Known deep link paths and their descriptions
 */
export const DEEP_LINK_PATHS = {
  // Task routes
  TASKS: '/tasks',
  TASK_DETAIL: '/tasks/:id',
  CREATE_TASK: '/tasks/create',
  
  // Family routes
  FAMILY: '/family',
  FAMILY_INVITE: '/family/invite/:code',
  FAMILY_MEMBERS: '/family/members',
  
  // Screen time routes
  SCREEN_TIME: '/screen-time',
  SCREEN_TIME_GRANT: '/screen-time/grant/:id',
  
  // Settings
  SETTINGS: '/settings',
  PARENTAL_CONTROLS: '/settings/parental-controls',
  
  // Auth (for magic links)
  AUTH_CALLBACK: '/auth/callback',
  RESET_PASSWORD: '/auth/reset-password',
} as const;
