import apiClient from './apiClient';
import type { FamilyRoom } from '../types';

export interface CreateRoomRequest {
  familyId: number;
  name: string;
  roomTemplateId?: number;
}

export const getRooms = async (familyId: number): Promise<FamilyRoom[]> => {
  const response = await apiClient.get<FamilyRoom[]>('/rooms', {
    params: { familyId },
  });
  return Array.isArray(response.data) ? response.data : [];
};

export const createRoom = async (request: CreateRoomRequest): Promise<FamilyRoom> => {
  const response = await apiClient.post<FamilyRoom>('/rooms', request);
  return response.data;
};

export const deleteRoom = async (roomId: number): Promise<void> => {
  await apiClient.delete(`/rooms/${roomId}`);
};

export const resetRooms = async (familyId: number): Promise<FamilyRoom[]> => {
  const response = await apiClient.post<FamilyRoom[]>('/rooms/reset', { familyId });
  return Array.isArray(response.data) ? response.data : [];
};
