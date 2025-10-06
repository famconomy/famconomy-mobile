import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';
import { logger } from './logger';

/**
 * Verify that a user belongs to a specific family
 * @param userId - The user ID to check
 * @param familyId - The family ID to verify membership in
 * @returns Promise<boolean> - True if user is a member, false otherwise
 */
export const verifyFamilyMembership = async (userId: string, familyId: number): Promise<boolean> => {
  try {
    const membership = await prisma.familyUsers.findFirst({
      where: {
        UserID: userId,
        FamilyID: familyId,
      },
    });
    return !!membership;
  } catch (error) {
    logger.error('Error verifying family membership', { userId, familyId, error });
    return false;
  }
};

/**
 * Verify that a user owns or can access a specific budget
 * @param userId - The user ID to check
 * @param budgetId - The budget ID to verify access to
 * @returns Promise<boolean> - True if user can access, false otherwise
 */
export const verifyBudgetAccess = async (userId: string, budgetId: number): Promise<boolean> => {
  try {
    const budget = await prisma.budget.findFirst({
      where: {
        BudgetID: budgetId,
        Family: {
          FamilyUsers: {
            some: {
              UserID: userId,
            },
          },
        },
      },
    });
    return !!budget;
  } catch (error) {
    logger.error('Error verifying budget access', { userId, budgetId, error });
    return false;
  }
};

/**
 * Verify that a user can access a specific task
 * @param userId - The user ID to check
 * @param taskId - The task ID to verify access to
 * @returns Promise<boolean> - True if user can access, false otherwise
 */
export const verifyTaskAccess = async (userId: string, taskId: number): Promise<boolean> => {
  try {
    const task = await prisma.task.findFirst({
      where: {
        TaskID: taskId,
        Family: {
          FamilyUsers: {
            some: {
              UserID: userId,
            },
          },
        },
      },
    });
    return !!task;
  } catch (error) {
    logger.error('Error verifying task access', { userId, taskId, error });
    return false;
  }
};

/**
 * Verify that a user can access a specific message thread/family chat
 */
export const verifyMessageAccess = async (userId: string, familyId: number): Promise<boolean> => {
  return verifyFamilyMembership(userId, familyId);
};

/**
 * Verify that a user can access transaction data for a specific family
 */
export const verifyTransactionAccess = async (userId: string, budgetId: number): Promise<boolean> => {
  return verifyBudgetAccess(userId, budgetId);
};

/**
 * Verify that a user can access notifications for a specific family
 */
export const verifyNotificationAccess = async (userId: string, notificationId: number): Promise<boolean> => {
  try {
    const notification = await prisma.notifications.findFirst({
      where: {
        NotificationID: notificationId,
        Users: {
          FamilyUsers: {
            some: {
              UserID: userId,
            },
          },
        },
      },
    });
    return !!notification;
  } catch (error) {
    logger.error('Error verifying notification access', { userId, notificationId, error });
    return false;
  }
};

/**
 * Middleware to require family membership for route parameters
 */
export const requireFamilyMembership = (paramName: string = 'familyId') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;
    const familyId = parseInt(req.params[paramName]);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!familyId || isNaN(familyId)) {
      return res.status(400).json({ error: `Invalid ${paramName} parameter` });
    }

    try {
      const isMember = await verifyFamilyMembership(userId, familyId);
      if (!isMember) {
        logger.warn('Unauthorized family access attempt', { userId, familyId, endpoint: req.path });
        return res.status(403).json({ error: 'Access denied. User is not a member of this family.' });
      }

      next();
    } catch (error) {
      logger.error('Error in family membership middleware', { userId, familyId, error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
};

/**
 * Middleware to require budget access for route parameters
 */
export const requireBudgetAccess = (paramName: string = 'budgetId') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;
    const budgetId = parseInt(req.params[paramName]) || parseInt(req.body.BudgetID);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!budgetId || isNaN(budgetId)) {
      return res.status(400).json({ error: `Invalid ${paramName} parameter` });
    }

    try {
      const hasAccess = await verifyBudgetAccess(userId, budgetId);
      if (!hasAccess) {
        logger.warn('Unauthorized budget access attempt', { userId, budgetId, endpoint: req.path });
        return res.status(403).json({ error: 'Access denied. User cannot access this budget.' });
      }

      next();
    } catch (error) {
      logger.error('Error in budget access middleware', { userId, budgetId, error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
};

/**
 * Middleware to require task access for route parameters
 */
export const requireTaskAccess = (paramName: string = 'taskId') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;
    const taskId = parseInt(req.params[paramName]);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!taskId || isNaN(taskId)) {
      return res.status(400).json({ error: `Invalid ${paramName} parameter` });
    }

    try {
      const hasAccess = await verifyTaskAccess(userId, taskId);
      if (!hasAccess) {
        logger.warn('Unauthorized task access attempt', { userId, taskId, endpoint: req.path });
        return res.status(403).json({ error: 'Access denied. User cannot access this task.' });
      }

      next();
    } catch (error) {
      logger.error('Error in task access middleware', { userId, taskId, error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
};