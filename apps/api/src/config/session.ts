import session from 'express-session';
import { logger } from '../utils/logger';

// Session store configuration
export const createSessionStore = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction && process.env.REDIS_URL) {
    // Use Redis in production if available
    try {
      const RedisStore = require('connect-redis')(session);
      const redis = require('redis');
      const client = redis.createClient({
        url: process.env.REDIS_URL,
      });
      
      client.on('error', (err: any) => {
        logger.error('Redis session store error', { error: err });
      });

      client.on('connect', () => {
        logger.info('Redis session store connected');
      });

      return new RedisStore({ client });
    } catch (error) {
      logger.warn('Redis not available, falling back to memory store', { error });
    }
  }

  if (isProduction) {
    logger.warn('Production environment detected but no Redis session store configured. Using memory store (not recommended for production).');
  }

  // Default to memory store (development only)
  return undefined; // Uses default memory store
};

// Validate session secret
if (!process.env.SESSION_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET environment variable is required in production');
  }
  logger.warn('SESSION_SECRET not set, using default (not secure for production)');
}

export const sessionConfig: session.SessionOptions = {
  store: createSessionStore(),
  secret: process.env.SESSION_SECRET || 'dev-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  },
  name: 'famconomy_session', // Change default session name
};