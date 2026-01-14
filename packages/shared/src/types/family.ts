/**
 * Family & Member Types
 */

import type { UserRole } from './auth';

export interface Family {
  familyId: string;
  familyName: string;
  familyMantra?: string;
  familyValues: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface FamilyMember {
  userId: string;
  familyId: string;
  role: UserRole;
  fullName: string;
  avatar?: string;
  joinedAt: string;
  isActive: boolean;
}

export interface FamilyInvite {
  inviteId: string;
  familyId: string;
  email: string;
  role: UserRole;
  invitedByUserId: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
}

export interface FamilySettings {
  allowChildMessaging: boolean;
  requireTaskApproval: boolean;
  defaultScreenTimeMinutes: number;
  timezone: string;
}
