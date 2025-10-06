import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger } from '../../src/utils/logger';

// Mock console to capture logs
const mockConsole = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn()
};

vi.stubGlobal('console', mockConsole);

describe('Logger Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Sensitive Data Sanitization', () => {
    it('should redact password fields', () => {
      const sensitiveData = {
        username: 'testuser',
        password: 'secret123',
        email: 'test@example.com'
      };

      logger.info('User login attempt', sensitiveData);

      const logCall = mockConsole.log.mock.calls[0];
      const loggedData = JSON.parse(logCall[0]);
      
      expect(loggedData.data.password).toBe('[REDACTED]');
      expect(loggedData.data.username).toBe('testuser');
      expect(loggedData.data.email).toBe('test@example.com');
    });

    it('should redact JWT tokens', () => {
      const sensitiveData = {
        userId: 'user123',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        refreshToken: 'refresh_token_here'
      };

      logger.info('Token generated', sensitiveData);

      const logCall = mockConsole.log.mock.calls[0];
      const loggedData = JSON.parse(logCall[0]);
      
      expect(loggedData.data.token).toBe('[REDACTED]');
      expect(loggedData.data.refreshToken).toBe('[REDACTED]');
      expect(loggedData.data.userId).toBe('user123');
    });

    it('should redact secret keys', () => {
      const sensitiveData = {
        environment: 'production',
        apiSecret: 'sk-1234567890abcdef',
        jwtSecret: 'super-secret-jwt-key',
        sessionSecret: 'session-secret-key'
      };

      logger.info('Environment config', sensitiveData);

      const logCall = mockConsole.log.mock.calls[0];
      const loggedData = JSON.parse(logCall[0]);
      
      expect(loggedData.data.apiSecret).toBe('[REDACTED]');
      expect(loggedData.data.jwtSecret).toBe('[REDACTED]');
      expect(loggedData.data.sessionSecret).toBe('[REDACTED]');
      expect(loggedData.data.environment).toBe('production');
    });

    it('should redact Plaid tokens', () => {
      const sensitiveData = {
        userId: 'user123',
        accessToken: 'access-production-12345678-abcd-efgh-ijkl-123456789012',
        publicToken: 'public-production-12345678-abcd-efgh-ijkl-123456789012',
        itemId: 'item123'
      };

      logger.info('Plaid integration', sensitiveData);

      const logCall = mockConsole.log.mock.calls[0];
      const loggedData = JSON.parse(logCall[0]);
      
      expect(loggedData.data.accessToken).toBe('[REDACTED]');
      expect(loggedData.data.publicToken).toBe('[REDACTED]');
      expect(loggedData.data.userId).toBe('user123');
      expect(loggedData.data.itemId).toBe('item123');
    });

    it('should handle nested sensitive data', () => {
      const sensitiveData = {
        user: {
          id: 'user123',
          credentials: {
            password: 'secret123',
            apiKey: 'key_123456789'
          }
        },
        oauth: {
          clientId: 'client123',
          clientSecret: 'oauth_secret_key',
          accessToken: 'oauth_access_token'
        }
      };

      logger.info('User authentication', sensitiveData);

      const logCall = mockConsole.log.mock.calls[0];
      const loggedData = JSON.parse(logCall[0]);
      
      expect(loggedData.data.user.credentials.password).toBe('[REDACTED]');
      expect(loggedData.data.user.credentials.apiKey).toBe('[REDACTED]');
      expect(loggedData.data.oauth.clientSecret).toBe('[REDACTED]');
      expect(loggedData.data.oauth.accessToken).toBe('[REDACTED]');
      expect(loggedData.data.user.id).toBe('user123');
      expect(loggedData.data.oauth.clientId).toBe('client123');
    });

    it('should handle arrays with sensitive data', () => {
      const sensitiveData = {
        users: [
          { id: '1', password: 'secret1' },
          { id: '2', password: 'secret2' }
        ],
        tokens: ['token1', 'token2']
      };

      logger.info('Bulk user operation', sensitiveData);

      const logCall = mockConsole.log.mock.calls[0];
      const loggedData = JSON.parse(logCall[0]);
      
      expect(loggedData.data.users[0].password).toBe('[REDACTED]');
      expect(loggedData.data.users[1].password).toBe('[REDACTED]');
      expect(loggedData.data.users[0].id).toBe('1');
      expect(loggedData.data.users[1].id).toBe('2');
    });

    it('should preserve non-sensitive data', () => {
      const safeData = {
        userId: 'user123',
        familyId: 1,
        email: 'test@example.com',
        name: 'John Doe',
        timestamp: '2024-01-01T00:00:00Z',
        action: 'login'
      };

      logger.info('Safe operation', safeData);

      const logCall = mockConsole.log.mock.calls[0];
      const loggedData = JSON.parse(logCall[0]);
      
      expect(loggedData.data).toEqual(safeData);
    });
  });

  describe('Log Levels', () => {
    it('should handle info level logs', () => {
      logger.info('Info message', { key: 'value' });
      
      expect(mockConsole.log).toHaveBeenCalled();
      const logCall = mockConsole.log.mock.calls[0];
      const loggedData = JSON.parse(logCall[0]);
      
      expect(loggedData.level).toBe('info');
      expect(loggedData.message).toBe('Info message');
    });

    it('should handle error level logs', () => {
      const error = new Error('Test error');
      logger.error('Error message', { error });
      
      expect(mockConsole.error).toHaveBeenCalled();
      const logCall = mockConsole.error.mock.calls[0];
      const loggedData = JSON.parse(logCall[0]);
      
      expect(loggedData.level).toBe('error');
      expect(loggedData.message).toBe('Error message');
      expect(loggedData.data.error).toBeDefined();
    });

    it('should handle warning level logs', () => {
      logger.warn('Warning message', { alert: 'potential issue' });
      
      expect(mockConsole.warn).toHaveBeenCalled();
      const logCall = mockConsole.warn.mock.calls[0];
      const loggedData = JSON.parse(logCall[0]);
      
      expect(loggedData.level).toBe('warn');
      expect(loggedData.message).toBe('Warning message');
    });
  });

  describe('Production vs Development Logging', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should have consistent sanitization in production', () => {
      process.env.NODE_ENV = 'production';
      
      const sensitiveData = {
        password: 'secret123',
        normalData: 'visible'
      };

      logger.info('Production log', sensitiveData);

      const logCall = mockConsole.log.mock.calls[0];
      const loggedData = JSON.parse(logCall[0]);
      
      expect(loggedData.data.password).toBe('[REDACTED]');
      expect(loggedData.data.normalData).toBe('visible');
    });

    it('should have consistent sanitization in development', () => {
      process.env.NODE_ENV = 'development';
      
      const sensitiveData = {
        password: 'secret123',
        normalData: 'visible'
      };

      logger.info('Development log', sensitiveData);

      const logCall = mockConsole.log.mock.calls[0];
      const loggedData = JSON.parse(logCall[0]);
      
      expect(loggedData.data.password).toBe('[REDACTED]');
      expect(loggedData.data.normalData).toBe('visible');
    });
  });
});