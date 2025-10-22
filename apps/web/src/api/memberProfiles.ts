import apiClient from './apiClient';

export type ProfileVisibility = 'FAMILY' | 'PARENTS' | 'LINK' | 'PRIVATE';

export interface MemberCareProfile {
  ProfileID?: number;
  UserID: string;
  FamilyID: number;
  clothingSizes: Record<string, unknown>;
  favoriteColors: string[];
  favoriteFoods: string[];
  interests: string[];
  allergies: string[];
  favoriteBrands: string[];
  notes?: string | null;
  wishlistSummary?: string | null;
  Visibility: ProfileVisibility;
  shareLinkActive?: boolean;
  LastUpdatedBy?: string | null;
  LastUpdatedAt?: string | null;
}

export interface MemberProfileResponse {
  profile: MemberCareProfile | null;
  user: {
    UserID: string;
    FirstName: string | null;
    LastName: string | null;
    Email: string | null;
    ProfilePhotoUrl?: string | null;
  } | null;
}

export interface UpsertMemberProfilePayload {
  clothingSizes?: Record<string, unknown> | null;
  favoriteColors?: string[] | null;
  favoriteFoods?: string[] | null;
  interests?: string[] | null;
  allergies?: string[] | null;
  favoriteBrands?: string[] | null;
  notes?: string | null;
  wishlistSummary?: string | null;
  visibility?: ProfileVisibility;
}

export interface ProfileShareResponse {
  shareUrl: string;
  expiresAt: string;
}

export const fetchMemberProfile = async (
  familyId: number | string,
  userId: string,
): Promise<MemberProfileResponse> => {
  const { data } = await apiClient.get(`/family/${familyId}/members/${userId}/profile`);
  return data as MemberProfileResponse;
};

export const upsertMemberProfile = async (
  familyId: number | string,
  userId: string,
  payload: UpsertMemberProfilePayload,
): Promise<MemberProfileResponse> => {
  const { data } = await apiClient.put(`/family/${familyId}/members/${userId}/profile`, payload);
  return data as MemberProfileResponse;
};

export const generateProfileShareLink = async (
  familyId: number | string,
  userId: string,
): Promise<ProfileShareResponse> => {
  const { data } = await apiClient.post(`/family/${familyId}/members/${userId}/profile/share`);
  return data as ProfileShareResponse;
};

export const revokeProfileShareLink = async (
  familyId: number | string,
  userId: string,
): Promise<void> => {
  await apiClient.post(`/family/${familyId}/members/${userId}/profile/share/revoke`);
};

export interface SharedProfileResponse {
  profile: MemberCareProfile | null;
  user: {
    UserID: string;
    FirstName: string | null;
    LastName: string | null;
    Email: string | null;
    ProfilePhotoUrl?: string | null;
  } | null;
  family: { FamilyID: number; FamilyName: string } | null;
  expiresAt: string | null;
}

export const fetchSharedProfile = async (token: string): Promise<SharedProfileResponse> => {
  const { data } = await apiClient.get(`/profiles/shared/${token}`);
  return data as SharedProfileResponse;
};
