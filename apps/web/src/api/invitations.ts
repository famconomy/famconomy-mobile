import apiClient from './apiClient';

export const createInvitation = async (familyId: string, email: string, invitedBy: string, relationshipId: number) => {
  const response = await apiClient.post('/invitations', { familyId, email, invitedBy, relationshipId });
  return response.data;
};

export const getPendingInvitations = async () => {
  const response = await apiClient.get('/invitations/pending');
  return response.data;
};

export const acceptInvitation = async (token: string) => {
  const response = await apiClient.post('/invitations/accept', { token });
  return response.data;
};

export const declineInvitation = async (token: string) => {
  const response = await apiClient.post('/invitations/decline', { token });
  return response.data;
};