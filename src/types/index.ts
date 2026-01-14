/**
 * Type definitions for FamConomy Mobile
 * 
 * Re-exports shared types and defines native-specific types
 */

// Re-export all shared types
export * from '@famconomy/shared';

// Export FamilyControls types
export * from './familyControls';

// Native-specific types
export interface AppState {
  family: Family | null;
  theme: 'light' | 'dark';
  notifications: boolean;
  emailNotifications: boolean;
  isInitialized: boolean;
}

// Import Family type for AppState
import type { Family } from '@famconomy/shared';
