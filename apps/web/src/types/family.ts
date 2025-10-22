
export type FamilyRole = 'parent' | 'child' | 'guardian' | 'other';

// Types from the backup, used by the UI components
export interface FamilyMember {
  id: string;
  userId: string;
  familyId: string;
  role: FamilyRole;
  permissions: string[];
  joinedAt: string;
  nickname?: string;
  birthDate?: string;
  avatar?: string;
  color?: string;
  status: 'active' | 'inactive';
}

export interface FamilyInvite {
  id: string;
  familyId: string;
  email: string;
  role: FamilyRole;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  expiresAt: string;
}

export interface FamilySettings {
  id: string;
  familyId: string;
  name: string;
  timezone: string;
  currency: string;
  language: string;
  notificationPreferences: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  privacySettings: {
    shareCalendar: boolean;
    shareBudget: boolean;
    shareLocation: boolean;
  };
}

// Types from the backend
export interface User {
  UserID: string;
  FirstName: string;
  LastName: string;
  Email: string;
  ProfilePhotoUrl?: string;
  BirthDate?: string;
  PhoneNumber?: string;
  CreatedDate: string;
  RelationshipID?: number;
}

export interface Family {
  FamilyID: number;
  FamilyName: string;
  FamilyCrestUrl?: string;
  FamilyMantra?: string;
  FamilyValues?: string[];
  CreatedByUserID: string;
  CreatedDate: string;
  UpdatedDate: string;
  rewardMode?: 'points' | 'screenTime' | 'currency' | 'hybrid';
}

export interface FamilyDetails extends Family {
  members: User[];
}

export interface Relationship {
  RelationshipID: number;
  RelationshipName: string;
}

export interface Invitation {
  InvitationID: number;
  FamilyID: number;
  Email: string;
  Token: string;
  ExpiresAt: string;
  InvitedBy: string;
  Family: {
    FamilyName: string;
  };
}
