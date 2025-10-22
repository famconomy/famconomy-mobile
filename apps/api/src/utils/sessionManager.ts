import { SessionOptions } from 'express-session';
import { logger } from './logger';

export class SessionManager {
  async initialize(): Promise<SessionOptions> {
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Validate required secrets
    if (!process.env.SESSION_SECRET) {
      throw new Error('SESSION_SECRET environment variable is required');
    }

    const sessionConfig: SessionOptions = {
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      name: 'famconomy_session',
      cookie: {
        secure: isProduction,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        sameSite: isProduction ? 'strict' : 'lax'
      }
    };

    // TODO: Add Redis session store for production
    // For now, using memory store with warning
    if (isProduction) {
      logger.warn('Production environment detected but using memory session store. Consider configuring Redis for better scalability.');
    } else {
      logger.info('Using memory session store for development');
    }

    return sessionConfig;
  }
}

export const sessionManager = new SessionManager();