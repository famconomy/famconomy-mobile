import { Request, Response } from 'express';
import crypto from 'crypto';
import { promises as fs } from 'fs';
import { prisma } from '../db';
import { mapMealieRecipeToEntities, importRecipeViaMealie } from '../services/recipeImportService';
import { buildRecipeFilters } from '../services/recipeService';
import { extractRecipeFromScan, normalizeScanResult } from '../services/recipeScanService';

export const listRecipes = async (req: Request, res: Response) => {
  const { familyId } = req.params;
  const { search, favoritesOnly } = req.query;
  try {
    const userId = (req as any).userId ?? (req.headers['x-user-id'] as string | undefined);
    const filters = buildRecipeFilters(Number(familyId), userId, {
      search: typeof search === 'string' ? search : undefined,
      favoritesOnly: favoritesOnly === 'true',
    });
    const recipes = await prisma.recipe.findMany({
      ...filters,
      include: {
        Ingredients: true,
        Steps: true,
        Favorites: { select: { UserID: true } },
      },
      orderBy: [{ CreatedAt: 'desc' }],
    });
    res.json(recipes);
  } catch (error) {
    console.error('listRecipes error', error);
    res.status(500).json({ error: 'Failed to load recipes.' });
  }
};

export const createRecipe = async (req: Request, res: Response) => {
  const { familyId } = req.params;
  const userId = (req as any).userId ?? (req.headers['x-user-id'] as string | undefined);

  if (!userId) {
    return res.status(400).json({ error: 'Missing user context.' });
  }

  const {
    Title,
    Subtitle,
    Description,
    OriginStory,
    TraditionNotes,
    FirstCookedAt,
    Servings,
    PrepMinutes,
    CookMinutes,
    Visibility,
    CoverImageUrl,
    Ingredients,
    Steps,
  } = req.body;

  if (!Title?.trim()) {
    return res.status(400).json({ error: 'Title is required.' });
  }

  try {
    const recipe = await prisma.recipe.create({
      data: {
        FamilyID: Number(familyId),
        Title: Title.trim(),
        Subtitle,
        Description,
        OriginStory,
        TraditionNotes,
        FirstCookedAt: FirstCookedAt ? new Date(FirstCookedAt) : undefined,
        Servings,
        PrepMinutes,
        CookMinutes,
        Visibility,
        CoverImageUrl,
        CreatedByUserID: userId,
        Ingredients: Ingredients?.length
          ? {
              create: Ingredients.map((ingredient: any, index: number) => ({
                SectionTitle: ingredient.SectionTitle,
                Name: ingredient.Name,
                Quantity: ingredient.Quantity,
                Notes: ingredient.Notes,
                SortOrder: index,
              })),
            }
          : undefined,
        Steps: Steps?.length
          ? {
              create: Steps.map((step: any, index: number) => ({
                SectionTitle: step.SectionTitle,
                Instruction: step.Instruction,
                Tip: step.Tip,
                SortOrder: index,
              })),
            }
          : undefined,
      },
      include: {
        Ingredients: true,
        Steps: true,
      },
    });
    res.status(201).json(recipe);
  } catch (error) {
    console.error('createRecipe error', error);
    res.status(500).json({ error: 'Failed to create recipe.' });
  }
};

export const getRecipe = async (req: Request, res: Response) => {
  const { familyId, recipeId } = req.params;
  const userId = (req as any).userId ?? (req.headers['x-user-id'] as string | undefined);
  try {
    const recipe = await prisma.recipe.findFirst({
      where: {
        RecipeID: Number(recipeId),
        FamilyID: Number(familyId),
        OR: [
          { Visibility: 'FAMILY' },
          { Visibility: 'LINK' },
        ],
      },
      include: {
        Ingredients: { orderBy: { SortOrder: 'asc' } },
        Steps: { orderBy: { SortOrder: 'asc' } },
        Favorites: { select: { UserID: true } },
        Memories: {
          orderBy: { SharedAt: 'desc' },
          include: {
            SharedBy: { select: { UserID: true, FirstName: true, LastName: true } },
          },
          take: 5,
        },
      },
    });

    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found.' });
    }

    const isFavorite = recipe.Favorites.some(fav => fav.UserID === userId);
    res.json({ ...recipe, isFavorite });
  } catch (error) {
    console.error('getRecipe error', error);
    res.status(500).json({ error: 'Failed to load recipe.' });
  }
};

