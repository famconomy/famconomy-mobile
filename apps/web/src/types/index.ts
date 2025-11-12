import type { User } from '@famconomy/shared';

// Re-export core types from shared package
export * from '@famconomy/shared';

// Re-export local types
export * from './wishlist';
export * from './guidelines';

// Calendar Types
export interface CalendarEvent {
  EventID: number;
  Title: string;
  StartTime: string;
  EndTime?: string;
  Description?: string;
  Location?: string;
  Color?: string;
  IsPrivate?: boolean;
  Reminder?: boolean;
  FamilyID: number;
  CreatedByUserID: string;
  AssignedToUserID?: string;
  RepeatType?: 'none' | 'daily' | 'weekly' | 'monthly';
  RepeatUntil?: string | null;
  RecurrencePattern?: string | null;
  RecurrenceExceptionDates?: string[];
  RecurrenceParentID?: number | null;
  RecurrenceOriginalStart?: string | null;
  RecurrenceOriginalEnd?: string | null;
}

// Task Types
export interface Attachment {
  id: string;
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

export interface Task {
  TaskID: number;
  FamilyID: number;
  Title: string;
  Description?: string;
  DueDate?: string;
  AssignedToUserID?: string;
  CreatedByUserID: string;
  TaskStatusID: number;
  IsCustom?: boolean;
  SuggestedByChildID?: string;
  ApprovalStatusID: number;
  ApprovedByUserID?: string;
  RewardType?: 'screentime' | 'points' | 'currency';
  RewardValue?: number;
  attachments?: Attachment[];

  // Fields from the backup UI
  completed: boolean; // This can be derived from TaskStatusID
  assignedTo: string[]; // The backend only supports one assignee
  category: 'chores' | 'homework' | 'shopping' | 'activities' | 'other';
  points?: number;
  recurring?: 'daily' | 'weekly' | 'monthly' | 'none';
}

// Notification Types
export interface Notification {
  id: string;
  userId: string | null;
  message: string;
  readStatus: boolean;
  createdAt: string; // Renamed from timestamp to match backend
  type: 'event' | 'task' | 'message' | 'system' | 'invitation';
  relatedId?: string;
  link?: string;
}

// Auth Types
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  fullName: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Shopping Types
export interface ShoppingItem {
  ShoppingItemID: number;
  ShoppingListID: number;
  Name: string;
  Quantity: number;
  Unit?: string;
  Completed: boolean;
  AddedByUserID: string;
  AddedAt: string;
  CategoryID?: number;
}

export type ShoppingCategory = 
  | 'groceries'
  | 'household'
  | 'personal'
  | 'school'
  | 'other';

export interface ShoppingList {
  ShoppingListID: number;
  FamilyID: number;
  Name: string;
  CreatedByUserID: string;
  CreatedAt: string;
  ShoppingItems: ShoppingItem[];
}

export type MealStatus = 'SUGGESTED' | 'APPROVED' | 'ARCHIVED';
export type MealSlot = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

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
  Meals?: Meal[]; // Meals that reference this recipe
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

export interface MealTag {
  MealTagID: number;
  MealID: number;
  Tag: string;
}

export interface MealIngredient {
  MealIngredientID: number;
  MealID: number;
  Name: string;
  Quantity?: number;
  Unit?: string;
  Notes?: string;
  IsPantryItem: boolean;
}

export interface Meal {
  MealID: number;
  FamilyID: number;
  RecipeID?: number; // Optional link to Recipe
  Title: string;
  Description?: string;
  Instructions?: string;
  Status: MealStatus;
  IsFavorite: boolean;
  DefaultServings: number;
  CreatedByUserID: string;
  CreatedAt: string;
  UpdatedAt: string;
  Ingredients: MealIngredient[];
  Tags: MealTag[];
  Recipe?: Recipe; // Optional recipe details when included
}

export interface MealPlanEntry {
  MealPlanEntryID: number;
  MealPlanWeekID: number;
  MealID: number;
  DayOfWeek: number;
  MealSlot: MealSlot;
  Servings: number;
  Notes?: string;
  AddedByUserID: string;
  AddedAt: string;
  Meal: Meal;
}

export interface JournalEntry {
  // ... (existing properties)
}

export interface MealSuggestion {
  mealId: number;
  dayOfWeek: number;
  mealSlot: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
}
