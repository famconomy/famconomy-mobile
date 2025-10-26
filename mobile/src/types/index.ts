// Core type definitions for FamConomy Mobile App

export type UserRole = 'admin' | 'parent' | 'guardian' | 'child';
export type UserStatus = 'active' | 'inactive' | 'pending';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type TaskCategory = 'chores' | 'homework' | 'shopping' | 'activities' | 'other';
export type RewardType = 'screentime' | 'points' | 'currency';
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';
export type MessageType = 'direct' | 'group';
export type MessageStatus = 'sent' | 'delivered' | 'read';
export type BudgetPeriod = 'weekly' | 'monthly' | 'yearly';
export type Visibility = 'FAMILY' | 'LINK';
export type MealStatus = 'SUGGESTED' | 'APPROVED' | 'ARCHIVED';
export type MealSlot = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

// User Types
export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  familyId: string;
  signupDate: string;
  lastLogin: string | null;
  phoneNumber?: string;
  smsEnabled?: boolean;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
}

// Family Types
export interface Family {
  familyId: number;
  familyName: string;
  familyMantra?: string;
  familyValues: string[];
  members: FamilyMember[];
  createdAt: string;
  settings: FamilySettings;
}

export interface FamilyMember {
  userId: string;
  role: UserRole;
  joinedAt: string;
  permissions: string[];
}

export interface FamilySettings {
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  notifications?: boolean;
}

export interface FamilyInvite {
  inviteId: string;
  familyId: number;
  email: string;
  role: UserRole;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'declined';
}

// Task Types
export interface Task {
  taskId: number;
  familyId: number;
  title: string;
  description?: string;
  dueDate?: string;
  assignedToUserId?: string;
  createdByUserId: string;
  status: TaskStatus;
  rewardType?: RewardType;
  rewardValue?: number;
  category: TaskCategory;
  recurring?: RecurrenceType;
  attachments?: Attachment[];
  createdAt: string;
  updatedAt: string;
  isCustom?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
}

export interface TaskUpdatePayload {
  status?: TaskStatus;
  title?: string;
  description?: string;
  dueDate?: string;
  rewardType?: RewardType;
  rewardValue?: number;
}

// Calendar Types
export interface CalendarEvent {
  eventId: number;
  title: string;
  startTime: string;
  endTime?: string;
  description?: string;
  location?: string;
  familyId: number;
  createdByUserId: string;
  assignedToUserId?: string;
  repeatType?: RecurrenceType;
  recurrencePattern?: string;
  isPrivate?: boolean;
  reminder?: boolean;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

// Budget Types
export interface Budget {
  budgetId: number;
  familyId: number;
  name: string;
  amount: number;
  spentAmount: number;
  period: BudgetPeriod;
  startDate: string;
  endDate?: string;
  categories: BudgetCategory[];
  createdAt: string;
}

export interface BudgetCategory {
  categoryId: number;
  name: string;
  limit: number;
  spent: number;
}

export interface Transaction {
  transactionId: number;
  budgetId: number;
  amount: number;
  category: string;
  description: string;
  date: string;
  createdBy: string;
}

// Messaging Types
export interface Chat {
  id: string;
  type: MessageType;
  participants: string[];
  familyId: string;
  lastMessage?: Message;
  lastMessageTime?: string;
  createdAt: string;
  name?: string;
  avatar?: string;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName?: string;
  chatId: string;
  timestamp: string;
  status: MessageStatus;
  type: 'text' | 'image' | 'file';
  metadata?: {
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    imageUrl?: string;
  };
}

// Recipe Types
export interface Recipe {
  recipeId: number;
  familyId: number;
  title: string;
  subtitle?: string;
  description?: string;
  originStory?: string;
  servings?: number;
  prepMinutes?: number;
  cookMinutes?: number;
  createdByUserId: string;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  memories?: RecipeMemory[];
  favorites?: RecipeFavorite[];
  visibility: Visibility;
  coverImageUrl?: string;
  createdAt: string;
  updatedAt: string;
  isFavorite?: boolean;
}

export interface RecipeIngredient {
  ingredientId: number;
  name: string;
  quantity: string;
  unit: string;
  notes?: string;
}

export interface RecipeStep {
  stepId: number;
  stepNumber: number;
  instruction: string;
  durationMinutes?: number;
  tip?: string;
}

export interface RecipeMemory {
  memoryId: number;
  userId: string;
  userName?: string;
  content: string;
  createdAt: string;
}

export interface RecipeFavorite {
  userId: string;
  createdAt: string;
}

// Shopping Types
export interface ShoppingList {
  shoppingListId: number;
  familyId: number;
  name: string;
  createdByUserId: string;
  createdAt: string;
  items: ShoppingItem[];
}

export interface ShoppingItem {
  itemId: number;
  name: string;
  quantity: number;
  unit: string;
  category?: string;
  completed: boolean;
  completedAt?: string;
  completedByUserId?: string;
}

// Journal Types
export interface JournalEntry {
  journalId: number;
  userId: string;
  familyId: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isPrivate: boolean;
}

// Wishlist Types
export interface Wishlist {
  wishlistId: number;
  userId: string;
  familyId: number;
  name: string;
  items: WishlistItem[];
  isPublic: boolean;
  createdAt: string;
}

export interface WishlistItem {
  itemId: number;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  url?: string;
  price?: number;
  claimed?: boolean;
  claimedByUserId?: string;
}

// Attachment Types
export interface Attachment {
  attachmentId: number;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

// Dashboard Types
export interface DashboardData {
  upcomingEvents: number;
  pendingTasks: number;
  unreadMessages: number;
  activeMembers: number;
  familyName?: string;
  familyMantra?: string;
  familyValues: string[];
  leaderboard: LeaderboardEntry[];
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  points: number;
  rank: number;
  avatar?: string;
}

// State Types
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  token: string | null;
}

export interface AppState {
  family: Family | null;
  theme: 'light' | 'dark';
  notifications: boolean;
  isInitialized: boolean;
}

// Navigation Types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Splash: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
  Join: undefined;
  Onboarding: undefined;
};

export type MainStackParamList = {
  HomeTabs: undefined;
  EventDetails: { eventId: number };
  TaskDetails: { taskId: number };
  RecipeDetails: { recipeId: number };
  MemberProfile: { userId: string };
  EditProfile: undefined;
  ChatDetail: { chatId: string };
};

export type TabParamList = {
  Dashboard: undefined;
  Calendar: undefined;
  Tasks: undefined;
  Messages: undefined;
  Shopping: undefined;
  Budget: undefined;
  Family: undefined;
  More: undefined;
};

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
