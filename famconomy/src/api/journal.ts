import { JournalEntry } from '../types/journal';
import apiClient from './apiClient';

export const getJournalEntries = async (familyId: string): Promise<JournalEntry[]> => {
  const response = await apiClient.get(`/journal/family/${familyId}`);
  return response.data;
};

export const createJournalEntry = async (entryData: Partial<JournalEntry>): Promise<JournalEntry> => {
  const response = await apiClient.post('/journal', entryData);
  return response.data;
};

export const updateJournalEntry = async (id: string, entryData: Partial<JournalEntry>): Promise<void> => {
  await apiClient.put(`/journal/${id}`, entryData);
};

export const deleteJournalEntry = async (id: string): Promise<void> => {
  await apiClient.delete(`/journal/${id}`);
};