import axios from 'axios';
import { Prisma } from '@prisma/client';

interface MealieImportResponse {
  id: number;
  slug: string;
}

interface MealieRecipeIngredient {
  food: string;
  quantity?: number | string;
  units?: string;
  note?: string;
  title?: string;
  base_ingredient?: string;
}

interface MealieRecipeInstructionStep {
  title?: string;
  instruction: string;
}

interface MealieRecipe {
  id: number;
  name: string;
  description?: string;
  recipeYield?: string;
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
  recipeIngredients?: MealieRecipeIngredient[];
  recipeInstructions?: MealieRecipeInstructionStep[];
  orgURL?: string;
  createdAt?: string;
  updatedAt?: string;
  assets?: {
    cover?: {
      original?: string;
    };
  };
}

const mealieBaseUrl = process.env.MEALIE_BASE_URL;
const mealieApiToken = process.env.MEALIE_API_TOKEN;

if (!mealieBaseUrl) {
  console.warn('MEALIE_BASE_URL not configured; recipe import will be disabled.');
}

export const importRecipeViaMealie = async (url: string): Promise<MealieRecipe> => {
  if (!mealieBaseUrl || !mealieApiToken) {
    throw new Error('Recipe import service is not configured.');
  }

  const client = axios.create({
    baseURL: mealieBaseUrl,
    headers: {
      Authorization: `Bearer ${mealieApiToken}`,
    },
    timeout: 15000,
  });

  const importResponse = await client.post<MealieImportResponse>('/api/recipes/parse/', {
    url,
  });

  if (!importResponse.data?.id) {
    throw new Error('Mealie did not return a recipe identifier.');
  }

  const recipeResponse = await client.get<MealieRecipe>(`/api/recipes/${importResponse.data.id}`);
  return recipeResponse.data;
};

export const mapMealieRecipeToEntities = (
  mealieRecipe: MealieRecipe,
  familyId: number,
  userId: string
): {
  recipe: Prisma.RecipeCreateInput;
  ingredients: Prisma.RecipeIngredientCreateWithoutRecipeInput[];
  steps: Prisma.RecipeStepCreateWithoutRecipeInput[];
} => {
  const recipe: Prisma.RecipeCreateInput = {
    Family: { connect: { FamilyID: familyId } },
    CreatedBy: { connect: { UserID: userId } },
    Title: mealieRecipe.name ?? 'Untitled recipe',
    Description: mealieRecipe.description,
    Servings: parseServings(mealieRecipe.recipeYield),
    PrepMinutes: coerceToNumber(mealieRecipe.prepTime),
    CookMinutes: coerceToNumber(mealieRecipe.cookTime),
    SourceUrl: mealieRecipe.orgURL,
    ExternalSource: 'MEALIE',
    ExternalId: String(mealieRecipe.id),
    CoverImageUrl: mealieRecipe.assets?.cover?.original,
  };

  const ingredients = (mealieRecipe.recipeIngredients ?? []).map((ingredient, index) => ({
    SectionTitle: ingredient.title,
    Name: ingredient.food ?? ingredient.base_ingredient ?? 'Ingredient',
    Quantity: formatQuantity(ingredient.quantity, ingredient.units),
    Notes: ingredient.note ?? undefined,
    SortOrder: index,
  }));

  const steps = (mealieRecipe.recipeInstructions ?? []).map((step, index) => ({
    SectionTitle: step.title,
    Instruction: step.instruction,
    SortOrder: index,
  }));

  return { recipe, ingredients, steps };
};

const coerceToNumber = (value?: number | string | null): number | null => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const parseServings = (value?: string): number | null => {
  if (!value) return null;
  const numeric = Number(value);
  if (!Number.isNaN(numeric)) return numeric;
  const match = value.match(/(\d+)/);
  return match ? Number(match[1]) : null;
};

const formatQuantity = (quantity?: number | string, units?: string): string | undefined => {
  if (quantity === undefined || quantity === null) {
    return units ?? undefined;
  }
  const quantityText = typeof quantity === 'number' ? quantity.toString() : quantity;
  return units ? `${quantityText} ${units}`.trim() : quantityText;
};
