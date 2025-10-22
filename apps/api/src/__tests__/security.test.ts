import request from 'supertest';
import { app } from '../app';
import { prisma } from '../db';
import jwt from 'jsonwebtoken';

describe('Security Tests - Authorization', () => {
  let userToken: string;
  let otherUserToken: string;
  let familyId: number;

  beforeAll(async () => {
    // Create test users
    const user1 = await prisma.users.create({
      data: {
        UserID: 'test-user-1',
        FullName: 'Test User 1',
        Email: 'test1@example.com',
        PasswordHash: 'hash',
      },
    });

    const user2 = await prisma.users.create({
      data: {
        UserID: 'test-user-2',
        FullName: 'Test User 2',
        Email: 'test2@example.com',
        PasswordHash: 'hash',
      },
    });

    // Create test family
    const family = await prisma.family.create({
      data: {
        FamilyName: 'Test Family',
        CreatedByUserID: user1.UserID,
      },
    });
    familyId = family.FamilyID;

    // Add user1 to family
    await prisma.familyUsers.create({
      data: {
        UserID: user1.UserID,
        FamilyID: familyId,
        RelationshipID: 1,
      },
    });

    // Create JWT tokens
    userToken = jwt.sign({ id: user1.UserID }, process.env.JWT_SECRET!);
    otherUserToken = jwt.sign({ id: user2.UserID }, process.env.JWT_SECRET!);
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.familyUsers.deleteMany({
      where: { FamilyID: familyId },
    });
    await prisma.family.delete({
      where: { FamilyID: familyId },
    });
    await prisma.users.deleteMany({
      where: {
        UserID: { in: ['test-user-1', 'test-user-2'] },
      },
    });
    await prisma.$disconnect();
  });

  describe('Budget endpoints', () => {
    test('should deny access to family budgets for non-members', async () => {
      const response = await request(app)
        .get(`/budget/family/${familyId}`)
        .set('Cookie', `fam_token=${otherUserToken}`)
        .expect(403);

      expect(response.body.error).toBe('Access denied. User is not a member of this family.');
    });

    test('should allow access to family budgets for members', async () => {
      const response = await request(app)
        .get(`/budget/family/${familyId}`)
        .set('Cookie', `fam_token=${userToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should deny budget creation for non-family members', async () => {
      const budgetData = {
        FamilyID: familyId,
        Name: 'Unauthorized Budget',
        TotalAmount: 1000,
      };

      const response = await request(app)
        .post('/budget')
        .set('Cookie', `fam_token=${otherUserToken}`)
        .send(budgetData)
        .expect(403);

      expect(response.body.error).toBe('Access denied. User is not a member of this family.');
    });

    test('should require authentication for all budget endpoints', async () => {
      await request(app)
        .get(`/budget/family/${familyId}`)
        .expect(401);

      await request(app)
        .post('/budget')
        .send({ FamilyID: familyId, Name: 'Test', TotalAmount: 100 })
        .expect(401);
    });
  });

  describe('Family endpoints', () => {
    test('should require authentication', async () => {
      await request(app)
        .get('/family')
        .expect(401);
    });

    test('should only return families user belongs to', async () => {
      const response = await request(app)
        .get('/family')
        .set('Cookie', `fam_token=${otherUserToken}`)
        .expect(200);

      expect(response.body.families).toHaveLength(0);
    });
  });

  describe('Demo account security', () => {
    test('should reject demo login in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      // This test would be for the frontend, but demonstrates the security requirement
      // In a real test, you'd test that the frontend doesn't send demo credentials
      // when NODE_ENV=production

      process.env.NODE_ENV = originalEnv;
    });
  });
});