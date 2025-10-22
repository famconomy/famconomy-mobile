import crypto from 'crypto';
import { logger } from '../utils/logger';

const ENCRYPTION_KEY = process.env.PLAID_ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-key-not-secure';
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypt sensitive Plaid tokens before storing in database
 */
export const encryptToken = (text: string): string => {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    logger.error('Error encrypting token', { error });
    throw new Error('Token encryption failed');
  }
};

/**
 * Decrypt Plaid tokens when retrieving from database
 */
export const decryptToken = (encryptedText: string): string => {
  try {
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
    
    if (!ivHex || !authTagHex || !encrypted) {
      throw new Error('Invalid encrypted token format');
    }
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    logger.error('Error decrypting token', { error });
    throw new Error('Token decryption failed');
  }
};

/**
 * Redact sensitive token for logging
 */
export const redactToken = (token: string): string => {
  if (!token || token.length < 8) return '[REDACTED]';
  return `${token.substring(0, 4)}...${token.substring(token.length - 4)}`;
};

/**
 * Batch transaction sync with retry logic and rate limiting
 */
export class PlaidSyncManager {
  private static instance: PlaidSyncManager;
  private syncQueue: Map<string, { timestamp: number; retries: number }> = new Map();
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 5000; // 5 seconds
  private readonly SYNC_COOLDOWN = 60000; // 1 minute between syncs per item

  static getInstance(): PlaidSyncManager {
    if (!PlaidSyncManager.instance) {
      PlaidSyncManager.instance = new PlaidSyncManager();
    }
    return PlaidSyncManager.instance;
  }

  async canSync(itemId: string): Promise<boolean> {
    const queueItem = this.syncQueue.get(itemId);
    if (!queueItem) return true;
    
    const now = Date.now();
    return now - queueItem.timestamp > this.SYNC_COOLDOWN;
  }

  async markSyncAttempt(itemId: string): Promise<void> {
    const existing = this.syncQueue.get(itemId);
    this.syncQueue.set(itemId, {
      timestamp: Date.now(),
      retries: existing ? existing.retries + 1 : 1,
    });
  }

  async shouldRetry(itemId: string): Promise<boolean> {
    const queueItem = this.syncQueue.get(itemId);
    return queueItem ? queueItem.retries < this.MAX_RETRIES : true;
  }

  async clearSync(itemId: string): Promise<void> {
    this.syncQueue.delete(itemId);
  }

  async scheduleRetry(itemId: string, callback: () => Promise<void>): Promise<void> {
    const queueItem = this.syncQueue.get(itemId);
    if (!queueItem || queueItem.retries >= this.MAX_RETRIES) {
      logger.warn('Max retries reached for Plaid sync', { itemId, retries: queueItem?.retries });
      return;
    }

    setTimeout(async () => {
      try {
        await callback();
        this.clearSync(itemId);
      } catch (error) {
        logger.error('Plaid sync retry failed', { itemId, retries: queueItem.retries, error });
        if (await this.shouldRetry(itemId)) {
          await this.scheduleRetry(itemId, callback);
        }
      }
    }, this.RETRY_DELAY * queueItem.retries); // Exponential backoff
  }
}