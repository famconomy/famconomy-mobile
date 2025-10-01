import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

if (!process.env.JWT_SECRET) {
  throw new Error('Missing JWT_SECRET in environment variables');
}
const JWT_SECRET = process.env.JWT_SECRET;

const shouldLogAuth = ((process.env.DEBUG_AUTH ?? '').toLowerCase() === 'true');

const authenticateToken = (req: Request & { userId?: string }, res: Response, next: NextFunction) => {
  if (shouldLogAuth && !req.path.startsWith('/notifications')) {
    console.log(`Authenticating request to: ${req.path}`);
  }
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.fam_token) {
    token = req.cookies.fam_token;
  }

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) return res.sendStatus(403);
    req.userId = decoded.id;
    next();
  });
};

const optionalAuthenticateToken = (req: Request & { userId?: string }, res: Response, next: NextFunction) => {
  if (shouldLogAuth && !req.path.startsWith('/notifications')) {
    console.log(`Optionally authenticating request to: ${req.path}`);
  }
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.fam_token) {
    token = req.cookies.fam_token;
  }

  if (!token) {
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      // Invalid token, but we don't want to fail the request
      return next();
    }
    req.userId = decoded.id;
    next();
  });
};

export { authenticateToken, optionalAuthenticateToken };
