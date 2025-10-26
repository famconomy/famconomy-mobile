import apiClient from './apiClient';

export interface RoomTemplateSummary {
  id: number;
  name: string;
  description?: string;
}

export type RoomTemplate = RoomTemplateSummary;

export interface Room {
  id: number;
  familyId: number;
  name: string;
  roomTemplateId?: number | null;
  roomTemplate?: RoomTemplateSummary | null;
}

export interface GigTemplate {
  id: number;
  name: string;
  estimatedMinutes: number;
  applicableTags?: string | null;
  roomTemplate: RoomTemplateSummary | null;
}

export interface FamilyGig {
  id: number;
  familyId: number;
  gigTemplateId: number;
  familyRoomId: number;
  cadenceType: string;
  maxPerDay?: number;
  visible: boolean;
  overridePoints?: number;
  overrideCurrencyCents?: number;
  overrideScreenMinutes?: number;
  gigTemplate: GigTemplate;
  familyRoom?: Room | null;
  claims: GigClaim[];
}

export interface GigClaim {
  id: number;
  familyGigId: number;
  userId: number;
  claimedAt: string;
  completedAt?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'verified';
  user?: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

// Get all gig templates
export const getGigTemplates = async (): Promise<GigTemplate[]> => {
  const response = await apiClient.get('/gigs/templates');
  return response.data;
};

// Get family gigs
export const getFamilyGigs = async (familyId: number): Promise<FamilyGig[]> => {
  const response = await apiClient.get(`/gigs?familyId=${familyId}`);
  return response.data;
};

// Add gig to family
export const addGigToFamily = async (
  gigTemplateId: number,
  roomId: number,
  cadenceType: string,
  maxPerDay?: number,
  visible?: boolean
): Promise<FamilyGig> => {
  const response = await apiClient.post('/gigs', {
    gigTemplateId,
    roomId,
    cadenceType,
    maxPerDay,
    visible,
  });
  return response.data;
};

// Update family gig
export const updateFamilyGig = async (
  id: number,
  data: Partial<FamilyGig>
): Promise<FamilyGig> => {
  const response = await apiClient.put(`/gigs/${id}`, data);
  return response.data;
};

// Remove family gig
export const removeFamilyGig = async (id: number): Promise<void> => {
  await apiClient.delete(`/gigs/${id}`);
};

// Get rooms
export const getRooms = async (familyId: number): Promise<Room[]> => {
  const response = await apiClient.get(`/rooms?familyId=${familyId}`);
  return response.data;
};

// Create room
export const createRoom = async (
  familyId: number,
  name: string,
  roomTemplateId?: number
): Promise<Room> => {
  const response = await apiClient.post('/rooms', {
    familyId,
    name,
    roomTemplateId,
  });
  return response.data;
};

// Update room
export const updateRoom = async (
  roomId: number,
  data: Partial<Pick<Room, 'name' | 'roomTemplateId'>>
): Promise<Room> => {
  const response = await apiClient.put(`/rooms/${roomId}`, data);
  return response.data;
};

// Delete room
export const deleteRoom = async (roomId: number): Promise<void> => {
  await apiClient.delete(`/rooms/${roomId}`);
};

// Reset rooms
export const resetRooms = async (familyId: number): Promise<void> => {
  await apiClient.post('/rooms/reset', { familyId });
};

// Claim a gig
export const claimGig = async (gigId: number): Promise<FamilyGig> => {
  const response = await apiClient.post(`/gigs/${gigId}/claim`);
  return response.data;
};

// Complete a gig
export const completeGig = async (gigId: number): Promise<FamilyGig> => {
  const response = await apiClient.post(`/gigs/${gigId}/complete`);
  return response.data;
};

// Unclaim a gig
export const unclaimGig = async (gigId: number): Promise<FamilyGig> => {
  const response = await apiClient.post(`/gigs/${gigId}/unclaim`);
  return response.data;
};
