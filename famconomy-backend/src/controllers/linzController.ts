import { Request, Response } from 'express';
import { prisma } from '../db';
import { generateIngredientsForMeal, suggestMeals, suggestMealNames } from '../services/linzService';

const ensureMealsFromSavedSuggestions = async (familyId: number) => {
  const memory = await prisma.linZMemory.findFirst({
    where: {
      familyId,
      key: 'meal_suggestions',
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  const rawValue = memory?.value;
  if (!rawValue || typeof rawValue !== 'string') {
    return;
  }

  const titles = rawValue
    .split(',')
    .map(title => title.trim())
    .filter(Boolean);

  if (titles.length === 0) {
    return;
  }

  const existingMeals = await prisma.meal.findMany({
    where: {
      FamilyID: familyId,
      Title: {
        in: titles,
      },
    },
    select: {
      Title: true,
    },
  });

  const existingTitles = new Set(existingMeals.map(meal => meal.Title.trim().toLowerCase()));
  const missingTitles = titles.filter(title => !existingTitles.has(title.toLowerCase()));

  if (missingTitles.length === 0) {
    return;
  }

  const titlesToCreate = missingTitles.filter((title, index) =>
    missingTitles.findIndex(candidate => candidate.toLowerCase() === title.toLowerCase()) === index
  );

  if (titlesToCreate.length === 0) {
    return;
  }

  const family = await prisma.family.findUnique({
    where: { FamilyID: familyId },
    select: {
      CreatedByUserID: true,
      FamilyUsers: {
        select: { UserID: true },
        take: 1,
      },
    },
  });

  const createdByUserId = family?.FamilyUsers?.[0]?.UserID ?? family?.CreatedByUserID;
  if (!createdByUserId) {
    return;
  }

  await prisma.$transaction(
    titlesToCreate.map(title =>
      prisma.meal.create({
        data: {
          FamilyID: familyId,
          Title: title,
          CreatedByUserID: createdByUserId,
          Status: 'SUGGESTED',
        },
      })
    )
  );
};

// ... (existing functions)

export const getMealSuggestions = async (req: Request, res: Response) => {
  const { familyId, mealSlots, daysToSuggest, forceRefresh } = req.query;

  if (!familyId) {
    return res.status(400).json({ error: 'familyId is required.' });
  }

  const parsedFamilyId = Number(familyId);
  if (!Number.isFinite(parsedFamilyId)) {
    return res.status(400).json({ error: 'familyId must be a valid number.' });
  }

  // Parse optional parameters
  let parsedMealSlots: ('BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK')[] | undefined;
  if (mealSlots) {
    const slotsStr = Array.isArray(mealSlots) ? mealSlots.join(',') : mealSlots as string;
    parsedMealSlots = slotsStr.split(',').map(slot => slot.trim().toUpperCase()) as ('BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK')[];
  }

  const parsedDaysToSuggest = daysToSuggest ? Number(daysToSuggest) : undefined;
  const parsedForceRefresh = forceRefresh === 'true';

  try {
    if (!parsedForceRefresh) {
      await ensureMealsFromSavedSuggestions(parsedFamilyId);
    }
    
    const suggestions = await suggestMeals(parsedFamilyId, {
      mealSlots: parsedMealSlots,
      daysToSuggest: parsedDaysToSuggest,
      forceRefresh: parsedForceRefresh
    });
    
    res.json(suggestions);
  } catch (error) {
    console.error('Error getting meal suggestions:', error);
    res.status(500).json({ error: 'Failed to get meal suggestions.' });
  }
};

export const getMealNameSuggestions = async (req: Request, res: Response) => {
  const { familyId } = req.query;

  if (!familyId) {
    return res.status(400).json({ error: 'familyId is required.' });
  }

  const parsedFamilyId = Number(familyId);
  if (!Number.isFinite(parsedFamilyId)) {
    return res.status(400).json({ error: 'familyId must be a valid number.' });
  }

  try {
    const mealNames = await suggestMealNames(parsedFamilyId);
    res.json(mealNames);
  } catch (error) {
    console.error('Error getting meal name suggestions:', error);
    res.status(500).json({ error: 'Failed to get meal name suggestions.' });
  }
};

export const generateAndSaveIngredients = async (req: Request, res: Response) => {
  const { mealName, familyId, userId } = req.body;

  if (!mealName || !familyId || !userId) {
    return res.status(400).json({ error: 'mealName, familyId, and userId are required.' });
  }

  try {
    // 1. Get family size
    const family = await prisma.family.findUnique({
      where: { FamilyID: familyId },
      include: { FamilyUsers: true },
    });

    if (!family) {
      return res.status(404).json({ error: 'Family not found.' });
    }

    const familySize = family.FamilyUsers.length || 1; // Default to 1 to avoid errors

    // 2. Generate ingredients using the new service
    const ingredients = await generateIngredientsForMeal(mealName, familySize);

    // 3. Save the meal and ingredients in a transaction
    const newMeal = await prisma.meal.create({
      data: {
        Title: mealName,
        FamilyID: familyId,
        CreatedByUserID: userId,
        DefaultServings: familySize,
        Ingredients: {
          create: ingredients.map(ing => ({
            Name: ing.name,
            Quantity: ing.quantity,
            Unit: ing.unit,
          })),
        },
      },
      include: {
        Ingredients: true, // Include the ingredients in the response
      },
    });

    res.status(201).json(newMeal);
  } catch (error) {
    console.error('Error generating and saving ingredients:', error);
    res.status(500).json({ error: 'Failed to process your request.' });
  }
};

export const hydrateLinzContext = async (req: Request, res: Response) => {
  const { familyId, userId } = req.query; // Assuming these are passed as query params

  if (!familyId) {
    return res.status(400).json({ error: 'familyId is required.' });
  }

  try {
    const parsedFamilyId = Number(familyId);
    if (!Number.isFinite(parsedFamilyId)) {
      return res.status(400).json({ error: 'familyId must be a valid number.' });
    }

    const resolvedUserId = typeof userId === 'string' && userId.length > 0 ? userId : null;

    const onboardingMemory = await prisma.linZMemory.findMany({
      where: {
        familyId: parsedFamilyId,
        userId: resolvedUserId,
        key: {
          in: ['family_name', 'member_candidates', 'room_candidates', 'status'],
        },
      },
    });

    const existingFacts = await prisma.linZFacts.findMany({
      where: {
        familyId: parsedFamilyId,
        userId: resolvedUserId,
      },
    });

    res.json({
      onboardingMemory: onboardingMemory.map(mem => ({
        ...mem,
        namespace: (mem as any).namespace ?? 'onboarding',
      })),
      existingFacts,
    });
  } catch (error) {
    console.error('Error hydrating LinZ context:', error);
    res.status(500).json({ error: 'Failed to hydrate LinZ context.' });
  }
};

export const getLinzFacts = async (req: Request, res: Response) => {
  const { familyId, userId, keys } = req.query;

  if (!familyId) {
    return res.status(400).json({ error: 'familyId is required.' });
  }

  const parsedFamilyId = Number(familyId);
  if (!Number.isFinite(parsedFamilyId)) {
    return res.status(400).json({ error: 'familyId must be a valid number.' });
  }

  const resolvedUserId = typeof userId === 'string' && userId.length > 0 ? userId : null;
  const keyFilter = typeof keys === 'string'
    ? keys
        .split(',')
        .map(key => key.trim())
        .filter(Boolean)
    : undefined;

  try {
    const facts = await prisma.linZFacts.findMany({
      where: {
        familyId: parsedFamilyId,
        ...(resolvedUserId !== null ? { userId: resolvedUserId } : {}),
        ...(keyFilter && keyFilter.length ? { key: { in: keyFilter } } : {}),
      },
    });

    return res.json({ facts });
  } catch (error) {
    console.error('Failed to fetch LinZ facts:', error);
    return res.status(500).json({ error: 'Failed to fetch LinZ facts.' });
  }
};

export const upsertLinzFacts = async (req: Request, res: Response) => {
  const { facts } = req.body as {
    facts?: Array<{
      familyId: number;
      userId?: string | null;
      key: string;
      value: unknown;
      confidence?: number | null;
      source?: string | null;
    }>;
  };

  if (!Array.isArray(facts) || facts.length === 0) {
    return res.status(400).json({ error: 'facts must be a non-empty array.' });
  }

  try {
    await prisma.$transaction(async tx => {
      for (const fact of facts) {
        if (!fact.familyId || !fact.key) {
          console.warn('Skipping invalid fact payload', fact);
          continue;
        }

        const resolvedUserId = fact.userId === undefined ? null : fact.userId ?? null;

        await tx.linZFacts.upsert({
          where: {
            familyId_key_userId: {
              familyId: fact.familyId,
              key: fact.key,
              userId: resolvedUserId,
            },
          },
          update: {
            value: fact.value,
            confidence: fact.confidence ?? undefined,
            source: fact.source ?? 'app',
            lastConfirmedAt: new Date(),
          },
          create: {
            familyId: fact.familyId,
            userId: resolvedUserId,
            key: fact.key,
            value: fact.value,
            confidence: fact.confidence ?? undefined,
            source: fact.source ?? 'app',
          },
        });
      }
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Failed to upsert LinZ facts:', error);
    return res.status(500).json({ error: 'Failed to upsert LinZ facts.' });
  }
};

export const updateLinzMemory = async (req: Request, res: Response) => {
  const { items } = req.body; // Expecting an array of memory items

  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'items must be an array.' });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const familyCache = new Map<number, boolean>();
      for (const item of items) {
        const { userId, namespace, key, value } = item;
        const numericFamilyId = typeof item.familyId === 'number' ? item.familyId : Number(item.familyId);

        if (!Number.isFinite(numericFamilyId) || !key || value === undefined) {
          console.warn('Skipping invalid memory item:', item);
          continue;
        }

        let isFamilyValid = familyCache.get(numericFamilyId);
        if (isFamilyValid === undefined) {
          const family = await tx.family.findUnique({ where: { FamilyID: numericFamilyId }, select: { FamilyID: true } });
          isFamilyValid = Boolean(family);
          familyCache.set(numericFamilyId, isFamilyValid);
        }

        if (!isFamilyValid) {
          console.warn('Skipping memory item for unknown family:', numericFamilyId);
          continue;
        }

        const createData: any = {
          familyId: numericFamilyId,
          userId: userId || null,
          key,
          value,
        };

        const updateData: any = { value };

        if (typeof namespace === 'string' && namespace.trim()) {
          createData.namespace = namespace.trim();
          updateData.namespace = namespace.trim();
        }

        await tx.linZMemory.upsert({
          where: { familyId_userId_key: { familyId: numericFamilyId, userId: userId || null, key } },
          create: createData,
          update: updateData,
        });
      }
    });
    res.status(200).json({ message: 'LinZ memory updated successfully.' });
  } catch (error) {
    console.error('Error updating LinZ memory:', error);
    res.status(500).json({ error: 'Failed to update LinZ memory.' });
  }
};
