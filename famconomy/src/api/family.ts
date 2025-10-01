import apiClient from './apiClient';
import { Family, User } from '../types/family';

export interface FamilyDetails extends Family {
  members: User[];
}

export interface FamiliesResponse {
  families: FamilyDetails[];
  activeFamilyId: number | null;
}

export const getMyFamily = async (): Promise<FamiliesResponse> => {
  const response = await apiClient.get('/family');
  return response.data;
};

export const createFamily = async (familyName: string): Promise<Family> => {
  const response = await apiClient.post('/family', { familyName });
  return response.data;
};

export const updateFamily = async (id: string, familyName: string, familyMantra: string, familyValues?: string[]): Promise<void> => {
  await apiClient.put(`/family/${id}`, { familyName, familyMantra, familyValues });
};

export const updateFamilyMemberRole = async (familyId: string, memberId: string, relationshipId: number): Promise<void> => {
  await apiClient.put(`/family/${familyId}/members/${memberId}/role`, { relationshipId });
};

export const updateFamilyMemberPermissions = async (familyId: string, memberId: string, permissions: string[]): Promise<void> => {
  await apiClient.put(`/family/${familyId}/members/${memberId}/permissions`, { permissions });
};

export const removeFamilyMember = async (familyId: string, memberId: string): Promise<void> => {
  await apiClient.delete(`/family/${familyId}/members/${memberId}`);
};

export const leaveFamily = async (): Promise<void> => {
  await apiClient.delete('/family/leave');
};
