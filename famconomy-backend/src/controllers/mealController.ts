import { Request, Response } from 'express';
import { prisma } from '../db';

export const listMeals = async (req: Request, res: Response) => {
  const { familyId } = req.params;
  try {
    const meals = await prisma.meal.findMany({
      where: { FamilyID: Number(familyId) },
      include: {
        Ingredients: true,
        Tags: true,
        Recipe: {
          select: {
            RecipeID: true,
            Title: true,
            Description: true,
            Servings: true,
            PrepMinutes: true,
            CookMinutes: true,
            CoverImageUrl: true,
          },
        },
      },
      orderBy: { UpdatedAt: 'desc' },
    });
    res.json(meals);
  } catch (error) {
    console.error('listMeals error', error);
    res.status(500).json({ error: 'Failed to load meals' });
  }
};

export const createMeal = async (req: Request, res: Response) => {
  const { FamilyID, Title, Description, Instructions, Tags, Ingredients, CreatedByUserID, Status, IsFavorite, DefaultServings } = req.body;
  if (!FamilyID || !Title || !CreatedByUserID) {
    return res.status(400).json({ error: 'Family, title, and creator are required' });
  }
  try {
    const meal = await prisma.meal.create({
      data: {
        FamilyID,
        Title,
        Description,
        Instructions,
        CreatedByUserID,
        Status,
        IsFavorite,
        DefaultServings,
        Ingredients: Ingredients?.length ? {
          create: Ingredients.map((ingredient: any) => ({
            Name: ingredient.Name,
            Quantity: ingredient.Quantity ?? null,
            Unit: ingredient.Unit ?? null,
            Notes: ingredient.Notes ?? null,
            IsPantryItem: Boolean(ingredient.IsPantryItem),
          })),
        } : undefined,
        Tags: Tags?.length ? {
          create: Tags.map((tag: string) => ({ Tag: tag })),
        } : undefined,
      },
      include: {
        Ingredients: true,
        Tags: true,
      },
    });
    res.status(201).json(meal);
  } catch (error) {
    console.error('createMeal error', error);
    res.status(500).json({ error: 'Failed to create meal' });
  }
};

export const updateMeal = async (req: Request, res: Response) => {
  const { mealId } = req.params;
  const { Title, Description, Instructions, Status, IsFavorite, DefaultServings, Ingredients, Tags } = req.body;
  try {
    const meal = await prisma.meal.update({
      where: { MealID: Number(mealId) },
      data: {
        Title,
        Description,
        Instructions,
        Status,
        IsFavorite,
        DefaultServings,
        Ingredients: Ingredients ? {
          deleteMany: {},
          create: Ingredients.map((ingredient: any) => ({
            Name: ingredient.Name,
            Quantity: ingredient.Quantity ?? null,
            Unit: ingredient.Unit ?? null,
            Notes: ingredient.Notes ?? null,
            IsPantryItem: Boolean(ingredient.IsPantryItem),
          })),
        } : undefined,
        Tags: Tags ? {
          deleteMany: {},
          create: Tags.map((tag: string) => ({ Tag: tag })),
        } : undefined,
      },
      include: {
        Ingredients: true,
        Tags: true,
      },
    });
    res.json(meal);
  } catch (error) {
    console.error('updateMeal error', error);
    res.status(500).json({ error: 'Failed to update meal' });
  }
};

export const listMealPlans = async (req: Request, res: Response) => {
  const { familyId } = req.params;
  const { weekStart } = req.query;
  try {
    const entries = await prisma.mealPlanWeek.findMany({
      where: {
        FamilyID: Number(familyId),
        WeekStart: weekStart ? new Date(String(weekStart)) : undefined,
      },
      include: {
        Entries: {
          include: {
            Meal: {
              include: {
                Ingredients: true,
                Tags: true,
              },
            },
          },
        },
      },
      orderBy: { WeekStart: 'desc' },
    });
    res.json(entries);
  } catch (error) {
    console.error('listMealPlans error', error);
    res.status(500).json({ error: 'Failed to load meal plan' });
  }
};

