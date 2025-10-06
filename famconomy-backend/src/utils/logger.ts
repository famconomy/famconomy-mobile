interface LogLevel {
  ERROR: 'error';
  WARN: 'warn';
  INFO: 'info';
  DEBUG: 'debug';
}

const LOG_LEVELS: LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

class StructuredLogger {
  private isDevelopment: boolean;
  private isDebugEnabled: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
    this.isDebugEnabled = process.env.DEBUG_LOGGING === 'true';
  }

  private log(level: string, message: string, meta?: any, sanitize: boolean = false) {
    if (!this.isDevelopment && level === LOG_LEVELS.DEBUG && !this.isDebugEnabled) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(meta && { meta: sanitize ? this.sanitizeData(meta) : meta })
    };

    if (this.isDevelopment) {
      console.log(JSON.stringify(logEntry, null, 2));
    } else {
      console.log(JSON.stringify(logEntry));
    }
  }

  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sensitiveFields = [
      'password', 'token', 'accessToken', 'access_token', 
      'refreshToken', 'refresh_token', 'secret', 'key',
      'authorization', 'cookie', 'session', 'plaid'
    ];

    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    // Recursively sanitize nested objects
    for (const [key, value] of Object.entries(sanitized)) {
      if (value && typeof value === 'object') {
        sanitized[key] = this.sanitizeData(value);
      }
    }

    return sanitized;
  }

  error(message: string, meta?: any) {
    this.log(LOG_LEVELS.ERROR, message, meta, true);
  }

  warn(message: string, meta?: any) {
    this.log(LOG_LEVELS.WARN, message, meta, true);
  }

  info(message: string, meta?: any) {
    this.log(LOG_LEVELS.INFO, message, meta, true);
  }

  debug(message: string, meta?: any) {
    this.log(LOG_LEVELS.DEBUG, message, meta, true);
  }

  // Raw logging without sanitization for trusted internal data
  rawDebug(message: string, meta?: any) {
    this.log(LOG_LEVELS.DEBUG, message, meta, false);
  }
}

export const logger = new StructuredLogger();
export default logger;