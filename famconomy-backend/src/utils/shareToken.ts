import crypto from 'crypto';

const HOURS_IN_MS = 60 * 60 * 1000;

export const generateShareToken = (bytes = 24): string => {
  return crypto.randomBytes(bytes).toString('hex');
};

export const hashShareToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const computeExpiryDate = (hours: number): Date => {
  const ttl = Number.isFinite(hours) && hours > 0 ? hours : 336;
  return new Date(Date.now() + ttl * HOURS_IN_MS);
};