export const updateRecipe = async (req: Request, res: Response) => {
  const { familyId, recipeId } = req.params;
  const userId = (req as any).userId ?? (req.headers['x-user-id'] as string | undefined);

  if (!userId) {
    return res.status(400).json({ error: 'Missing user context.' });
  }

  const {
    Title,
    Subtitle,
    Description,
    OriginStory,
    TraditionNotes,
    FirstCookedAt,
    Servings,
    PrepMinutes,
    CookMinutes,
    Visibility,
    CoverImageUrl,
    Ingredients,
    Steps,
  } = req.body;

  try {
    const existing = await prisma.recipe.findFirst({
      where: { RecipeID: Number(recipeId), FamilyID: Number(familyId) },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Recipe not found.' });
    }

    const recipe = await prisma.recipe.update({
      where: { RecipeID: Number(recipeId) },
      data: {
        Title: Title?.trim() ?? existing.Title,
        Subtitle,
        Description,
        OriginStory,
        TraditionNotes,
        FirstCookedAt: FirstCookedAt ? new Date(FirstCookedAt) : null,
        Servings,
        PrepMinutes,
        CookMinutes,
        Visibility,
        CoverImageUrl,
        Ingredients: Ingredients
          ? {
              deleteMany: {},
              create: Ingredients.map((ingredient: any, index: number) => ({
                SectionTitle: ingredient.SectionTitle,
                Name: ingredient.Name,
                Quantity: ingredient.Quantity,
                Notes: ingredient.Notes,
                SortOrder: index,
              })),
            }
          : undefined,
        Steps: Steps
          ? {
              deleteMany: {},
              create: Steps.map((step: any, index: number) => ({
                SectionTitle: step.SectionTitle,
                Instruction: step.Instruction,
                Tip: step.Tip,
                SortOrder: index,
              })),
            }
          : undefined,
      },
      include: {
        Ingredients: true,
        Steps: true,
      },
    });

    res.json(recipe);
  } catch (error) {
    console.error('updateRecipe error', error);
    res.status(500).json({ error: 'Failed to update recipe.' });
  }
};

export const deleteRecipe = async (req: Request, res: Response) => {
  const { familyId, recipeId } = req.params;
  try {
    const existing = await prisma.recipe.findFirst({
      where: {
        RecipeID: Number(recipeId),
        FamilyID: Number(familyId),
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Recipe not found.' });
    }

    await prisma.recipe.delete({ where: { RecipeID: existing.RecipeID } });
    res.status(204).send();
  } catch (error) {
    console.error('deleteRecipe error', error);
    res.status(500).json({ error: 'Failed to delete recipe.' });
  }
};

export const shareRecipe = async (req: Request, res: Response) => {
  const { familyId, recipeId } = req.params;
  const { visibility } = req.body;

  try {
    const existing = await prisma.recipe.findFirst({
      where: {
        RecipeID: Number(recipeId),
        FamilyID: Number(familyId),
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Recipe not found.' });
    }

    const recipe = await prisma.recipe.update({
      where: { RecipeID: existing.RecipeID },
      data: {
        Visibility: visibility,
        ShareToken: visibility === 'LINK' ? crypto.randomUUID() : null,
      },
    });

    res.json({ shareToken: recipe.ShareToken, visibility: recipe.Visibility });
  } catch (error) {
    console.error('shareRecipe error', error);
    res.status(500).json({ error: 'Failed to update sharing status.' });
  }
};

export const createRecipeMemory = async (req: Request, res: Response) => {
  const { familyId, recipeId } = req.params;
  const userId = (req as any).userId ?? (req.headers['x-user-id'] as string | undefined);
  const { Message, StoryTitle } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Missing user context.' });
  }

  if (!Message?.trim()) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  try {
    const memory = await prisma.recipeMemory.create({
      data: {
        RecipeID: Number(recipeId),
        FamilyID: Number(familyId),
        Message: Message.trim(),
        StoryTitle,
        SharedByUserID: userId,
      },
      include: {
        SharedBy: { select: { UserID: true, FirstName: true, LastName: true } },
      },
    });
    res.status(201).json(memory);
  } catch (error) {
    console.error('createRecipeMemory error', error);
    res.status(500).json({ error: 'Failed to share memory.' });
  }
};

export const listRecipeMemories = async (req: Request, res: Response) => {
  const { familyId, recipeId } = req.params;
  try {
    const memories = await prisma.recipeMemory.findMany({
      where: {
        RecipeID: Number(recipeId),
        FamilyID: Number(familyId),
      },
      include: {
        SharedBy: { select: { UserID: true, FirstName: true, LastName: true } },
      },
      orderBy: { SharedAt: 'desc' },
    });
    res.json(memories);
  } catch (error) {
    console.error('listRecipeMemories error', error);
    res.status(500).json({ error: 'Failed to load memories.' });
  }
};

export const toggleRecipeFavorite = async (req: Request, res: Response) => {
  const { familyId, recipeId } = req.params;
  const userId = (req as any).userId ?? (req.headers['x-user-id'] as string | undefined);

  if (!userId) {
    return res.status(400).json({ error: 'Missing user context.' });
  }

  try {
    const recipe = await prisma.recipe.findFirst({
      where: {
        RecipeID: Number(recipeId),
        FamilyID: Number(familyId),
      },
    });

    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found.' });
    }

    const existing = await prisma.recipeFavorite.findFirst({
      where: {
        RecipeID: recipe.RecipeID,
        UserID: userId,
      },
    });

    if (existing) {
      await prisma.recipeFavorite.delete({ where: { RecipeFavoriteID: existing.RecipeFavoriteID } });
      return res.json({ isFavorite: false });
    }

    await prisma.recipeFavorite.create({
      data: {
        RecipeID: Number(recipeId),
        UserID: userId,
      },
    });

    res.json({ isFavorite: true });
  } catch (error) {
    console.error('toggleRecipeFavorite error', error);
    res.status(500).json({ error: 'Failed to update favorite.' });
  }
};

export const importRecipeFromUrl = async (req: Request, res: Response) => {
  const { familyId } = req.params;
  const userId = req.headers['x-user-id'] as string | undefined;
  const { url } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Missing user context.' });
  }

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'A valid recipe URL is required.' });
  }

  try {
    const imported = await importRecipeViaMealie(url);
    const entities = mapMealieRecipeToEntities(imported, Number(familyId), userId);
    const existing = await prisma.recipe.findFirst({
      where: {
        FamilyID: Number(familyId),
        ExternalSource: entities.recipe.ExternalSource,
        ExternalId: entities.recipe.ExternalId,
      },
    });

    let recipe;
    if (existing) {
      recipe = await prisma.recipe.update({
        where: { RecipeID: existing.RecipeID },
        data: {
          Title: entities.recipe.Title,
          Description: entities.recipe.Description,
          Servings: entities.recipe.Servings,
          PrepMinutes: entities.recipe.PrepMinutes,
          CookMinutes: entities.recipe.CookMinutes,
          SourceUrl: entities.recipe.SourceUrl,
          CoverImageUrl: entities.recipe.CoverImageUrl,
          Ingredients: {
            deleteMany: {},
            create: entities.ingredients,
          },
          Steps: {
            deleteMany: {},
            create: entities.steps,
          },
        },
        include: {
          Ingredients: true,
          Steps: true,
        },
      });
    } else {
      recipe = await prisma.recipe.create({
        data: {
          ...entities.recipe,
          Ingredients: {
            create: entities.ingredients,
          },
          Steps: {
            create: entities.steps,
          },
        },
        include: {
          Ingredients: true,
          Steps: true,
        },
      });
    }

    res.status(201).json(recipe);
  } catch (error: any) {
    console.error('importRecipeFromUrl error', error);
    res.status(500).json({ error: error?.message ?? 'Failed to import recipe.' });
  }
};

