import { Family, FamilyInvite, FamilyMember } from '../types';
import { apiClient } from './apiClient';

export const familyClient = {
  async get(familyId: string): Promise<Family> {
    return apiClient.get(`/families/${familyId}`);
  },

  async create(data: Partial<Family>): Promise<Family> {
    return apiClient.post('/families', data);
  },

  async update(familyId: string, data: Partial<Family>): Promise<Family> {
    return apiClient.put(`/families/${familyId}`, data);
  },

  async getMembers(familyId: string): Promise<FamilyMember[]> {
    return apiClient.get(`/families/${familyId}/members`);
  },

  async addMember(familyId: string, userId: string, role?: string): Promise<FamilyMember> {
    return apiClient.post(`/families/${familyId}/members`, { userId, role });
  },

  async removeMember(familyId: string, userId: string): Promise<void> {
    return apiClient.delete(`/families/${familyId}/members/${userId}`);
  },

  async getInvites(familyId: string): Promise<FamilyInvite[]> {
    return apiClient.get(`/families/${familyId}/invites`);
  },

  async sendInvite(familyId: string, email: string, role?: string): Promise<FamilyInvite> {
    return apiClient.post(`/families/${familyId}/invites`, { email, role });
  },

  async acceptInvite(inviteId: string): Promise<void> {
    return apiClient.put(`/invites/${inviteId}/accept`, {});
  },

  async declineInvite(inviteId: string): Promise<void> {
    return apiClient.put(`/invites/${inviteId}/decline`, {});
  },
};
