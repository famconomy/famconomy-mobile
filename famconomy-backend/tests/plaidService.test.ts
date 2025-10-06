import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { encryptToken, decryptToken, redactToken, PlaidSyncManager } from '../src/services/plaidService';

describe('Plaid Security Service', () => {
  const testToken = 'access-test-token-12345';
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Token Encryption/Decryption', () => {
    it('should encrypt and decrypt tokens correctly', () => {
      const encrypted = encryptToken(testToken);
      
      expect(encrypted).not.toBe(testToken);
      expect(encrypted).toContain(':'); // Should have IV and auth tag separators
      
      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe(testToken);
    });

    it('should generate different encrypted values for same input', () => {
      const encrypted1 = encryptToken(testToken);
      const encrypted2 = encryptToken(testToken);
      
      expect(encrypted1).not.toBe(encrypted2); // Due to random IV
      
      // But both should decrypt to same value
      expect(decryptToken(encrypted1)).toBe(testToken);
      expect(decryptToken(encrypted2)).toBe(testToken);
    });

    it('should throw error for invalid encrypted token format', () => {
      expect(() => decryptToken('invalid-format')).toThrow('Invalid encrypted token format');
      expect(() => decryptToken('only:one:separator')).toThrow();
    });

    it('should handle encryption errors gracefully', () => {
      // Test with extremely long input that might cause issues
      const longToken = 'a'.repeat(10000);
      
      expect(() => encryptToken(longToken)).not.toThrow();
    });
  });

  describe('Token Redaction', () => {
    it('should redact long tokens correctly', () => {
      const token = 'access-test-token-12345-long';
      const redacted = redactToken(token);
      
      expect(redacted).toBe('acce...long');
      expect(redacted).not.toContain('test-token-12345');
    });

    it('should handle short tokens', () => {
      const shortToken = 'abc';
      const redacted = redactToken(shortToken);
      
      expect(redacted).toBe('[REDACTED]');
    });

    it('should handle empty/null tokens', () => {
      expect(redactToken('')).toBe('[REDACTED]');
      expect(redactToken(null as any)).toBe('[REDACTED]');
    });
  });

  describe('PlaidSyncManager', () => {
    let syncManager: PlaidSyncManager;

    beforeEach(() => {
      // Reset singleton instance for testing
      (PlaidSyncManager as any).instance = undefined;
      syncManager = PlaidSyncManager.getInstance();
    });

    it('should implement singleton pattern', () => {
      const instance1 = PlaidSyncManager.getInstance();
      const instance2 = PlaidSyncManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should allow sync for new items', async () => {
      const canSync = await syncManager.canSync('new-item-id');
      expect(canSync).toBe(true);
    });

    it('should prevent rapid successive syncs', async () => {
      const itemId = 'test-item-id';
      
      await syncManager.markSyncAttempt(itemId);
      const canSyncAgain = await syncManager.canSync(itemId);
      
      expect(canSyncAgain).toBe(false);
    });

    it('should allow sync after cooldown period', async () => {
      const itemId = 'test-item-id';
      
      // Mock Date.now to simulate time passage
      const originalNow = Date.now;
      let currentTime = originalNow();
      
      vi.spyOn(Date, 'now').mockImplementation(() => currentTime);
      
      await syncManager.markSyncAttempt(itemId);
      expect(await syncManager.canSync(itemId)).toBe(false);
      
      // Simulate time passage beyond cooldown
      currentTime += 61000; // 61 seconds
      expect(await syncManager.canSync(itemId)).toBe(true);
      
      Date.now = originalNow;
    });

    it('should track retry attempts', async () => {
      const itemId = 'retry-test-item';
      
      expect(await syncManager.shouldRetry(itemId)).toBe(true);
      
      await syncManager.markSyncAttempt(itemId);
      await syncManager.markSyncAttempt(itemId);
      await syncManager.markSyncAttempt(itemId);
      
      expect(await syncManager.shouldRetry(itemId)).toBe(false); // Max retries reached
    });

    it('should clear sync state', async () => {
      const itemId = 'clear-test-item';
      
      await syncManager.markSyncAttempt(itemId);
      expect(await syncManager.canSync(itemId)).toBe(false);
      
      await syncManager.clearSync(itemId);
      expect(await syncManager.canSync(itemId)).toBe(true);
    });

    it('should schedule retries with exponential backoff', async () => {
      const itemId = 'schedule-test-item';
      const mockCallback = vi.fn().mockResolvedValue(undefined);
      
      // Mock setTimeout to capture delay
      const originalSetTimeout = setTimeout;
      let capturedDelay: number;
      
      vi.spyOn(global, 'setTimeout').mockImplementation((callback: any, delay: number) => {
        capturedDelay = delay;
        // Execute immediately for testing
        callback();
        return {} as any;
      });
      
      await syncManager.markSyncAttempt(itemId); // First attempt
      await syncManager.scheduleRetry(itemId, mockCallback);
      
      expect(mockCallback).toHaveBeenCalled();
      expect(capturedDelay!).toBe(5000); // Base delay * 1 retry
      
      global.setTimeout = originalSetTimeout;
    });

    it('should stop retrying after max attempts', async () => {
      const itemId = 'max-retry-test-item';
      const mockCallback = vi.fn().mockRejectedValue(new Error('Sync failed'));
      
      // Mock setTimeout to execute immediately
      vi.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return {} as any;
      });
      
      // Mark maximum retries
      await syncManager.markSyncAttempt(itemId);
      await syncManager.markSyncAttempt(itemId);
      await syncManager.markSyncAttempt(itemId);
      
      await syncManager.scheduleRetry(itemId, mockCallback);
      
      // Should not call callback when max retries reached
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed encrypted tokens', () => {
      const malformedTokens = [
        'invalid',
        ':only:separators:',
        'not:enough:parts',
        'invalid:hex:data'
      ];
      
      malformedTokens.forEach(token => {
        expect(() => decryptToken(token)).toThrow();
      });
    });

    it('should handle encryption key issues gracefully', () => {
      // Test with missing encryption key
      const originalKey = process.env.PLAID_ENCRYPTION_KEY;
      delete process.env.PLAID_ENCRYPTION_KEY;
      delete process.env.JWT_SECRET;
      
      // Should still work with default key (though not secure)
      expect(() => encryptToken('test')).not.toThrow();
      
      // Restore
      if (originalKey) {
        process.env.PLAID_ENCRYPTION_KEY = originalKey;
      }
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle concurrent sync attempts', async () => {
      const itemId = 'concurrent-test-item';
      
      // Simulate concurrent sync attempts
      const promises = [
        syncManager.canSync(itemId),
        syncManager.canSync(itemId),
        syncManager.canSync(itemId)
      ];
      
      const results = await Promise.all(promises);
      
      // All should return true initially
      expect(results.every(result => result === true)).toBe(true);
      
      // After marking attempt, should prevent concurrent syncs
      await syncManager.markSyncAttempt(itemId);
      
      const laterResults = await Promise.all([
        syncManager.canSync(itemId),
        syncManager.canSync(itemId)
      ]);
      
      expect(laterResults.every(result => result === false)).toBe(true);
    });

    it('should maintain state across multiple operations', async () => {
      const itemId = 'state-test-item';
      
      // Initial state
      expect(await syncManager.canSync(itemId)).toBe(true);
      expect(await syncManager.shouldRetry(itemId)).toBe(true);
      
      // After first attempt
      await syncManager.markSyncAttempt(itemId);
      expect(await syncManager.canSync(itemId)).toBe(false);
      expect(await syncManager.shouldRetry(itemId)).toBe(true);
      
      // After multiple attempts
      await syncManager.markSyncAttempt(itemId);
      await syncManager.markSyncAttempt(itemId);
      expect(await syncManager.shouldRetry(itemId)).toBe(false);
      
      // After clearing
      await syncManager.clearSync(itemId);
      expect(await syncManager.canSync(itemId)).toBe(true);
      expect(await syncManager.shouldRetry(itemId)).toBe(true);
    });
  });
});