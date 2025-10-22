import { Request, Response } from 'express';
import { Prisma, WalletLedgerType } from '@prisma/client';
import express from 'express';
import { prisma } from '../db';
import { authenticateToken } from '../middleware/authMiddleware';
import { logger } from '../utils/logger';
import { verifyFamilyMembership, verifyTaskAccess } from '../utils/authUtils';
import { constructFullName } from '../utils/userUtils';
import { _createNotificationInternal } from './notificationController';
import { transferFromFamilyToUserTx } from '../services/walletService';

// Create a new task
interface CreateTaskParams {
  FamilyID: number;
  Title: string;
  Description?: string;
  DueDate?: Date;
  AssignedToUserID?: string;
  CreatedByUserID?: string;
  IsCustom?: boolean;
  SuggestedByChildID?: string;
  ApprovedByUserID?: string;
  RewardType?: string;
  RewardValue?: string;
}

export const _createTaskInternal = async (params: CreateTaskParams) => {
  const { FamilyID, Title, Description, DueDate, AssignedToUserID, CreatedByUserID, IsCustom, SuggestedByChildID, ApprovedByUserID, RewardType, RewardValue } = params;

  // Find or create the default task status
  const taskStatus = await prisma.taskStatus.upsert({
    where: { TaskStatusID: 1 },
    update: { StatusName: 'Pending' },
    create: {
      TaskStatusID: 1,
      StatusName: 'Pending',
    },
  });

  const completedStatus = await prisma.taskStatus.upsert({
    where: { TaskStatusID: 2 },
    update: { StatusName: 'Completed' },
    create: {
      TaskStatusID: 2,
      StatusName: 'Completed',
    },
  });

  // Find or create the default approval status
  const approvalStatusNotApproved = await prisma.approvalStatus.upsert({
    where: { ApprovalStatusID: 1 },
    update: { StatusName: 'Not Approved' },
    create: {
      ApprovalStatusID: 1,
      StatusName: 'Not Approved',
    },
  });

  const approvalStatusPendingApproval = await prisma.approvalStatus.upsert({
    where: { ApprovalStatusID: 2 },
    update: { StatusName: 'Pending Approval' },
    create: {
      ApprovalStatusID: 2,
      StatusName: 'Pending Approval',
    },
  });

  const approvalStatusApproved = await prisma.approvalStatus.upsert({
    where: { ApprovalStatusID: 3 },
    update: { StatusName: 'Approved' },
    create: {
      ApprovalStatusID: 3,
      StatusName: 'Approved',
    },
  });

  const approvalStatusNoApprovalRequired = await prisma.approvalStatus.upsert({
    where: { ApprovalStatusID: 4 },
    update: { StatusName: 'No Approval Required' },
    create: {
      ApprovalStatusID: 4,
      StatusName: 'No Approval Required',
    },
  });

  const task = await prisma.task.create({
    data: {
      FamilyID,
      Title,
      Description,
      DueDate,
      AssignedToUserID,
      CreatedByUserID,
      TaskStatusID: taskStatus.TaskStatusID,
      IsCustom,
      SuggestedByChildID,
      ApprovalStatusID: approvalStatusNoApprovalRequired.ApprovalStatusID,
      ApprovedByUserID,
      RewardType,
      RewardValue,
    },
  });

  // Create notification for assigned user
  if (AssignedToUserID) {
    await _createNotificationInternal({
      userId: AssignedToUserID,
      message: `New task assigned: ${Title}`,
      type: 'task',
            link: '/tasks',
    });
  }

  return task; // Return the created task
};

const TASK_COMPLETED_STATUS_ID = 2;
const APPROVAL_STATUS_APPROVED = 3;
const APPROVAL_STATUS_NOT_REQUIRED = 4;

const decimalToCents = (value: Prisma.Decimal | number | string) => {
  const intermediate =
    value instanceof Prisma.Decimal ? value.toString() : value;

  const numericValue =
    typeof intermediate === 'string' ? Number(intermediate) : intermediate;

  if (typeof numericValue !== 'number' || !Number.isFinite(numericValue)) {
    throw new Error('Invalid reward value');
  }

  return BigInt(Math.round(numericValue * 100));
};

const canAutoRewardTask = (task: any) => {
  if (!task) return false;
  if (task.rewardLedgerId) return false;
  if (task.RewardType !== 'currency') return false;
  if (!task.RewardValue) return false;
  if (task.TaskStatusID !== TASK_COMPLETED_STATUS_ID) return false;
  if (![APPROVAL_STATUS_APPROVED, APPROVAL_STATUS_NOT_REQUIRED].includes(task.ApprovalStatusID)) return false;
  if (!task.AssignedToUserID) return false;
  return true;
};

