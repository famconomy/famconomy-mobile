import apiClient from './apiClient';
import { CalendarEvent } from '../types';

export interface CalendarEventRequest {
  familyId: number;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  location?: string;
  createdByUserId: string;
  recurrenceRule?: string | null;
  recurrenceExceptionDates?: string[];
  recurrenceParentId?: number;
  recurrenceOriginalStart?: string | null;
  recurrenceOriginalEnd?: string | null;
}

export const getCalendarEvents = async (familyId: string): Promise<CalendarEvent[]> => {
  const response = await apiClient.get(`/calendar/${familyId}`);
  return response.data;
};

export const createCalendarEvent = async (eventData: CalendarEventRequest): Promise<CalendarEvent> => {
  const response = await apiClient.post('/calendar', eventData);
  return response.data;
};

export const updateCalendarEvent = async (id: string, eventData: Partial<CalendarEventRequest>): Promise<void> => {
  await apiClient.put(`/calendar/${id}`, eventData);
};

export const deleteCalendarEvent = async (id: string): Promise<void> => {
  await apiClient.delete(`/calendar/${id}`);
};
