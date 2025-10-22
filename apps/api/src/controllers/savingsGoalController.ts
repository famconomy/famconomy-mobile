
import { Request, Response } from 'express';
import { prisma } from '../db';

// Get all savings goals for a family
export const getSavingsGoals = async (req: Request, res: Response) => {
  const { familyId } = req.params;
  try {
    const savingsGoals = await prisma.savingsGoal.findMany({
      where: { FamilyID: parseInt(familyId) },
    });
    res.json(savingsGoals);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new savings goal
export const createSavingsGoal = async (req: Request, res: Response) => {
  const { FamilyID, Name, TargetAmount, CurrentAmount, Deadline, CreatedByUserID } = req.body;

  if (!Name || !TargetAmount || !CurrentAmount) {
    return res.status(400).json({ error: 'Name, TargetAmount, and CurrentAmount are required.' });
  }

  if (typeof TargetAmount !== 'number' || typeof CurrentAmount !== 'number') {
    return res.status(400).json({ error: 'TargetAmount and CurrentAmount must be numbers.' });
  }

  try {
    const savingsGoal = await prisma.savingsGoal.create({
      data: {
        FamilyID,
        Name,
        TargetAmount,
        CurrentAmount,
        Deadline,
        CreatedByUserID,
      },
    });
    res.status(201).json(savingsGoal);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update a savings goal
export const updateSavingsGoal = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { Name, TargetAmount, CurrentAmount, Deadline } = req.body;

  if (!Name || !TargetAmount || !CurrentAmount) {
    return res.status(400).json({ error: 'Name, TargetAmount, and CurrentAmount are required.' });
  }

  if (typeof TargetAmount !== 'number' || typeof CurrentAmount !== 'number') {
    return res.status(400).json({ error: 'TargetAmount and CurrentAmount must be numbers.' });
  }

  try {
    const updatedSavingsGoal = await prisma.savingsGoal.update({
      where: { SavingsGoalID: parseInt(id) },
      data: {
        Name,
        TargetAmount,
        CurrentAmount,
        Deadline,
      },
    });
    res.json(updatedSavingsGoal);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a savings goal
export const deleteSavingsGoal = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.savingsGoal.delete({
      where: { SavingsGoalID: parseInt(id) },
    });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
