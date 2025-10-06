
import { Request, Response } from 'express';
import { prisma } from '../db';
import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger';
import { verifyFamilyMembership } from '../utils/authUtils';

// Get all shopping lists for a family
export const getShoppingLists = async (req: Request, res: Response) => {
  const { familyId } = req.params;
  const { filter } = req.query;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const familyIdNumber = parseInt(familyId);
  if (!familyIdNumber || isNaN(familyIdNumber)) {
    return res.status(400).json({ error: 'Invalid family ID' });
  }

  try {
    // Verify user belongs to the family
    const isMember = await verifyFamilyMembership(userId, familyIdNumber);
    if (!isMember) {
      logger.warn('Unauthorized shopping list access attempt', { userId, familyId: familyIdNumber });
      return res.status(403).json({ error: 'Access denied. User is not a member of this family.' });
    }

    const shoppingLists = await prisma.shoppingList.findMany({
      where: { FamilyID: familyIdNumber },
      include: { ShoppingItems: true },
    });

    if (filter === 'active') {
      const activeLists = shoppingLists.filter(list => list.ShoppingItems.some(item => !item.Completed));
      return res.json(activeLists);
    }

    if (filter === 'archived') {
      const archivedLists = shoppingLists.filter(list => list.ShoppingItems.every(item => item.Completed));
      return res.json(archivedLists);
    }

    res.json(shoppingLists);
  } catch (error) {
    logger.error('Error fetching shopping lists', { userId, familyId: familyIdNumber, error });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new shopping list
export const createShoppingList = async (req: Request, res: Response) => {
  const { FamilyID, Name, CreatedByUserID } = req.body;

  if (!Name) {
    return res.status(400).json({ error: 'Name is required.' });
  }

  try {
    const shoppingList = await prisma.shoppingList.create({
      data: {
        FamilyID,
        Name,
        CreatedByUserID,
      },
    });
    res.status(201).json(shoppingList);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update a shopping list
export const updateShoppingList = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { Name } = req.body;

  if (!Name) {
    return res.status(400).json({ error: 'Name is required.' });
  }

  try {
    const updatedShoppingList = await prisma.shoppingList.update({
      where: { ShoppingListID: parseInt(id) },
      data: { Name },
    });
    res.json(updatedShoppingList);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a shopping list
export const deleteShoppingList = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.shoppingList.delete({
      where: { ShoppingListID: parseInt(id) },
    });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Archive/unarchive a shopping list
export const archiveShoppingList = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const shoppingList = await prisma.shoppingList.findUnique({
      where: { ShoppingListID: parseInt(id) },
    });

    if (!shoppingList) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }

    const updatedShoppingList = await prisma.shoppingList.update({
      where: { ShoppingListID: parseInt(id) },
      data: { Archived: !shoppingList.Archived },
    });
    res.json(updatedShoppingList);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addMealPlanToShoppingList = async (req: Request, res: Response) => {
  const { familyId, weekStart, shoppingListId } = req.body;

  if (!familyId || !weekStart || !shoppingListId) {
    return res.status(400).json({ error: 'familyId, weekStart, and shoppingListId are required.' });
  }

  try {
    // 1. Find the meal plan for the given week
    const mealPlan = await prisma.mealPlanWeek.findUnique({
      where: {
        FamilyID_WeekStart: {
          FamilyID: familyId,
          WeekStart: new Date(weekStart),
        },
      },
      include: {
        Entries: {
          include: {
            Meal: {
              include: {
                Ingredients: true,
              },
            },
          },
        },
      },
    });

    if (!mealPlan || mealPlan.Entries.length === 0) {
      return res.status(404).json({ error: 'No meal plan found for the selected week.' });
    }

    // 2. Aggregate all ingredients
    const aggregatedIngredients = new Map<string, { quantity: number; unit: string; originalName: string }>();

    console.log(`--- DEBUG: Processing ${mealPlan.Entries.length} meal plan entries ---`);
    
    for (const entry of mealPlan.Entries) {
      if (entry.Meal) {
        console.log(`--- DEBUG: Processing meal "${entry.Meal.Title}" with ${entry.Meal.Ingredients.length} ingredients ---`);
        for (const ingredient of entry.Meal.Ingredients) {
          const key = `${ingredient.Name.toLowerCase()}_${ingredient.Unit?.toLowerCase()}`;
          const existing = aggregatedIngredients.get(key);
          
          console.log(`--- DEBUG: Processing ingredient "${ingredient.Name}" (${ingredient.Quantity} ${ingredient.Unit}) ---`);

          if (existing) {
            existing.quantity += new Prisma.Decimal(ingredient.Quantity || 0).toNumber();
            console.log(`--- DEBUG: Updated existing ingredient "${ingredient.Name}" to quantity ${existing.quantity} ---`);
          } else {
            aggregatedIngredients.set(key, {
              quantity: new Prisma.Decimal(ingredient.Quantity || 0).toNumber(),
              unit: ingredient.Unit || '',
              originalName: ingredient.Name,
            });
            console.log(`--- DEBUG: Added new ingredient "${ingredient.Name}" with quantity ${ingredient.Quantity} ---`);
          }
        }
      }
    }

    console.log(`--- DEBUG: Total aggregated ingredients: ${aggregatedIngredients.size} ---`);

    if (aggregatedIngredients.size === 0) {
      return res.status(400).json({ error: 'The meals in this plan have no ingredients.' });
    }

    // 3. Get the target shopping list and its existing items
    const shoppingList = await prisma.shoppingList.findUnique({
      where: { ShoppingListID: shoppingListId },
      include: { ShoppingItems: true },
    });

    if (!shoppingList || shoppingList.FamilyID !== familyId) {
      return res.status(404).json({ error: 'Shopping list not found or does not belong to the family.' });
    }

    console.log(`--- DEBUG: Starting transaction to add ${aggregatedIngredients.size} ingredients to shopping list ${shoppingListId} ---`);
    
    // 4. Upsert items into the shopping list
    await prisma.$transaction(async (tx) => {
      for (const [key, item] of aggregatedIngredients.entries()) {
        const name = item.originalName; // Use the original cased name
        const existingItem = shoppingList.ShoppingItems.find(
          (sli) => sli.Name.toLowerCase() === name.toLowerCase() && sli.Unit?.toLowerCase() === item.unit.toLowerCase()
        );

        if (existingItem) {
          console.log(`--- DEBUG: Updating existing item "${existingItem.Name}" from ${existingItem.Quantity} to ${existingItem.Quantity + item.quantity} ---`);
          // Update quantity of existing item
          await tx.shoppingItem.update({
            where: { ShoppingItemID: existingItem.ShoppingItemID },
            data: { Quantity: { increment: item.quantity } },
          });
        } else {
          console.log(`--- DEBUG: Creating new item "${name}" with quantity ${item.quantity} ${item.unit} ---`);
          // Create new item
          await tx.shoppingItem.create({
            data: {
              ShoppingListID: shoppingListId,
              Name: name,
              Quantity: item.quantity,
              Unit: item.unit,
              AddedByUserID: mealPlan.Entries[0].AddedByUserID, // Assign to the user who added the first meal
            },
          });
        }
      }
    });

    console.log(`--- DEBUG: Transaction completed successfully ---`);

    // 5. Return the updated shopping list
    const updatedList = await prisma.shoppingList.findUnique({
        where: { ShoppingListID: shoppingListId },
        include: { ShoppingItems: true },
    });

    res.json(updatedList);

  } catch (error) {
    console.error('Error adding meal plan to shopping list:', error);
    res.status(500).json({ error: 'Failed to process your request.' });
  }
};