export const upsertMealPlanEntry = async (req: Request, res: Response) => {
  const { familyId } = req.params;
  const { WeekStart, DayOfWeek, MealSlot, MealID, Servings, Notes, AddedByUserID } = req.body;
  if (WeekStart === undefined || DayOfWeek === undefined || !MealSlot || !MealID || !AddedByUserID) {
    return res.status(400).json({ error: 'WeekStart, day, slot, meal and user are required' });
  }

  try {
    const week = await prisma.mealPlanWeek.upsert({
      where: {
        FamilyID_WeekStart: {
          FamilyID: Number(familyId),
          WeekStart: new Date(WeekStart),
        },
      },
      update: {},
      create: {
        FamilyID: Number(familyId),
        WeekStart: new Date(WeekStart),
      },
    });

    const entry = await prisma.mealPlanEntry.upsert({
      where: {
        MealPlanWeekID_DayOfWeek_MealSlot: {
          MealPlanWeekID: week.MealPlanWeekID,
          DayOfWeek,
          MealSlot,
        },
      },
      update: {
        MealID,
        Servings,
        Notes,
        AddedByUserID,
      },
      create: {
        MealPlanWeekID: week.MealPlanWeekID,
        MealID,
        DayOfWeek,
        MealSlot,
        Servings,
        Notes,
        AddedByUserID,
      },
      include: {
        Meal: {
          include: {
            Ingredients: true,
            Tags: true,
          },
        },
      },
    });

    res.json(entry);
  } catch (error) {
    console.error('upsertMealPlanEntry error', error);
    res.status(500).json({ error: 'Failed to save meal plan entry' });
  }
};

export const deleteMealPlanEntry = async (req: Request, res: Response) => {
  const { entryId } = req.params;
  try {
    await prisma.mealPlanEntry.delete({ where: { MealPlanEntryID: Number(entryId) } });
    res.status(204).send();
  } catch (error) {
    console.error('deleteMealPlanEntry error', error);
    res.status(500).json({ error: 'Failed to delete meal plan entry' });
  }
};

export const convertMealToRecipe = async (req: Request, res: Response) => {
  const { mealId } = req.params;
  
  try {
    // Get the meal with ingredients
    const meal = await prisma.meal.findUnique({
      where: { MealID: Number(mealId) },
      include: {
        Ingredients: true,
        Tags: true,
      },
    });

    if (!meal) {
      return res.status(404).json({ error: 'Meal not found' });
    }

    // Create recipe from meal
    const recipe = await prisma.recipe.create({
      data: {
        FamilyID: meal.FamilyID,
        Title: meal.Title,
        Description: meal.Description,
        Servings: meal.DefaultServings,
        CreatedByUserID: meal.CreatedByUserID,
        Ingredients: {
          create: meal.Ingredients.map((ingredient, index) => ({
            Name: ingredient.Name,
            Quantity: ingredient.Quantity?.toString() || '',
            Notes: ingredient.Notes,
            SortOrder: index,
          })),
        },
        Steps: meal.Instructions ? {
          create: [{
            Instruction: meal.Instructions,
            SortOrder: 0,
          }],
        } : undefined,
      },
      include: {
        Ingredients: true,
        Steps: true,
      },
    });

    // Link the meal to the new recipe
    const updatedMeal = await prisma.meal.update({
      where: { MealID: Number(mealId) },
      data: { RecipeID: recipe.RecipeID },
      include: {
        Ingredients: true,
        Tags: true,
        Recipe: true,
      },
    });

    res.json({ recipe, meal: updatedMeal });
  } catch (error) {
    console.error('convertMealToRecipe error', error);
    res.status(500).json({ error: 'Failed to convert meal to recipe' });
  }
};

export const linkMealToRecipe = async (req: Request, res: Response) => {
  const { mealId } = req.params;
  const { recipeId } = req.body;

  if (!recipeId) {
    return res.status(400).json({ error: 'recipeId is required' });
  }

  try {
    // Verify recipe exists and belongs to the same family
    const meal = await prisma.meal.findUnique({
      where: { MealID: Number(mealId) },
    });

    if (!meal) {
      return res.status(404).json({ error: 'Meal not found' });
    }

    const recipe = await prisma.recipe.findFirst({
      where: { 
        RecipeID: Number(recipeId),
        FamilyID: meal.FamilyID 
      },
    });

    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found or does not belong to the same family' });
    }

    // Link meal to recipe
    const updatedMeal = await prisma.meal.update({
      where: { MealID: Number(mealId) },
      data: { RecipeID: Number(recipeId) },
      include: {
        Ingredients: true,
        Tags: true,
        Recipe: true,
      },
    });

    res.json(updatedMeal);
  } catch (error) {
    console.error('linkMealToRecipe error', error);
    res.status(500).json({ error: 'Failed to link meal to recipe' });
  }
};
