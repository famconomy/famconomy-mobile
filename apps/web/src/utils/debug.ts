const parseTargets = (raw: string | undefined) => {
  if (!raw || !raw.trim()) return [] as string[];
  return raw
    .split(',')
    .map(token => token.trim().toLowerCase())
    .filter(Boolean);
};

const normalizeElement = (element?: string) => element?.trim().toLowerCase() ?? '';

const matchesToken = (token: string, element: string) => {
  if (!token) return false;
  if (token === '*' || token === 'all') return true;
  if (token.endsWith('*')) return element.startsWith(token.slice(0, -1));
  if (token.startsWith('*')) return element.endsWith(token.slice(1));
  if (token.includes('*')) {
    const [prefix, suffix] = token.split('*');
    return element.startsWith(prefix) && element.endsWith(suffix);
  }
  return element === token || element.includes(token);
};

const rawTargets = import.meta.env.VITE_DEBUG_ELEMENTS;
const forced = (import.meta.env.VITE_DEBUG_FORCE ?? '').toString().toLowerCase();
const forceDebug = forced === 'true' || forced === '1' || forced === 'yes';
const defaultTargets = import.meta.env.DEV && rawTargets === undefined ? ['*'] : [];
const targets = rawTargets === undefined ? defaultTargets : parseTargets(rawTargets);
const hasWildcard = targets.some(token => token === '*' || token === 'all');
const shouldCheckTargets = targets.length > 0;
const canLogInEnv = import.meta.env.DEV || forceDebug;

type LogLevel = 'log' | 'info' | 'warn' | 'error';

const shouldLog = (element: string, _level: LogLevel): boolean => {
  if (!canLogInEnv) return false;
  if (!shouldCheckTargets) return false;
  if (hasWildcard) return true;
  if (!element) return false;
  return targets.some(token => matchesToken(token, element));
};

const withPrefix = (element: string, args: unknown[]): unknown[] => {
  if (!element) return args;
  return ['[' + element + ']', ...args];
};

const logInternal = (level: LogLevel, element: string, args: unknown[]) => {
  const normalizedElement = normalizeElement(element);
  if (!shouldLog(normalizedElement, level)) return;
  const data = withPrefix(element, args);
  // eslint-disable-next-line no-console
  (console[level] ?? console.log)(...data);
};

export const debugLog = (element: string, ...args: unknown[]) => {
  logInternal('log', element, args);
};

export const debugInfo = (element: string, ...args: unknown[]) => {
  logInternal('info', element, args);
};

export const debugWarn = (element: string, ...args: unknown[]) => {
  logInternal('warn', element, args);
};

export const debugError = (element: string, ...args: unknown[]) => {
  logInternal('error', element, args);
};

export const createDebugLogger = (element: string) => {
  const normalized = normalizeElement(element);
  return {
    element,
    enabled: shouldLog(normalized, 'log'),
    log: (...args: unknown[]) => logInternal('log', element, args),
    info: (...args: unknown[]) => logInternal('info', element, args),
    warn: (...args: unknown[]) => logInternal('warn', element, args),
    error: (...args: unknown[]) => logInternal('error', element, args),
  } as const;
};

export const isElementDebugging = (element: string) => shouldLog(normalizeElement(element), 'log');
