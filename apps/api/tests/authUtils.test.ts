import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Request, Response } from 'express';
import { prisma } from '../src/db';
import { 
  verifyFamilyMembership, 
  requireFamilyMembership, 
  requireBudgetAccess,
  requireTaskAccess 
} from '../src/utils/authUtils';

// Mock the database
vi.mock('../src/db', () => ({
  prisma: {
    familyMember: {
      findFirst: vi.fn(),
    },
    budget: {
      findFirst: vi.fn(),
    },
    task: {
      findFirst: vi.fn(),
    },
  },
}));

// Mock logger
vi.mock('../src/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

describe('Authorization Utils', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: vi.Mock;

  beforeEach(() => {
    mockReq = {
      userId: 'user123',
      params: {},
      body: {},
      query: {},
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('verifyFamilyMembership', () => {
    it('should return true when user is family member', async () => {
      const mockMember = { id: 1, userId: 'user123', familyId: 1 };
      (prisma.familyMember.findFirst as any).mockResolvedValue(mockMember);

      const result = await verifyFamilyMembership('user123', 1);
      
      expect(result).toBe(true);
      expect(prisma.familyMember.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user123', familyId: 1 }
      });
    });

    it('should return false when user is not family member', async () => {
      (prisma.familyMember.findFirst as any).mockResolvedValue(null);

      const result = await verifyFamilyMembership('user123', 1);
      
      expect(result).toBe(false);
    });

    it('should return false on database error', async () => {
      (prisma.familyMember.findFirst as any).mockRejectedValue(new Error('Database error'));

      const result = await verifyFamilyMembership('user123', 1);
      
      expect(result).toBe(false);
    });
  });

  describe('requireFamilyMembership middleware', () => {
    it('should call next() when user has family access', async () => {
      mockReq.params = { familyId: '1' };
      const mockMember = { id: 1, userId: 'user123', familyId: 1 };
      (prisma.familyMember.findFirst as any).mockResolvedValue(mockMember);

      await requireFamilyMembership(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 403 when user lacks family access', async () => {
      mockReq.params = { familyId: '1' };
      (prisma.familyMember.findFirst as any).mockResolvedValue(null);

      await requireFamilyMembership(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Access denied to family' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.userId = undefined;
      mockReq.params = { familyId: '1' };

      await requireFamilyMembership(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    });

    it('should work with familyId in body', async () => {
      mockReq.body = { familyId: 1 };
      const mockMember = { id: 1, userId: 'user123', familyId: 1 };
      (prisma.familyMember.findFirst as any).mockResolvedValue(mockMember);

      await requireFamilyMembership(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should work with familyId in query', async () => {
      mockReq.query = { familyId: '1' };
      const mockMember = { id: 1, userId: 'user123', familyId: 1 };
      (prisma.familyMember.findFirst as any).mockResolvedValue(mockMember);

      await requireFamilyMembership(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireBudgetAccess middleware', () => {
    it('should call next() when user has budget access', async () => {
      mockReq.params = { budgetId: '1' };
      const mockBudget = { 
        BudgetID: 1, 
        FamilyID: 1,
        Family: { 
          members: [{ userId: 'user123' }] 
        }
      };
      (prisma.budget.findFirst as any).mockResolvedValue(mockBudget);

      await requireBudgetAccess(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 403 when budget not found', async () => {
      mockReq.params = { budgetId: '1' };
      (prisma.budget.findFirst as any).mockResolvedValue(null);

      await requireBudgetAccess(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Access denied to budget' });
    });

    it('should return 403 when user not in budget family', async () => {
      mockReq.params = { budgetId: '1' };
      const mockBudget = { 
        BudgetID: 1, 
        FamilyID: 1,
        Family: { 
          members: [{ userId: 'otheruser' }] 
        }
      };
      (prisma.budget.findFirst as any).mockResolvedValue(mockBudget);

      await requireBudgetAccess(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Access denied to budget' });
    });
  });

  describe('requireTaskAccess middleware', () => {
    it('should call next() when user has task access', async () => {
      mockReq.params = { taskId: '1' };
      const mockTask = { 
        TaskID: 1,
        Budget: {
          Family: { 
            members: [{ userId: 'user123' }] 
          }
        }
      };
      (prisma.task.findFirst as any).mockResolvedValue(mockTask);

      await requireTaskAccess(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 403 when task not found', async () => {
      mockReq.params = { taskId: '1' };
      (prisma.task.findFirst as any).mockResolvedValue(null);

      await requireTaskAccess(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Access denied to task' });
    });

    it('should handle tasks without budget (global tasks)', async () => {
      mockReq.params = { taskId: '1' };
      const mockTask = { 
        TaskID: 1,
        Budget: null,
        Users: [{ UserID: 'user123' }]
      };
      (prisma.task.findFirst as any).mockResolvedValue(mockTask);

      await requireTaskAccess(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockReq.params = { familyId: '1' };
      (prisma.familyMember.findFirst as any).mockRejectedValue(new Error('Database connection failed'));

      await requireFamilyMembership(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });
});