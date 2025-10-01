import { Request, Response, NextFunction } from 'express';

export const loggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const quietPrefixes = ['/notifications'];

  if (quietPrefixes.some((prefix) => req.originalUrl.startsWith(prefix))) {
    return next();
  }

  console.log('--- NEW REQUEST ---');
  console.log('Time:', new Date().toISOString());
  console.log('Method:', req.method);
  console.log('URL:', req.originalUrl);
  console.log('Body:', req.body);
  console.log('--- END REQUEST ---');
  next();
};
