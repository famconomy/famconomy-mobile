import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { messagesController } from '../src/controllers/messagesController';
import { prisma } from '../src/db';

// Mock dependencies
vi.mock('../src/db', () => ({
  prisma: {
    familyMember: {
      findFirst: vi.fn(),
    },
    message: {
      findMany: vi.fn(),
      create: vi.fn(),
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

// Mock socket instance
const mockSocket = {
  to: vi.fn().mockReturnThis(),
  emit: vi.fn(),
};

vi.mock('../src/app', () => ({
  io: mockSocket,
}));

describe('Messages Controller Security', () => {
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
    app.get('/messages/:familyId', messagesController.getMessages);
    app.post('/messages', messagesController.createMessage);

    // Create valid JWT token for testing
    validToken = jwt.sign({ userId: 'user123' }, 'test-secret');
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /messages/:familyId', () => {
    it('should return messages when user has family access', async () => {
      const mockMember = { id: 1, userId: 'user123', familyId: 1 };
      const mockMessages = [
        { id: 1, content: 'Hello', userId: 'user123', familyId: 1 }
      ];
      
      (prisma.familyMember.findFirst as any).mockResolvedValue(mockMember);
      (prisma.message.findMany as any).mockResolvedValue(mockMessages);

      const response = await request(app)
        .get('/messages/1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockMessages);
      expect(prisma.familyMember.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user123', familyId: 1 }
      });
    });

    it('should return 403 when user lacks family access', async () => {
      (prisma.familyMember.findFirst as any).mockResolvedValue(null);

      const response = await request(app)
        .get('/messages/1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Access denied to family messages');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/messages/1');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should handle database errors gracefully', async () => {
      (prisma.familyMember.findFirst as any).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/messages/1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to retrieve messages');
    });
  });

  describe('POST /messages', () => {
    it('should create message when user has family access', async () => {
      const mockMember = { id: 1, userId: 'user123', familyId: 1 };
      const mockMessage = { 
        id: 1, 
        content: 'New message', 
        userId: 'user123', 
        familyId: 1,
        createdAt: new Date()
      };
      
      (prisma.familyMember.findFirst as any).mockResolvedValue(mockMember);
      (prisma.message.create as any).mockResolvedValue(mockMessage);

      const response = await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          content: 'New message',
          familyId: 1
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockMessage);
      expect(prisma.message.create).toHaveBeenCalledWith({
        data: {
          content: 'New message',
          userId: 'user123',
          familyId: 1
        },
        include: {
          user: {
            select: {
              UserID: true,
              Name: true,
              ProfilePicture: true
            }
          }
        }
      });
    });

    it('should return 403 when user lacks family access', async () => {
      (prisma.familyMember.findFirst as any).mockResolvedValue(null);

      const response = await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          content: 'New message',
          familyId: 1
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Access denied to family');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should emit socket event on successful message creation', async () => {
      const mockMember = { id: 1, userId: 'user123', familyId: 1 };
      const mockMessage = { 
        id: 1, 
        content: 'New message', 
        userId: 'user123', 
        familyId: 1,
        user: { UserID: 'user123', Name: 'Test User' }
      };
      
      (prisma.familyMember.findFirst as any).mockResolvedValue(mockMember);
      (prisma.message.create as any).mockResolvedValue(mockMessage);

      await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          content: 'New message',
          familyId: 1
        });

      expect(mockSocket.to).toHaveBeenCalledWith('family_1');
      expect(mockSocket.emit).toHaveBeenCalledWith('newMessage', mockMessage);
    });
  });

  describe('Input validation and sanitization', () => {
    it('should sanitize message content', async () => {
      const mockMember = { id: 1, userId: 'user123', familyId: 1 };
      const mockMessage = { 
        id: 1, 
        content: 'Clean message', 
        userId: 'user123', 
        familyId: 1
      };
      
      (prisma.familyMember.findFirst as any).mockResolvedValue(mockMember);
      (prisma.message.create as any).mockResolvedValue(mockMessage);

      const response = await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          content: '<script>alert("xss")</script>Clean message',
          familyId: 1
        });

      expect(response.status).toBe(201);
      // Verify that HTML tags are stripped/sanitized
      expect(prisma.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            content: expect.not.stringContaining('<script>')
          })
        })
      );
    });

    it('should reject extremely long messages', async () => {
      const longMessage = 'a'.repeat(10001); // Assuming 10000 char limit

      const response = await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          content: longMessage,
          familyId: 1
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('too long');
    });
  });
});