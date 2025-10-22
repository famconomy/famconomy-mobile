import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { taskController } from '../src/controllers/taskController';
import { prisma } from '../src/db';

// Mock dependencies
vi.mock('../src/db', () => ({
  prisma: {
    familyMember: {
      findFirst: vi.fn(),
    },
    task: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    budget: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('../src/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('../src/services/walletService', () => ({
  addToWallet: vi.fn(),
}));

describe('Task Controller Security', () => {
  let app: express.Application;
  let validToken: string;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware
    app.use((req: any, res, next) => {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token === validToken) {
        req.userId = 'user123';
      }
      next();
    });

    // Add routes
    app.get('/tasks', taskController.getTasks);
    app.get('/tasks/:taskId', taskController.getTaskById);
    app.post('/tasks', taskController.createTask);
    app.put('/tasks/:taskId', taskController.updateTask);
    app.delete('/tasks/:taskId', taskController.deleteTask);

    validToken = jwt.sign({ userId: 'user123' }, 'test-secret');
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /tasks', () => {
    it('should return family tasks when user has family access', async () => {
      const mockMember = { id: 1, userId: 'user123', familyId: 1 };
      const mockTasks = [
        { TaskID: 1, Title: 'Clean room', BudgetID: 1 }
      ];
      
      (prisma.familyMember.findFirst as any).mockResolvedValue(mockMember);
      (prisma.task.findMany as any).mockResolvedValue(mockTasks);

      const response = await request(app)
        .get('/tasks?familyId=1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTasks);
    });

    it('should return 403 when user lacks family access', async () => {
      (prisma.familyMember.findFirst as any).mockResolvedValue(null);

      const response = await request(app)
        .get('/tasks?familyId=1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Access denied to family tasks');
    });

    it('should return personal tasks when no familyId provided', async () => {
      const mockTasks = [
        { TaskID: 1, Title: 'Personal task', UserId: 'user123' }
      ];
      
      (prisma.task.findMany as any).mockResolvedValue(mockTasks);

      const response = await request(app)
        .get('/tasks')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: {
          Users: {
            some: { UserID: 'user123' }
          }
        },
        include: expect.any(Object)
      });
    });
  });

  describe('GET /tasks/:taskId', () => {
    it('should return task when user has access', async () => {
      const mockTask = {
        TaskID: 1,
        Title: 'Test task',
        Budget: {
          Family: {
            members: [{ userId: 'user123' }]
          }
        }
      };
      
      (prisma.task.findFirst as any).mockResolvedValue(mockTask);

      const response = await request(app)
        .get('/tasks/1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTask);
    });

    it('should return 403 when task not found or no access', async () => {
      (prisma.task.findFirst as any).mockResolvedValue(null);

      const response = await request(app)
        .get('/tasks/1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Access denied to task');
    });
  });

  describe('POST /tasks', () => {
    it('should create task when user has budget access', async () => {
      const mockBudget = {
        BudgetID: 1,
        Family: {
          members: [{ userId: 'user123' }]
        }
      };
      const mockTask = {
        TaskID: 1,
        Title: 'New task',
        BudgetID: 1
      };
      
      (prisma.budget.findFirst as any).mockResolvedValue(mockBudget);
      (prisma.task.create as any).mockResolvedValue(mockTask);

      const response = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          Title: 'New task',
          BudgetID: 1,
          RewardAmount: 10
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockTask);
    });

    it('should return 403 when user lacks budget access', async () => {
      (prisma.budget.findFirst as any).mockResolvedValue(null);

      const response = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          Title: 'New task',
          BudgetID: 1
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Access denied to budget');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Title is required');
    });

    it('should sanitize task title', async () => {
      const mockBudget = {
        BudgetID: 1,
        Family: {
          members: [{ userId: 'user123' }]
        }
      };
      const mockTask = { TaskID: 1, Title: 'Clean title', BudgetID: 1 };
      
      (prisma.budget.findFirst as any).mockResolvedValue(mockBudget);
      (prisma.task.create as any).mockResolvedValue(mockTask);

      const response = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          Title: '<script>alert("xss")</script>Clean title',
          BudgetID: 1
        });

      expect(response.status).toBe(201);
      expect(prisma.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          Title: expect.not.stringContaining('<script>')
        }),
        include: expect.any(Object)
      });
    });
  });

  describe('PUT /tasks/:taskId', () => {
    it('should update task when user has access', async () => {
      const mockTask = {
        TaskID: 1,
        Title: 'Original task',
        Budget: {
          Family: {
            members: [{ userId: 'user123' }]
          }
        }
      };
      const updatedTask = { ...mockTask, Title: 'Updated task' };
      
      (prisma.task.findFirst as any).mockResolvedValue(mockTask);
      (prisma.task.update as any).mockResolvedValue(updatedTask);

      const response = await request(app)
        .put('/tasks/1')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ Title: 'Updated task' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedTask);
    });

    it('should return 403 when user lacks task access', async () => {
      (prisma.task.findFirst as any).mockResolvedValue(null);

      const response = await request(app)
        .put('/tasks/1')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ Title: 'Updated task' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Access denied to task');
    });
  });

  describe('DELETE /tasks/:taskId', () => {
    it('should delete task when user has access', async () => {
      const mockTask = {
        TaskID: 1,
        Title: 'Task to delete',
        Budget: {
          Family: {
            members: [{ userId: 'user123' }]
          }
        }
      };
      
      (prisma.task.findFirst as any).mockResolvedValue(mockTask);
      (prisma.task.delete as any).mockResolvedValue(mockTask);

      const response = await request(app)
        .delete('/tasks/1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Task deleted successfully');
    });

    it('should return 403 when user lacks task access', async () => {
      (prisma.task.findFirst as any).mockResolvedValue(null);

      const response = await request(app)
        .delete('/tasks/1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Access denied to task');
    });
  });

  describe('Authorization edge cases', () => {
    it('should handle tasks without budget (personal tasks)', async () => {
      const mockTask = {
        TaskID: 1,
        Title: 'Personal task',
        Budget: null,
        Users: [{ UserID: 'user123' }]
      };
      
      (prisma.task.findFirst as any).mockResolvedValue(mockTask);

      const response = await request(app)
        .get('/tasks/1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTask);
    });

    it('should reject access to other users\' personal tasks', async () => {
      const mockTask = {
        TaskID: 1,
        Title: 'Other user task',
        Budget: null,
        Users: [{ UserID: 'otheruser' }]
      };
      
      (prisma.task.findFirst as any).mockResolvedValue(mockTask);

      const response = await request(app)
        .get('/tasks/1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(403);
    });
  });
});