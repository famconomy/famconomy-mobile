import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { budgetController } from '../../src/controllers/budgetController';
import { requireFamilyMembership } from '../../src/utils/authUtils';
import { authenticateToken } from '../../src/middleware/auth';

// Mock dependencies
vi.mock('../../src/db', () => ({
  prisma: {
    familyUsers: {
      findFirst: vi.fn()
    },
    budget: {
      findFirst: vi.fn(),
      findMany: vi.fn()
    }
  }
}));

vi.mock('../../src/utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}));

vi.mock('../../src/middleware/auth', () => ({
  authenticateToken: vi.fn((req, res, next) => {
    // Mock successful authentication
    req.userId = 'test-user-id';
    next();
  })
}));

describe('Budget Endpoint Security', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Setup protected route
    app.get('/budget/family/:familyId', 
      authenticateToken,
      requireFamilyMembership(),
      budgetController.getBudgetsForFamily
    );

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Family Membership Authorization', () => {
    it('should allow access when user is family member', async () => {
      // Mock successful family membership verification
      const { prisma } = await import('../../src/db');
      (prisma.familyUsers.findFirst as any).mockResolvedValue({ UserID: 'test-user-id', FamilyID: 1 });
      (prisma.budget.findMany as any).mockResolvedValue([]);

      const response = await request(app)
        .get('/budget/family/1')
        .expect(200);

      expect(response.status).toBe(200);
    });

    it('should deny access when user is not family member', async () => {
      // Mock failed family membership verification
      const { prisma } = await import('../../src/db');
      (prisma.familyUsers.findFirst as any).mockResolvedValue(null);

      const response = await request(app)
        .get('/budget/family/1')
        .expect(403);

      expect(response.body.error).toBe('Access denied. User is not a member of this family.');
    });

    it('should deny access with invalid family ID', async () => {
      const response = await request(app)
        .get('/budget/family/invalid')
        .expect(400);

      expect(response.body.error).toBe('Invalid familyId parameter');
    });

    it('should deny access when authentication fails', async () => {
      // Mock authentication failure
      vi.mocked(authenticateToken).mockImplementation((req, res, next) => {
        return res.status(401).json({ error: 'Unauthorized' });
      });

      const response = await request(app)
        .get('/budget/family/1')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('Input Validation', () => {
    it('should handle malformed family ID gracefully', async () => {
      const response = await request(app)
        .get('/budget/family/0')
        .expect(400);

      expect(response.body.error).toBe('Invalid familyId parameter');
    });

    it('should handle negative family ID', async () => {
      const response = await request(app)
        .get('/budget/family/-1')
        .expect(400);

      expect(response.body.error).toBe('Invalid familyId parameter');
    });

    it('should handle very large family ID', async () => {
      const response = await request(app)
        .get('/budget/family/999999999999999')
        .expect(403); // Will fail authorization check

      // Should still process the request but fail at authorization
      expect(response.status).toBe(403);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error
      const { prisma } = await import('../../src/db');
      (prisma.familyUsers.findFirst as any).mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/budget/family/1')
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
    });

    it('should not leak sensitive information in error responses', async () => {
      // Mock database error with sensitive info
      const { prisma } = await import('../../src/db');
      (prisma.familyUsers.findFirst as any).mockRejectedValue(new Error('Connection failed: password=secret123'));

      const response = await request(app)
        .get('/budget/family/1')
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
      expect(response.body.error).not.toContain('password');
      expect(response.body.error).not.toContain('secret123');
    });
  });
});