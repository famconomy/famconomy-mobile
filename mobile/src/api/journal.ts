import apiClient from './apiClient';

// Journal Entry Types
export interface JournalEntry {
  EntryID: number;
  FamilyID: number;
  Title: string;
  EntryText: string;
  IsPrivate: boolean;
  CreatedByUserID: string;
  CreatedAt: string;
  UpdatedAt?: string;
  user?: {
    UserID: string;
    FirstName: string;
    LastName: string;
    ProfilePhotoUrl?: string;
  };
}

export interface CreateJournalEntryPayload {
  FamilyID: number;
  Title: string;
  EntryText: string;
  IsPrivate: boolean;
}

export interface UpdateJournalEntryPayload {
  Title?: string;
  EntryText?: string;
  IsPrivate?: boolean;
}

/**
 * Get all journal entries for a family
 */
export const getJournalEntries = async (familyId: string | number): Promise<JournalEntry[]> => {
  const response = await apiClient.get(`/journal/family/${familyId}`);
  return response.data;
};

/**
 * Get a single journal entry by ID
 */
export const getJournalEntry = async (entryId: string | number): Promise<JournalEntry> => {
  const response = await apiClient.get(`/journal/${entryId}`);
  return response.data;
};

/**
 * Create a new journal entry
 */
export const createJournalEntry = async (
  entryData: CreateJournalEntryPayload
): Promise<JournalEntry> => {
  const response = await apiClient.post('/journal', entryData);
  return response.data;
};

/**
 * Update an existing journal entry
 */
export const updateJournalEntry = async (
  entryId: string | number,
  entryData: UpdateJournalEntryPayload
): Promise<void> => {
  await apiClient.put(`/journal/${entryId}`, entryData);
};

/**
 * Delete a journal entry
 */
export const deleteJournalEntry = async (entryId: string | number): Promise<void> => {
  await apiClient.delete(`/journal/${entryId}`);
};
