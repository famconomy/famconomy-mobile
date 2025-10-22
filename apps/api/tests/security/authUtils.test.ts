import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { 
  verifyFamilyMembership, 
  verifyBudgetAccess, 
  verifyTaskAccess,
  requireFamilyMembership,
  requireBudgetAccess,
  requireTaskAccess
} from '../../src/utils/authUtils';
import { prisma } from '../../src/db';

// Mock Prisma
vi.mock('../../src/db', () => ({
  prisma: {
    familyUsers: {
      findFirst: vi.fn()
    },
    budget: {
      findFirst: vi.fn()
    },
    task: {
      findFirst: vi.fn()
    }
  }
}));

// Mock logger
vi.mock('../../src/utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}));

// Extend Request interface for tests
interface TestRequest extends Request {
  userId?: string;
}

describe('Authorization Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('verifyFamilyMembership', () => {
    it('should return true when user is family member', async () => {
      (prisma.familyUsers.findFirst as any).mockResolvedValue({ UserID: 'user1', FamilyID: 1 });

      const result = await verifyFamilyMembership('user1', 1);
      
      expect(result).toBe(true);
      expect(prisma.familyUsers.findFirst).toHaveBeenCalledWith({
        where: {
          UserID: 'user1',
          FamilyID: 1
        }
      });
    });

    it('should return false when user is not family member', async () => {
      (prisma.familyUsers.findFirst as any).mockResolvedValue(null);

      const result = await verifyFamilyMembership('user1', 1);
      
      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      (prisma.familyUsers.findFirst as any).mockRejectedValue(new Error('DB Error'));

      const result = await verifyFamilyMembership('user1', 1);
      
      expect(result).toBe(false);
    });
  });

  describe('verifyBudgetAccess', () => {
    it('should return true when user has budget access', async () => {
      (prisma.budget.findFirst as any).mockResolvedValue({ id: 1 });

      const result = await verifyBudgetAccess('user1', 1);
      
      expect(result).toBe(true);
    });

    it('should return false when user lacks budget access', async () => {
      (prisma.budget.findFirst as any).mockResolvedValue(null);

      const result = await verifyBudgetAccess('user1', 1);
      
      expect(result).toBe(false);
    });
  });

  describe('verifyTaskAccess', () => {
    it('should return true when user has task access', async () => {
      (prisma.task.findFirst as any).mockResolvedValue({ id: 1 });

      const result = await verifyTaskAccess('user1', 1);
      
      expect(result).toBe(true);
    });

    it('should return false when user lacks task access', async () => {
      (prisma.task.findFirst as any).mockResolvedValue(null);

      const result = await verifyTaskAccess('user1', 1);
      
      expect(result).toBe(false);
    });
  });

  describe('Middleware Guards', () => {
    let mockReq: TestRequest;
    let mockRes: Partial<Response>;
    let mockNext: vi.Mock;

    beforeEach(() => {
      mockReq = {
        userId: 'user1',
        params: { familyId: '1' }
      } as TestRequest;
      mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      mockNext = vi.fn();
    });

    describe('requireFamilyMembership', () => {
      it('should call next() when user is family member', async () => {
        (prisma.familyUsers.findFirst as any).mockResolvedValue({ UserID: 'user1', FamilyID: 1 });

        const middleware = requireFamilyMembership();
        await middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
      });

      it('should return 401 when userId is missing', async () => {
        mockReq.userId = undefined;

        const middleware = requireFamilyMembership();
        await middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authentication required' });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should return 400 when familyId is missing', async () => {
        mockReq.params = {};

        const middleware = requireFamilyMembership();
        await middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid familyId parameter' });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should return 403 when user is not family member', async () => {
        (prisma.familyUsers.findFirst as any).mockResolvedValue(null);

        const middleware = requireFamilyMembership();
        await middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Access denied. User is not a member of this family.' });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('requireBudgetAccess', () => {
      beforeEach(() => {
        mockReq.params = { budgetId: '1' };
      });

      it('should call next() when user has budget access', async () => {
        (prisma.budget.findFirst as any).mockResolvedValue({ id: 1 });

        const middleware = requireBudgetAccess();
        await middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
      });

      it('should return 403 when user lacks budget access', async () => {
        (prisma.budget.findFirst as any).mockResolvedValue(null);

        const middleware = requireBudgetAccess();
        await middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockNext).not.toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty userId', async () => {
      const result = await verifyFamilyMembership('', 1);
      expect(result).toBe(false);
    });

    it('should handle zero familyId', async () => {
      const result = await verifyFamilyMembership('user1', 0);
      expect(result).toBe(false);
    });

    it('should handle negative familyId', async () => {
      const result = await verifyFamilyMembership('user1', -1);
      expect(result).toBe(false);
    });
  });
});