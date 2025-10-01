import { Request, Response } from 'express';
import { prisma } from '../db';

// Create a new budget
export const createBudget = async (req: Request, res: Response) => {
  const { FamilyID, Name, TotalAmount, StartDate, EndDate, CreatedByUserID } = req.body;

  if (!Name || !TotalAmount) {
    return res.status(400).json({ error: 'Name and TotalAmount are required.' });
  }

  if (typeof TotalAmount !== 'number') {
    return res.status(400).json({ error: 'TotalAmount must be a number.' });
  }

  try {
    const budget = await prisma.budget.create({
      data: {
        FamilyID,
        Name,
        TotalAmount,
        StartDate,
        EndDate,
        CreatedByUserID,
      },
    });
    res.status(201).json(budget);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all budgets for a family
export const getBudgets = async (req: Request, res: Response) => {
  const { familyId } = req.params;
  try {
    const budgets = await prisma.budget.findMany({
      where: { FamilyID: parseInt(familyId) },
    });
    res.json(budgets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get budget by ID
export const getBudgetById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const budget = await prisma.budget.findUnique({
      where: { BudgetID: parseInt(id) },
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
