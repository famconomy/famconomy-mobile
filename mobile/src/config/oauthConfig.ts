/**
 * OAuth Configuration
 * Contains provider credentials for all OAuth integrations
 */

export const OAUTH_CONFIG = {
  google: {
    // From app.json OAuth URL scheme
    // Format: {CLIENT_ID}.apps.googleusercontent.com
    iosClientId:
      process.env.REACT_APP_GOOGLE_IOS_CLIENT_ID ||
      '328667852218-ofk3l0s1vu2n8k6sgdggl3dvcvlvk02e.apps.googleusercontent.com',
    webClientId: process.env.REACT_APP_GOOGLE_WEB_CLIENT_ID || '328667852218-ofk3l0s1vu2n8k6sgdggl3dvcvlvk02e.apps.googleusercontent.com',
  },
  apple: {
    clientId: process.env.REACT_APP_APPLE_CLIENT_ID || 'com.famconomy.mobile',
    teamId: process.env.REACT_APP_APPLE_TEAM_ID || '',
    redirectUri: process.env.REACT_APP_APPLE_REDIRECT_URL || 'com.famconomy.mobile://apple-auth',
  },
  microsoft: {
    clientId: process.env.REACT_APP_MICROSOFT_CLIENT_ID || '',
    redirectUri: process.env.REACT_APP_MICROSOFT_REDIRECT_URL || 'msauth.com.famconomy.mobile://auth/redirect',
  },
  facebook: {
    appId: process.env.REACT_APP_FACEBOOK_APP_ID || '',
    redirectUri: process.env.REACT_APP_FACEBOOK_REDIRECT_URL || 'https://www.facebook.com/connect/login_success.html',
  },
  backend: {
    baseUrl: process.env.REACT_APP_API_BASE_URL || 'https://famconomy.com/api',
  },
};

export default OAUTH_CONFIG;
