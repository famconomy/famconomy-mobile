// Recipes Service - Family Recipe Collection with Memories and Meal Planning

// ============================================
// ENUMS
// ============================================

export enum DifficultyLevel {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard'
}

export enum MealType {
  BREAKFAST = 'breakfast',
  LUNCH = 'lunch',
  DINNER = 'dinner',
  SNACK = 'snack',
  DESSERT = 'dessert',
  BEVERAGE = 'beverage'
}

export enum DietaryRestriction {
  VEGETARIAN = 'vegetarian',
  VEGAN = 'vegan',
  GLUTEN_FREE = 'gluten_free',
  DAIRY_FREE = 'dairy_free',
  NUT_FREE = 'nut_free',
  KETO = 'keto',
  PALEO = 'paleo'
}

export enum CuisineType {
  ITALIAN = 'italian',
  MEXICAN = 'mexican',
  ASIAN = 'asian',
  AMERICAN = 'american',
  FRENCH = 'french',
  INDIAN = 'indian',
  MEDITERRANEAN = 'mediterranean',
  THAI = 'thai',
  OTHER = 'other'
}

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
}

export interface RecipeInstruction {
  step: number;
  description: string;
  duration?: number; // in minutes
  image?: string;
}

export interface RecipeMemory {
  id: string;
  userId: string;
  userName: string;
  userImage?: string;
  memory: string;
  date: string;
  image?: string;
  likes: number;
}

export interface RecipeRating {
  userId: string;
  userName: string;
  rating: number; // 1-5
  review?: string;
  date: string;
}

export interface Recipe {
  id: string;
  familyId: string;
  createdBy: string;
  name: string;
  description?: string;
  cuisine: CuisineType;
  mealType: MealType;
  difficulty: DifficultyLevel;
  servings: number;
  prepTime: number; // in minutes
  cookTime: number; // in minutes
  totalTime: number; // in minutes
  ingredients: Ingredient[];
  instructions: RecipeInstruction[];
  dietaryRestrictions: DietaryRestriction[];
  tags: string[];
  images: string[];
  thumbnail?: string;
  nutritionInfo?: {
    calories: number;
    protein: number; // in grams
    carbs: number; // in grams
    fat: number; // in grams
  };
  ratings: RecipeRating[];
  averageRating: number;
  memories: RecipeMemory[];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MealPlanDay {
  date: string;
  breakfast?: Recipe;
  lunch?: Recipe;
  dinner?: Recipe;
  snack?: Recipe;
  notes?: string;
}

export interface MealPlan {
  id: string;
  familyId: string;
  createdBy: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  days: MealPlanDay[];
  shoppingList?: string; // generated shopping list ID
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecipeRequest {
  name: string;
  description?: string;
  cuisine: CuisineType;
  mealType: MealType;
  difficulty: DifficultyLevel;
  servings: number;
  prepTime: number;
  cookTime: number;
  ingredients: Ingredient[];
  instructions: RecipeInstruction[];
  dietaryRestrictions?: DietaryRestriction[];
  tags?: string[];
  nutritionInfo?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface UpdateRecipeRequest extends Partial<CreateRecipeRequest> {}

export interface CreateMealPlanRequest {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  days: MealPlanDay[];
  tags?: string[];
}

export interface AddRecipeMemoryRequest {
  memory: string;
  image?: string;
}

export interface RateRecipeRequest {
  rating: number;
  review?: string;
}

export interface RecipesResponse {
  recipes: Recipe[];
  total: number;
  page: number;
  limit: number;
}

export interface RecipeFilter {
  familyId: string;
  cuisine?: CuisineType;
  mealType?: MealType;
  difficulty?: DifficultyLevel;
  dietaryRestrictions?: DietaryRestriction[];
  tags?: string[];
  isFavorite?: boolean;
  page?: number;
  limit?: number;
}

// ============================================
// RECIPES API SERVICE
// ============================================

class RecipesApiService {
  private baseUrl = '/api/recipes';
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
    };
  }

