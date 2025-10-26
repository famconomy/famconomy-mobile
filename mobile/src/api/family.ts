import { apiClient } from './client';
import type { Family, FamilyMember, FamilyInvite, User } from '../types';

export interface FamilyResponse {
  familyId: number;
  familyName: string;
  familyMantra?: string;
  familyValues: string[];
  members: FamilyMember[];
  createdAt: string;
  settings: FamilySettings;
}

export interface FamilySettings {
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  notifications?: boolean;
  [key: string]: any;
}

export interface CreateFamilyRequest {
  familyName: string;
  familyMantra?: string;
  familyValues?: string[];
}

export interface UpdateFamilyRequest {
  familyName?: string;
  familyMantra?: string;
  familyValues?: string[];
}

export interface InviteMemberRequest {
  email: string;
  role: 'parent' | 'guardian' | 'child';
}

export interface UpdateMemberRoleRequest {
  role: 'parent' | 'guardian' | 'child';
}

/**
 * Get current family info
 */
export const getFamily = async (familyId: string): Promise<FamilyResponse> => {
  try {
    const response = await apiClient.get<FamilyResponse>(`/family/${familyId}`);
    return response.data;
  } catch (error) {
    throw handleFamilyError(error);
  }
};

/**
 * Create a new family
 */
export const createFamily = async (data: CreateFamilyRequest): Promise<FamilyResponse> => {
  try {
    const response = await apiClient.post<FamilyResponse>('/family', data);
    return response.data;
  } catch (error) {
    throw handleFamilyError(error);
  }
};

/**
 * Update family info
 */
export const updateFamily = async (
  familyId: string,
  data: UpdateFamilyRequest
): Promise<FamilyResponse> => {
  try {
    const response = await apiClient.put<FamilyResponse>(`/family/${familyId}`, data);
    return response.data;
  } catch (error) {
    throw handleFamilyError(error);
  }
};

/**
 * Get family members
 */
export const getFamilyMembers = async (familyId: string): Promise<FamilyMember[]> => {
  try {
    const response = await apiClient.get<FamilyMember[]>(`/family/${familyId}/members`);
    return response.data;
  } catch (error) {
    throw handleFamilyError(error);
  }
};

/**
 * Get member details
 */
export const getMember = async (userId: string): Promise<User> => {
  try {
    const response = await apiClient.get<User>(`/users/${userId}`);
    return response.data;
  } catch (error) {
    throw handleFamilyError(error);
  }
};

/**
 * Update member role
 */
export const updateMemberRole = async (
  familyId: string,
  userId: string,
  data: UpdateMemberRoleRequest
): Promise<FamilyMember> => {
  try {
    const response = await apiClient.patch<FamilyMember>(
      `/family/${familyId}/members/${userId}`,
      data
    );
    return response.data;
  } catch (error) {
    throw handleFamilyError(error);
  }
};

/**
 * Remove member from family
 */
export const removeMember = async (
  familyId: string,
  userId: string
): Promise<{ success: boolean }> => {
  try {
    const response = await apiClient.delete<{ success: boolean }>(
      `/family/${familyId}/members/${userId}`
    );
    return response.data;
  } catch (error) {
    throw handleFamilyError(error);
  }
};

/**
 * Invite member to family
 */
export const inviteMember = async (
  familyId: string,
  data: InviteMemberRequest
): Promise<FamilyInvite> => {
  try {
    const response = await apiClient.post<FamilyInvite>(
      `/family/${familyId}/invitations`,
      data
    );
    return response.data;
  } catch (error) {
    throw handleFamilyError(error);
  }
};

/**
 * Get pending invitations
 */
export const getPendingInvitations = async (familyId: string): Promise<FamilyInvite[]> => {
  try {
    const response = await apiClient.get<FamilyInvite[]>(
      `/family/${familyId}/invitations?status=pending`
    );
    return response.data;
  } catch (error) {
    throw handleFamilyError(error);
  }
};

/**
 * Accept invitation
 */
export const acceptInvitation = async (invitationId: string): Promise<{ success: boolean }> => {
  try {
    const response = await apiClient.post<{ success: boolean }>(
      `/invitations/${invitationId}/accept`
    );
    return response.data;
  } catch (error) {
    throw handleFamilyError(error);
  }
};

/**
 * Decline invitation
 */
export const declineInvitation = async (invitationId: string): Promise<{ success: boolean }> => {
  try {
    const response = await apiClient.post<{ success: boolean }>(
      `/invitations/${invitationId}/decline`
    );
    return response.data;
  } catch (error) {
    throw handleFamilyError(error);
  }
};

/**
 * Resend invitation
 */
export const resendInvitation = async (invitationId: string): Promise<FamilyInvite> => {
  try {
    const response = await apiClient.post<FamilyInvite>(
      `/invitations/${invitationId}/resend`
    );
    return response.data;
  } catch (error) {
    throw handleFamilyError(error);
  }
};

/**
 * Cancel invitation
 */
export const cancelInvitation = async (invitationId: string): Promise<{ success: boolean }> => {
  try {
    const response = await apiClient.delete<{ success: boolean }>(
      `/invitations/${invitationId}`
    );
    return response.data;
  } catch (error) {
    throw handleFamilyError(error);
  }
};

function handleFamilyError(error: any): Error {
  if (error.response?.data?.error) {
    return new Error(error.response.data.error);
  }
  if (error.response?.status === 404) {
    return new Error('Family not found');
  }
  if (error.response?.status === 400) {
    return new Error('Invalid family data');
  }
  if (error.response?.status === 409) {
    return new Error('Email already invited or member of family');
  }
  if (error.message) {
    return new Error(error.message);
  }
  return new Error('Failed to perform family operation');
}
