/**
 * Authentication & User Types
 * Shared between web (Supabase) and mobile (WebView bridge)
 */

export type UserRole = 'admin' | 'parent' | 'guardian' | 'child';
export type UserStatus = 'active' | 'inactive' | 'pending';

export interface User {
  id: string;
  email: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  familyId: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface Profile extends User {
  phoneNumber?: string;
  smsEnabled?: boolean;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  pushNotificationsEnabled?: boolean;
  emailNotificationsEnabled?: boolean;
  themePreference?: 'light' | 'dark' | 'system';
  language?: string;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: User;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  session: Session;
}

/**
 * Minimal session info passed from WebView to Native
 * Used for native module API calls
 */
export interface NativeSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId: string;
  familyId: string;
  role: UserRole;
}
