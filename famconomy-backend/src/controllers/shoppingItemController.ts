import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../db';

// Get all shopping items for a shopping list
export const getShoppingItems = async (req: Request, res: Response) => {
  const { listId } = req.params;
  try {
    const shoppingItems = await prisma.shoppingItem.findMany({
      where: { ShoppingListID: parseInt(listId, 10) },
    });
    res.json(shoppingItems);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new shopping item
export const createShoppingItem = async (req: Request, res: Response) => {
  const { ShoppingListID, Name, Quantity, Unit, Completed, AddedByUserID, CategoryID } = req.body;

  if (!Name) {
    return res.status(400).json({ error: 'Name is required.' });
  }

  try {
    const shoppingItem = await prisma.shoppingItem.create({
      data: {
        ShoppingListID,
        Name,
        Quantity,
        Unit,
        Completed,
        AddedByUserID,
        CategoryID,
      },
    });
    res.status(201).json(shoppingItem);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update a shopping item
export const updateShoppingItem = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { Name, Quantity, Unit, Completed, CategoryID } = req.body ?? {};

  const updateData: Record<string, any> = {};

  if (Name !== undefined) updateData.Name = Name;
  if (Quantity !== undefined) updateData.Quantity = Quantity;
  if (Unit !== undefined) updateData.Unit = Unit;
  if (Completed !== undefined) updateData.Completed = Completed;
  if (CategoryID !== undefined) updateData.CategoryID = CategoryID;

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields provided to update.' });
  }

  try {
    const updatedShoppingItem = await prisma.shoppingItem.update({
      where: { ShoppingItemID: parseInt(id, 10) },
      data: updateData,
    });
    res.json(updatedShoppingItem);
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ error: 'Shopping item not found.' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a shopping item
export const deleteShoppingItem = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.shoppingItem.delete({
      where: { ShoppingItemID: parseInt(id, 10) },
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
