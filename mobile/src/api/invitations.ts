import apiClient from './apiClient';

export interface InvitationDetails {
  email: string;
  familyName: string;
  inviterName: string;
}

export async function getInvitationDetails(token: string): Promise<InvitationDetails> {
  const { data } = await apiClient.get('/invitations/details', { params: { token } });
  return data;
}

export async function acceptInvitation(token: string): Promise<{ message: string; email?: string }> {
  const { data } = await apiClient.post('/invitations/accept', { token });
  return data;
}

export async function declineInvitation(token: string): Promise<{ message: string }> {
  const { data } = await apiClient.post('/invitations/decline', { token });
  return data;
}

export async function createInvitation(params: { familyId: number | string; email: string; invitedBy: string; relationshipId?: number | null }) {
  const { data } = await apiClient.post('/invitations', params);
  return data;
}

export interface PendingInvitation {
  InvitationID: number;
  FamilyID: number;
  Email: string;
  Token: string;
  ExpiresAt: string;
  Family?: { FamilyName: string };
}

export async function getPendingInvitations(): Promise<PendingInvitation[]> {
  const { data } = await apiClient.get('/invitations/pending');
  return data;
}
