import apiClient from './apiClient';

export type RecipeVisibility = 'FAMILY' | 'LINK';

export interface RecipeIngredient {
  RecipeIngredientID?: number;
  RecipeID?: number;
  SectionTitle?: string | null;
  Name: string;
  Quantity?: string;
  Notes?: string;
  SortOrder?: number;
}

export interface RecipeStep {
  RecipeStepID?: number;
  RecipeID?: number;
  SectionTitle?: string | null;
  Instruction: string;
  Tip?: string;
  SortOrder?: number;
}

export interface RecipeMemory {
  RecipeMemoryID: number;
  RecipeID: number;
  FamilyID: number;
  Message: string;
  StoryTitle?: string | null;
  SharedByUserID: string;
  SharedAt: string;
  SharedBy?: {
    UserID: string;
    FirstName: string;
    LastName: string;
  };
}

export interface RecipeFavorite {
  RecipeFavoriteID: number;
  RecipeID: number;
  UserID: string;
  MarkedAt: string;
}

export interface Recipe {
  RecipeID: number;
  FamilyID: number;
  Title: string;
  Subtitle?: string;
  Description?: string;
  OriginStory?: string;
  TraditionNotes?: string;
  FirstCookedAt?: string;
  Servings?: number;
  PrepMinutes?: number;
  CookMinutes?: number;
  CreatedByUserID: string;
  CreatedAt: string;
  UpdatedAt: string;
  Visibility: RecipeVisibility;
  ShareToken?: string | null;
  SourceUrl?: string | null;
  ExternalSource?: string | null;
  ExternalId?: string | null;
  CoverImageUrl?: string | null;
  Ingredients: RecipeIngredient[];
  Steps: RecipeStep[];
  Memories?: RecipeMemory[];
  Favorites?: RecipeFavorite[];
  isFavorite?: boolean;
}

export interface RecipeInput {
  Title: string;
  Subtitle?: string;
  Description?: string;
  OriginStory?: string;
  TraditionNotes?: string;
  FirstCookedAt?: string | null;
  Servings?: number | null;
  PrepMinutes?: number | null;
  CookMinutes?: number | null;
  Visibility?: RecipeVisibility;
  CoverImageUrl?: string;
  Ingredients?: Array<Omit<RecipeIngredient, 'RecipeIngredientID' | 'RecipeID'>>;
  Steps?: Array<Omit<RecipeStep, 'RecipeStepID' | 'RecipeID'>>;
}

// Get all recipes for a family
export const getRecipes = async (
  familyId: number,
  params?: { search?: string; favoritesOnly?: boolean }
): Promise<Recipe[]> => {
  const response = await apiClient.get(`/recipes/${familyId}/recipes`, {
    params,
  });
  return response.data;
};

// Get single recipe
export const getRecipe = async (
  familyId: number,
  recipeId: number
): Promise<Recipe> => {
  const response = await apiClient.get(
    `/recipes/${familyId}/recipes/${recipeId}`
  );
  return response.data;
};

// Create new recipe
export const createRecipe = async (
  familyId: number,
  payload: RecipeInput
): Promise<Recipe> => {
  const response = await apiClient.post(
    `/recipes/${familyId}/recipes`,
    payload
  );
  return response.data;
};

// Update recipe
export const updateRecipe = async (
  familyId: number,
  recipeId: number,
  payload: RecipeInput
): Promise<Recipe> => {
  const response = await apiClient.put(
    `/recipes/${familyId}/recipes/${recipeId}`,
    payload
  );
  return response.data;
};

// Delete recipe
export const deleteRecipe = async (
  familyId: number,
  recipeId: number
): Promise<void> => {
  await apiClient.delete(`/recipes/${familyId}/recipes/${recipeId}`);
};

// Import recipe from URL
export const importRecipe = async (
  familyId: number,
  url: string
): Promise<Recipe> => {
  const response = await apiClient.post(
    `/recipes/${familyId}/recipes/import`,
    { url }
  );
  return response.data;
};

// Share recipe
export const shareRecipe = async (
  familyId: number,
  recipeId: number,
  visibility: 'FAMILY' | 'LINK'
): Promise<{ shareToken?: string | null; visibility: 'FAMILY' | 'LINK' }> => {
  const response = await apiClient.post(
    `/recipes/${familyId}/recipes/${recipeId}/share`,
    { visibility }
  );
  return response.data;
};

// Toggle recipe favorite
export const toggleRecipeFavorite = async (
  familyId: number,
  recipeId: number
): Promise<{ isFavorite: boolean }> => {
  const response = await apiClient.post(
    `/recipes/${familyId}/recipes/${recipeId}/favorite`
  );
  return response.data;
};

// Get recipe memories
export const getRecipeMemories = async (
  familyId: number,
  recipeId: number
): Promise<RecipeMemory[]> => {
  const response = await apiClient.get(
    `/recipes/${familyId}/recipes/${recipeId}/memories`
  );
  return response.data;
};

// Create recipe memory
export const createRecipeMemory = async (
  familyId: number,
  recipeId: number,
  payload: { Message: string; StoryTitle?: string }
): Promise<RecipeMemory> => {
  const response = await apiClient.post(
    `/recipes/${familyId}/recipes/${recipeId}/memories`,
    payload
  );
  return response.data;
};

// Create meal from recipe
export const createMealFromRecipe = async (
  familyId: number,
  recipeId: number,
  payload?: { servings?: number; notes?: string }
) => {
  const response = await apiClient.post(
    `/recipes/${familyId}/recipes/${recipeId}/create-meal`,
    payload || {}
  );
  return response.data;
};