export const importRecipeFromScan = async (req: Request, res: Response) => {
  const { familyId } = req.params;
  const userId = (req as any).userId ?? (req.headers['x-user-id'] as string | undefined);
  const file = (req as any).file as Express.Multer.File | undefined;

  if (!userId) {
    return res.status(400).json({ error: 'Missing user context.' });
  }

  if (!file) {
    return res.status(400).json({ error: 'A recipe image is required.' });
  }

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
    await fs.unlink(file.path).catch(() => undefined);
    return res.status(400).json({ error: 'Only JPEG, PNG, or WebP images are supported at this time.' });
  }

  try {
    const scanned = await extractRecipeFromScan(file.path);
    const normalized = normalizeScanResult(scanned);

    const recipe = await prisma.recipe.create({
      data: {
        FamilyID: Number(familyId),
        Title: normalized.title,
        Subtitle: normalized.subtitle ?? undefined,
        Description: normalized.description ?? undefined,
        OriginStory: normalized.originStory ?? undefined,
        TraditionNotes: normalized.traditionNotes ?? undefined,
        FirstCookedAt: normalized.firstCookedAt ? new Date(normalized.firstCookedAt) : undefined,
        Servings: normalized.servings ?? undefined,
        PrepMinutes: normalized.prepMinutes ?? undefined,
        CookMinutes: normalized.cookMinutes ?? undefined,
        CoverImageUrl: normalized.coverImageUrl ?? undefined,
        SourceUrl: normalized.sourceUrl ?? undefined,
        ExternalSource: normalized.externalSource ?? undefined,
        ExternalId: normalized.externalId ?? undefined,
        CreatedByUserID: userId,
        Ingredients: normalized.ingredients.length
          ? {
              create: normalized.ingredients.map((ingredient, index) => ({
                SectionTitle: ingredient.sectionTitle ?? undefined,
                Name: ingredient.name,
                Quantity: ingredient.quantity ?? undefined,
                Notes: ingredient.notes ?? undefined,
                SortOrder: index,
              })),
            }
          : undefined,
        Steps: normalized.steps.length
          ? {
              create: normalized.steps.map((step, index) => ({
                SectionTitle: step.sectionTitle ?? undefined,
                Instruction: step.instruction,
                Tip: step.tip ?? undefined,
                SortOrder: index,
              })),
            }
          : undefined,
      },
      include: {
        Ingredients: true,
        Steps: true,
      },
    });

    res.status(201).json(recipe);
  } catch (error: any) {
    console.error('importRecipeFromScan error', error);
    res.status(500).json({ error: error?.message ?? 'Failed to import recipe.' });
  } finally {
    await fs.unlink(file.path).catch(() => undefined);
  }
};
