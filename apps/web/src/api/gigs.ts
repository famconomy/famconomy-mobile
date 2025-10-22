import apiClient from './apiClient';
import { createDebugLogger } from '../utils/debug';
import { GigTemplate, FamilyGig, Room } from '../types/gigs';
const gigsApiDebug = createDebugLogger('api-gigs');

export const getGigTemplates = async (): Promise<GigTemplate[]> => {
  const response = await apiClient.get('/gigs/templates');
  return response.data;
};

export const getFamilyGigs = async (familyId: number): Promise<FamilyGig[]> => {
  const response = await apiClient.get(`/gigs?familyId=${familyId}`);
  return response.data;
};

export const addGigToFamily = async (gigTemplateId: number, roomId: number, cadenceType: string, maxPerDay?: number, visible?: boolean): Promise<FamilyGig> => {
  gigsApiDebug.log('addGigToFamily: gigTemplateId', gigTemplateId);
  gigsApiDebug.log('addGigToFamily: roomId', roomId);
  gigsApiDebug.log('addGigToFamily: cadenceType', cadenceType);
  const response = await apiClient.post('/gigs', { gigTemplateId, roomId, cadenceType, maxPerDay, visible });
  return response.data;
};

export const updateFamilyGig = async (id: number, data: any): Promise<FamilyGig> => {
  const response = await apiClient.put(`/gigs/${id}`, data);
  return response.data;
};

export const removeFamilyGig = async (id: number): Promise<void> => {
  await apiClient.delete(`/gigs/${id}`);
};

export const getRooms = async (familyId: number): Promise<Room[]> => {
  const response = await apiClient.get(`/rooms?familyId=${familyId}`);
  return response.data;
};

export const createRoom = async (familyId: number, name: string, roomTemplateId?: number): Promise<Room> => {
  const response = await apiClient.post('/rooms', { familyId, name, roomTemplateId });
  return response.data;
};

export const updateRoom = async (roomId: number, data: Partial<Pick<Room, 'name' | 'roomTemplateId'>>): Promise<Room> => {
  const response = await apiClient.put(`/rooms/${roomId}`, data);
  return response.data;
};

export const deleteRoom = async (roomId: number): Promise<void> => {
  await apiClient.delete(`/rooms/${roomId}`);
};

export const resetRooms = async (familyId: number): Promise<void> => {
  await apiClient.post('/rooms/reset', { familyId });
};

export const claimGig = async (gigId: number): Promise<FamilyGig> => {
  const response = await apiClient.post(`/gigs/${gigId}/claim`);
  return response.data;
};

export const completeGig = async (gigId: number): Promise<FamilyGig> => {
  const response = await apiClient.post(`/gigs/${gigId}/complete`);
  return response.data;
};