  // ==================== RECIPE CRUD ====================

  /**
   * Create a new recipe
   */
  async createRecipe(familyId: string, request: CreateRecipeRequest): Promise<Recipe> {
    const response = await fetch(`${this.baseUrl}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ ...request, familyId }),
    });

    if (!response.ok) throw new Error('Failed to create recipe');
    return response.json();
  }

  /**
   * Get recipes with filtering
   */
  async getRecipes(filter: RecipeFilter): Promise<RecipesResponse> {
    const params = new URLSearchParams();
    params.append('familyId', filter.familyId);
    if (filter.cuisine) params.append('cuisine', filter.cuisine);
    if (filter.mealType) params.append('mealType', filter.mealType);
    if (filter.difficulty) params.append('difficulty', filter.difficulty);
    if (filter.dietaryRestrictions?.length) {
      params.append('dietaryRestrictions', filter.dietaryRestrictions.join(','));
    }
    if (filter.tags?.length) params.append('tags', filter.tags.join(','));
    if (filter.isFavorite !== undefined) params.append('isFavorite', filter.isFavorite.toString());
    if (filter.page) params.append('page', filter.page.toString());
    if (filter.limit) params.append('limit', filter.limit.toString());

    const response = await fetch(`${this.baseUrl}?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch recipes');
    return response.json();
  }

  /**
   * Get a single recipe
   */
  async getRecipe(recipeId: string): Promise<Recipe> {
    const response = await fetch(`${this.baseUrl}/${recipeId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch recipe');
    return response.json();
  }

  /**
   * Update a recipe
   */
  async updateRecipe(recipeId: string, request: UpdateRecipeRequest): Promise<Recipe> {
    const response = await fetch(`${this.baseUrl}/${recipeId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Failed to update recipe');
    return response.json();
  }

  /**
   * Delete a recipe
   */
  async deleteRecipe(recipeId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/${recipeId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to delete recipe');
    return response.json();
  }

  /**
   * Toggle recipe as favorite
   */
  async toggleFavorite(recipeId: string): Promise<Recipe> {
    const response = await fetch(`${this.baseUrl}/${recipeId}/toggle-favorite`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to toggle favorite');
    return response.json();
  }

  // ==================== IMAGES & UPLOADS ====================

  /**
   * Upload recipe image
   */
  async uploadImage(recipeId: string, file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/${recipeId}/images`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    });

    if (!response.ok) throw new Error('Failed to upload image');
    return response.json();
  }

  /**
   * Set recipe thumbnail
   */
  async setThumbnail(recipeId: string, imageUrl: string): Promise<Recipe> {
    const response = await fetch(`${this.baseUrl}/${recipeId}/thumbnail`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ imageUrl }),
    });

    if (!response.ok) throw new Error('Failed to set thumbnail');
    return response.json();
  }

  // ==================== RATINGS & REVIEWS ====================

  /**
   * Rate a recipe
   */
  async rateRecipe(recipeId: string, request: RateRecipeRequest): Promise<Recipe> {
    const response = await fetch(`${this.baseUrl}/${recipeId}/rate`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Failed to rate recipe');
    return response.json();
  }

  /**
   * Get recipe ratings
   */
  async getRatings(recipeId: string): Promise<RecipeRating[]> {
    const response = await fetch(`${this.baseUrl}/${recipeId}/ratings`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch ratings');
    return response.json();
  }

  // ==================== MEMORIES ====================

  /**
   * Add memory to recipe
   */
  async addMemory(recipeId: string, request: AddRecipeMemoryRequest): Promise<RecipeMemory> {
    const response = await fetch(`${this.baseUrl}/${recipeId}/memories`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Failed to add memory');
    return response.json();
  }

  /**
   * Get recipe memories
   */
  async getMemories(recipeId: string): Promise<RecipeMemory[]> {
    const response = await fetch(`${this.baseUrl}/${recipeId}/memories`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch memories');
    return response.json();
  }

  /**
   * Delete memory
   */
  async deleteMemory(recipeId: string, memoryId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/${recipeId}/memories/${memoryId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to delete memory');
    return response.json();
  }

  /**
   * Like memory
   */
  async likeMemory(recipeId: string, memoryId: string): Promise<RecipeMemory> {
    const response = await fetch(`${this.baseUrl}/${recipeId}/memories/${memoryId}/like`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to like memory');
    return response.json();
  }

  // ==================== MEAL PLANNING ====================

  /**
   * Create a meal plan
   */
  async createMealPlan(familyId: string, request: CreateMealPlanRequest): Promise<MealPlan> {
    const response = await fetch(`${this.baseUrl}/meal-plans`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ ...request, familyId }),
    });

    if (!response.ok) throw new Error('Failed to create meal plan');
    return response.json();
  }

  /**
   * Get meal plans
   */
  async getMealPlans(
    familyId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ plans: MealPlan[]; total: number }> {
    const params = new URLSearchParams({ familyId });
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await fetch(`${this.baseUrl}/meal-plans?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch meal plans');
    return response.json();
  }

  /**
   * Get a single meal plan
   */
  async getMealPlan(mealPlanId: string): Promise<MealPlan> {
    const response = await fetch(`${this.baseUrl}/meal-plans/${mealPlanId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch meal plan');
    return response.json();
  }

  /**
   * Update meal plan
   */
  async updateMealPlan(mealPlanId: string, request: Partial<CreateMealPlanRequest>): Promise<MealPlan> {
    const response = await fetch(`${this.baseUrl}/meal-plans/${mealPlanId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Failed to update meal plan');
    return response.json();
  }

  /**
   * Delete meal plan
   */
  async deleteMealPlan(mealPlanId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/meal-plans/${mealPlanId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to delete meal plan');
    return response.json();
  }

  /**
   * Generate shopping list from meal plan
   */
  async generateShoppingList(mealPlanId: string): Promise<{ shoppingListId: string }> {
    const response = await fetch(`${this.baseUrl}/meal-plans/${mealPlanId}/generate-shopping-list`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to generate shopping list');
    return response.json();
  }

  // ==================== SEARCH & DISCOVERY ====================

  /**
   * Search recipes
   */
  async searchRecipes(familyId: string, query: string): Promise<Recipe[]> {
    const params = new URLSearchParams({ familyId, query });

    const response = await fetch(`${this.baseUrl}/search?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to search recipes');
    return response.json();
  }

  /**
   * Get trending recipes
   */
  async getTrendingRecipes(familyId: string): Promise<Recipe[]> {
    const params = new URLSearchParams({ familyId });

    const response = await fetch(`${this.baseUrl}/trending?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch trending recipes');
    return response.json();
  }

  /**
   * Get recipe recommendations
   */
  async getRecommendations(familyId: string, userId: string): Promise<Recipe[]> {
    const params = new URLSearchParams({ familyId, userId });

    const response = await fetch(`${this.baseUrl}/recommendations?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch recommendations');
    return response.json();
  }

  // ==================== IMPORT/EXPORT ====================

  /**
   * Export recipe as PDF
   */
  async exportRecipePDF(recipeId: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/${recipeId}/export/pdf`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to export recipe');
    return response.blob();
  }

  /**
   * Share recipe
   */
  async shareRecipe(recipeId: string): Promise<{ shareUrl: string }> {
    const response = await fetch(`${this.baseUrl}/${recipeId}/share`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to share recipe');
    return response.json();
  }

  /**
   * Duplicate recipe
   */
  async duplicateRecipe(recipeId: string, familyId: string): Promise<Recipe> {
    const response = await fetch(`${this.baseUrl}/${recipeId}/duplicate`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ familyId }),
    });

    if (!response.ok) throw new Error('Failed to duplicate recipe');
    return response.json();
  }
}

export default new RecipesApiService();
