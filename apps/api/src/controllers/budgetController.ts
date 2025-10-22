import { Request, Response } from 'express';
import { prisma } from '../db';
import { verifyFamilyMembership, verifyBudgetAccess } from '../utils/authUtils';

// Create a new budget
export const createBudget = async (req: Request & { userId?: string }, res: Response) => {
  const { FamilyID, Name, TotalAmount, StartDate, EndDate, CreatedByUserID } = req.body;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!Name || !TotalAmount) {
    return res.status(400).json({ error: 'Name and TotalAmount are required.' });
  }

  if (typeof TotalAmount !== 'number') {
    return res.status(400).json({ error: 'TotalAmount must be a number.' });
  }

  if (!FamilyID) {
    return res.status(400).json({ error: 'FamilyID is required.' });
  }

  try {
    // Verify user belongs to the family
    const isMember = await verifyFamilyMembership(userId, FamilyID);
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied. User is not a member of this family.' });
    }

    const budget = await prisma.budget.create({
      data: {
        FamilyID,
        Name,
        TotalAmount,
        StartDate,
        EndDate,
        CreatedByUserID: userId,
      },
    });
    res.status(201).json(budget);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all budgets for a family
export const getBudgets = async (req: Request & { userId?: string }, res: Response) => {
  const { familyId } = req.params;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const familyIdNumber = parseInt(familyId);
  if (isNaN(familyIdNumber)) {
    return res.status(400).json({ error: 'Invalid family ID' });
  }

  try {
    // Verify user belongs to the family
    const isMember = await verifyFamilyMembership(userId, familyIdNumber);
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied. User is not a member of this family.' });
    }

    const budgets = await prisma.budget.findMany({
      where: { FamilyID: familyIdNumber },
    });
    res.json(budgets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get budget by ID
export const getBudgetById = async (req: Request & { userId?: string }, res: Response) => {
  const { id } = req.params;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const budgetId = parseInt(id);
  if (isNaN(budgetId)) {
    return res.status(400).json({ error: 'Invalid budget ID' });
  }

  try {
    // Verify user can access this budget
    const hasAccess = await verifyBudgetAccess(userId, budgetId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied. User cannot access this budget.' });
    }

    const budget = await prisma.budget.findUnique({
      where: { BudgetID: budgetId },
    });
    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }
    res.json(budget);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update a budget
export const updateBudget = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { Name, TotalAmount, StartDate, EndDate } = req.body;

  if (!Name || !TotalAmount) {
    return res.status(400).json({ error: 'Name and TotalAmount are required.' });
  }

  if (typeof TotalAmount !== 'number') {
    return res.status(400).json({ error: 'TotalAmount must be a number.' });
  }

  try {
    const updatedBudget = await prisma.budget.update({
      where: { BudgetID: parseInt(id) },
      data: {
        Name,
        TotalAmount,
        StartDate,
        EndDate,
      },
    });
    res.json(updatedBudget);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a budget
export const deleteBudget = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.budget.delete({
      where: { BudgetID: parseInt(id) },
    });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
