
import { Request, Response } from 'express';
import { prisma } from '../db';

export const getAllTaskStatuses = async (req: Request, res: Response) => {
  console.log('--- DEBUG: getAllTaskStatuses called ---');
  try {
    const pendingStatus = await prisma.taskStatus.upsert({
      where: { TaskStatusID: 1 },
      update: { StatusName: 'Pending' },
      create: {
        StatusName: 'Pending',
      },
    });

    const completedStatus = await prisma.taskStatus.upsert({
      where: { TaskStatusID: 2 },
      update: { StatusName: 'Completed' },
      create: {
        StatusName: 'Completed',
      },
    });

    const taskStatuses = await prisma.taskStatus.findMany();
    res.json(taskStatuses);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to fetch task statuses', error: err.message });
  }
};
