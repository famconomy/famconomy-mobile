import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const loggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const quietPrefixes = ['/notifications'];

  if (quietPrefixes.some((prefix) => req.originalUrl.startsWith(prefix))) {
    return next();
  }

  logger.info('Incoming request', {
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    body: req.body // This will be sanitized automatically
  });

  next();
};