const maybeTriggerTaskReward = async (task: any, tx: Prisma.TransactionClient) => {
  if (!canAutoRewardTask(task)) {
    return null;
  }

  const amountCents = decimalToCents(task.RewardValue);

  const ledger = await transferFromFamilyToUserTx(
    {
      familyId: task.FamilyID,
      userId: task.AssignedToUserID,
      amountCents,
      description: `Task reward: ${task.Title}`,
      referenceType: 'task',
      referenceId: task.TaskID.toString(),
      type: WalletLedgerType.TASK_REWARD,
      initiatedByUserId: task.ApprovedByUserID ?? task.CreatedByUserID,
    },
    tx
  );

  await tx.task.update({
    where: { TaskID: task.TaskID },
    data: {
      rewardLedgerId: ledger.id,
    },
  });

  return ledger;
};

export const createTask = async (req: Request, res: Response) => {
  const { FamilyID, Title, Description, DueDate, AssignedToUserID, CreatedByUserID, IsCustom, SuggestedByChildID, ApprovedByUserID, RewardType, RewardValue } = req.body;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!Title) {
    return res.status(400).json({ error: 'Title is required.' });
  }

  if (!FamilyID) {
    return res.status(400).json({ error: 'FamilyID is required.' });
  }

  try {
    // Verify user belongs to the family
    const isMember = await verifyFamilyMembership(userId, FamilyID);
    if (!isMember) {
      logger.warn('Unauthorized task creation attempt', { userId, familyId: FamilyID });
      return res.status(403).json({ error: 'Access denied. User is not a member of this family.' });
    }
    const task = await _createTaskInternal({
      FamilyID,
      Title,
      Description,
      DueDate: DueDate ? new Date(DueDate) : undefined, // Convert to Date object
      AssignedToUserID,
      CreatedByUserID,
      IsCustom,
      SuggestedByChildID,
      ApprovedByUserID,
      RewardType,
      RewardValue,
    });
    res.status(201).json(task);
  } catch (error) {
    logger.error('Error creating task', { userId, familyId: FamilyID, error });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all tasks for a family
export const getTasks = async (req: Request, res: Response) => {
  const { familyId } = req.params;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const familyIdNumber = parseInt(familyId);
  if (isNaN(familyIdNumber)) {
    return res.status(400).json({ error: 'Invalid family ID' });
  }

  try {
    // Verify user belongs to the family
    const isMember = await verifyFamilyMembership(userId, familyIdNumber);
    if (!isMember) {
      logger.warn('Unauthorized task access attempt', { userId, familyId: familyIdNumber });
      return res.status(403).json({ error: 'Access denied. User is not a member of this family.' });
    }

    const tasks = await prisma.task.findMany({
      where: { FamilyID: familyIdNumber },
      include: {
        attachments: true,
        Users_Task_AssignedToUserIDToUsers: {
          select: {
            UserID: true,
            FirstName: true,
            LastName: true,
          },
        },
        Users_Task_CreatedByUserIDToUsers: {
          select: {
            UserID: true,
            FirstName: true,
            LastName: true,
          },
        },
      },
    });

    // Transform user data to include fullName for frontend compatibility
    const transformedTasks = tasks.map(task => ({
      ...task,
      Users_Task_AssignedToUserIDToUsers: task.Users_Task_AssignedToUserIDToUsers ? {
        ...task.Users_Task_AssignedToUserIDToUsers,
        fullName: constructFullName(
          task.Users_Task_AssignedToUserIDToUsers.FirstName,
          task.Users_Task_AssignedToUserIDToUsers.LastName
        )
      } : null,
      Users_Task_CreatedByUserIDToUsers: task.Users_Task_CreatedByUserIDToUsers ? {
        ...task.Users_Task_CreatedByUserIDToUsers,
        fullName: constructFullName(
          task.Users_Task_CreatedByUserIDToUsers.FirstName,
          task.Users_Task_CreatedByUserIDToUsers.LastName
        )
      } : null
    }));

    res.json(transformedTasks);
  } catch (error) {
    logger.error('Error fetching tasks', { userId, familyId: familyIdNumber, error });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get task by ID
export const getTaskById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const taskId = parseInt(id);
  if (isNaN(taskId)) {
    return res.status(400).json({ error: 'Invalid task ID' });
  }

  try {
    // Verify user can access this task
    const hasAccess = await verifyTaskAccess(userId, taskId);
    if (!hasAccess) {
      logger.warn('Unauthorized task access attempt', { userId, taskId });
      return res.status(403).json({ error: 'Access denied. User cannot access this task.' });
    }

    const task = await prisma.task.findUnique({
      where: { TaskID: taskId },
      include: {
        attachments: true,
        Users_Task_AssignedToUserIDToUsers: {
          select: {
            UserID: true,
            FirstName: true,
            LastName: true,
          },
        },
        Users_Task_CreatedByUserIDToUsers: {
          select: {
            UserID: true,
            FirstName: true,
            LastName: true,
          },
        },
      },
    });
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Transform user data to include fullName for frontend compatibility
    const transformedTask = {
      ...task,
      Users_Task_AssignedToUserIDToUsers: task.Users_Task_AssignedToUserIDToUsers ? {
        ...task.Users_Task_AssignedToUserIDToUsers,
        fullName: constructFullName(
          task.Users_Task_AssignedToUserIDToUsers.FirstName,
          task.Users_Task_AssignedToUserIDToUsers.LastName
        )
      } : null,
      Users_Task_CreatedByUserIDToUsers: task.Users_Task_CreatedByUserIDToUsers ? {
        ...task.Users_Task_CreatedByUserIDToUsers,
        fullName: constructFullName(
          task.Users_Task_CreatedByUserIDToUsers.FirstName,
          task.Users_Task_CreatedByUserIDToUsers.LastName
        )
      } : null
    };
    
    res.json(transformedTask);
  } catch (error) {
    logger.error('Error fetching task', { userId, taskId, error });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update a task
export const updateTask = async (req: Request, res: Response) => {
  console.log('Request Body:', req.body);
  const { id } = req.params;
  const taskId = parseInt(id, 10);

  if (Number.isNaN(taskId)) {
    return res.status(400).json({ error: 'Invalid task id' });
  }

  const { Title, Description, DueDate, AssignedToUserID, TaskStatusID, ApprovalStatusID, ApprovedByUserID, RewardType, RewardValue } = req.body;

  try {
    const updateData: { [key: string]: any } = {};
    if (Title !== undefined) updateData.Title = Title;
    if (Description !== undefined) updateData.Description = Description;
    if (DueDate !== undefined) updateData.DueDate = DueDate;
    if (AssignedToUserID !== undefined) updateData.AssignedToUserID = AssignedToUserID;
    if (TaskStatusID !== undefined) updateData.TaskStatusID = TaskStatusID;
    if (ApprovalStatusID !== undefined) updateData.ApprovalStatusID = ApprovalStatusID;
    if (ApprovedByUserID !== undefined) updateData.ApprovedByUserID = ApprovedByUserID;
    if (RewardType !== undefined) updateData.RewardType = RewardType;
    if (RewardValue !== undefined) updateData.RewardValue = RewardValue;

    const updatedTask = await prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { TaskID: taskId },
        data: updateData,
      });

      await maybeTriggerTaskReward(updated, tx);

      const finalTask = await tx.task.findUnique({ where: { TaskID: taskId } });

      if (!finalTask) {
        throw new Error('Task not found after update');
      }

      return finalTask;
    });

    res.json(updatedTask);
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message.includes('Insufficient balance')) {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a task
export const deleteTask = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.task.delete({
      where: { TaskID: parseInt(id) },
    });
    res.status(204).send(); // No content to send back
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const uploadAttachment = async (req: Request, res: Response) => {
  console.log('req.file:', req.file);
  console.log('req.body:', req.body);
  const { id } = req.params;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  try {
    const attachment = await prisma.taskAttachment.create({
      data: {
        TaskID: parseInt(id),
        Url: `/uploads/${file.filename}`,
        FileName: file.originalname,
        FileType: file.mimetype,
        FileSize: file.size,
      },
    });
    res.status(201).json(attachment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a task attachment
export const deleteTaskAttachment = async (req: Request, res: Response) => {
  const { taskId, attachmentId } = req.params;

  try {
    // Optional: Add logic here to verify that the user has permission to delete this attachment
    // e.g., check if the attachment belongs to a task in their family

    await prisma.taskAttachment.delete({
      where: {
        AttachmentID: parseInt(attachmentId),
        TaskID: parseInt(taskId),
      },
    });
    res.status(204).send(); // No content to send back
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
