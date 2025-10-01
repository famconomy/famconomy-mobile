
import { Request, Response } from 'express';
import { prisma } from '../db';

export const getAllRelationships = async (req: Request, res: Response) => {
  try {
    const relationships = await prisma.relationship.findMany();
    res.json(relationships);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to fetch relationships', error: err.message });
  }
};
