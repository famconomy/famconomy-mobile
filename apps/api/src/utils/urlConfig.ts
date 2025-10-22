const readEnv = (key: string): string | undefined => {
  const value = process.env[key];
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const ensureTrailingSlash = (value: string): string => (value.endsWith('/') ? value : `${value}/`);

const ensureLeadingSlash = (value: string): string => (value.startsWith('/') ? value : `/${value}`);

export const getAppBaseUrl = (): string => {
  const explicit = readEnv('APP_BASE_URL') ?? readEnv('FRONTEND_URL');
  if (explicit) {
    return stripTrailingSlash(explicit);
  }
  return stripTrailingSlash(process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : 'https://famconomy.com');
};

export const getApiBaseUrl = (): string => {
  const explicit = readEnv('API_BASE_URL') ?? readEnv('BACKEND_URL');
  if (explicit) {
    return stripTrailingSlash(explicit);
  }
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }
  return 'https://famconomy.com/api';
};

const defaultPostAuthPath = (): string => ensureLeadingSlash(readEnv('POST_AUTH_REDIRECT_PATH') ?? 'app');

export const getPostAuthRedirectUrl = (): string => {
  const explicitUrl =
    readEnv('POST_AUTH_REDIRECT_URL') ??
    readEnv('POST_LOGIN_REDIRECT_URL') ??
    readEnv('APP_LOGIN_SUCCESS_URL');
  if (explicitUrl) {
    return explicitUrl;
  }

  const base = getAppBaseUrl();
  const normalizedBase = stripTrailingSlash(base);
  const path = defaultPostAuthPath();

  if (normalizedBase.endsWith(path)) {
    return ensureTrailingSlash(normalizedBase);
  }

  return ensureTrailingSlash(`${normalizedBase}${path}`);
};

const buildOAuthCallbackEnvKey = (provider: string): string =>
  `${provider.toUpperCase()}_CALLBACK_URL`;

export const getOAuthCallbackUrl = (provider: string): string => {
  const envKey = buildOAuthCallbackEnvKey(provider);
  const explicit = readEnv(envKey);
  if (explicit) {
    return explicit;
  }

  const base = getApiBaseUrl();
  const normalizedBase = stripTrailingSlash(base);
  return `${normalizedBase}/auth/${provider}/callback`;
};

export const resolveFacebookClientId = (): string | undefined =>
  readEnv('FACEBOOK_APP_ID') ?? readEnv('FACEBOOK_CLIENT_ID');

export const resolveFacebookClientSecret = (): string | undefined =>
  readEnv('FACEBOOK_APP_SECRET') ?? readEnv('FACEBOOK_CLIENT_SECRET');

export const resolveApplePrivateKeyLocation = (): string | undefined =>
  readEnv('APPLE_PRIVATE_KEY_LOCATION') ?? readEnv('APPLE_PRIVATE_KEY_PATH');

export const readEnvValue = readEnv;
