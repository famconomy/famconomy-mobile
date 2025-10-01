import { Request, Response } from 'express';
import { prisma } from '../db';

// Create a new transaction
export const createTransaction = async (req: Request, res: Response) => {
  const { BudgetID, Amount, CategoryID, Description, Date, ProviderID, CreatedByUserID } = req.body;
  try {
    const transaction = await prisma.transaction.create({
      data: {
        BudgetID,
        Amount,
        CategoryID,
        Description,
        Date,
        ProviderID,
        CreatedByUserID,
      },
    });
    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllTransactions = async (req: Request, res: Response) => {
  const userId = req.userId;
  try {
    const transactions = await prisma.transaction.findMany({
      where: { CreatedByUserID: userId },
    });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTransactionsForAccounts = async (req: Request, res: Response) => {
  const { accountIds } = req.body;
  const { startDate, endDate } = req.query;
  const userId = req.userId;

  try {
    const where: any = {
      CreatedByUserID: userId,
      plaidAccountId: { in: accountIds },
    };

    if (startDate && endDate) {
      where.Date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        Budget: true,
      },
    });

    const mappedTransactions = transactions.map(t => ({
      id: t.TransactionID,
      description: t.Description,
      amount: t.Amount,
      date: t.Date,
      category: t.Budget ? t.Budget.Name : 'other',
    }));

    res.json(mappedTransactions);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all transactions for a budget
export const getTransactions = async (req: Request, res: Response) => {
  const { budgetId } = req.params;
  try {
    const transactions = await prisma.transaction.findMany({
      where: { BudgetID: parseInt(budgetId) },
      include: {
        Budget: true,
      },
    });

    const mappedTransactions = transactions.map(t => ({
      id: t.TransactionID,
      description: t.Description,
      amount: t.Amount,
      date: t.Date,
      category: t.Budget ? t.Budget.Name : 'other',
    }));

    res.json(mappedTransactions);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get transaction by ID
export const getTransactionById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { TransactionID: parseInt(id) },
    });
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update a transaction
export const updateTransaction = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { Amount, CategoryID, Description, Date, ProviderID } = req.body;
  try {
    const updatedTransaction = await prisma.transaction.update({
      where: { TransactionID: parseInt(id) },
      data: {
        Amount,
        CategoryID,
        Description,
        Date,
        ProviderID,
      },
    });
    res.json(updatedTransaction);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a transaction
export const deleteTransaction = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.transaction.delete({
      where: { TransactionID: parseInt(id) },
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
