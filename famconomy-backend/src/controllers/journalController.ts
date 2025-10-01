import { Request, Response } from 'express';
import { prisma } from '../db';

// Create a new journal entry
export const createJournalEntry = async (req: Request, res: Response) => {
  const { FamilyID, Title, EntryText, IsPrivate, CreatedByUserID } = req.body;
  try {
    const journalEntry = await prisma.journalEntry.create({
      data: {
        FamilyID,
        Title,
        EntryText,
        IsPrivate,
        CreatedByUserID,
      },
    });
    res.status(201).json(journalEntry);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all journal entries for a family
export const getJournalEntries = async (req: Request & { userId?: string }, res: Response) => {
  const { familyId } = req.params;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const journalEntries = await prisma.journalEntry.findMany({
      where: {
        FamilyID: parseInt(familyId),
        OR: [
          { IsPrivate: false },
          { CreatedByUserID: userId },
        ],
      },
    });
    res.json(journalEntries);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get journal entry by ID
export const getJournalEntryById = async (req: Request & { userId?: string }, res: Response) => {
  const { id } = req.params;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const journalEntry = await prisma.journalEntry.findUnique({
      where: { EntryID: parseInt(id) },
    });

    if (!journalEntry) {
      return res.status(404).json({ error: 'Journal entry not found' });
    }

    if (journalEntry.IsPrivate && journalEntry.CreatedByUserID !== userId) {
      return res.status(404).json({ error: 'Journal entry not found' });
    }

    res.json(journalEntry);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update a journal entry
export const updateJournalEntry = async (req: Request & { userId?: string }, res: Response) => {
  const { id } = req.params;
  const { Title, EntryText, IsPrivate } = req.body;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const journalEntry = await prisma.journalEntry.findUnique({
      where: { EntryID: parseInt(id) },
    });

    if (!journalEntry) {
      return res.status(404).json({ error: 'Journal entry not found' });
    }

    if (journalEntry.CreatedByUserID !== userId) {
      return res.status(403).json({ error: 'You are not authorized to update this journal entry' });
    }

    const updatedJournalEntry = await prisma.journalEntry.update({
      where: { EntryID: parseInt(id) },
      data: {
        Title,
        EntryText,
        IsPrivate,
      },
    });
    res.json(updatedJournalEntry);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a journal entry
export const deleteJournalEntry = async (req: Request & { userId?: string }, res: Response) => {
  const { id } = req.params;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const journalEntry = await prisma.journalEntry.findUnique({
      where: { EntryID: parseInt(id) },
    });

    if (!journalEntry) {
      return res.status(404).json({ error: 'Journal entry not found' });
    }

    if (journalEntry.CreatedByUserID !== userId) {
      return res.status(403).json({ error: 'You are not authorized to delete this journal entry' });
    }

    await prisma.journalEntry.delete({
      where: { EntryID: parseInt(id) },
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
