
import { Request, Response } from 'express';
import { prisma } from '../db';
import { Prisma } from '@prisma/client';

// Get all shopping lists for a family
export const getShoppingLists = async (req: Request, res: Response) => {
  const { familyId } = req.params;
  const { filter } = req.query;

  try {
    const shoppingLists = await prisma.shoppingList.findMany({
      where: { FamilyID: parseInt(familyId) },
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
    console.error(error);
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
    const aggregatedIngredients = new Map<string, { quantity: number; unit: string }>();

    for (const entry of mealPlan.Entries) {
      if (entry.Meal) {
        for (const ingredient of entry.Meal.Ingredients) {
          // TODO: Implement scaling based on entry.Servings vs entry.Meal.DefaultServings
          const key = `${ingredient.Name.toLowerCase()}_${ingredient.Unit?.toLowerCase()}`;
          const existing = aggregatedIngredients.get(key);

          if (existing) {
            existing.quantity += new Prisma.Decimal(ingredient.Quantity || 0).toNumber();
          } else {
            aggregatedIngredients.set(key, {
              quantity: new Prisma.Decimal(ingredient.Quantity || 0).toNumber(),
              unit: ingredient.Unit || '',
            });
          }
        }
      }
    }

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

    // 4. Upsert items into the shopping list
    await prisma.$transaction(async (tx) => {
      for (const [key, item] of aggregatedIngredients.entries()) {
        const name = key.split('_')[0];
        const existingItem = shoppingList.ShoppingItems.find(
          (sli) => sli.Name.toLowerCase() === name && sli.Unit?.toLowerCase() === item.unit.toLowerCase()
        );

        if (existingItem) {
          // Update quantity of existing item
          await tx.shoppingItem.update({
            where: { ShoppingItemID: existingItem.ShoppingItemID },
            data: { Quantity: { increment: item.quantity } },
          });
        } else {
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
