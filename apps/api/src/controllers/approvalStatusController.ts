
import { Request, Response } from 'express';
import { prisma } from '../db';

export const getAllApprovalStatuses = async (req: Request, res: Response) => {
  try {
    const approvalStatuses = await prisma.approvalStatus.findMany();
    res.json(approvalStatuses);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to fetch approval statuses', error: err.message });
  }
};
