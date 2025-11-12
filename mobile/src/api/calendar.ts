import apiClient from './apiClient';
import type { CalendarEvent, RecurrenceType } from '../types';

export interface CreateCalendarEventRequest {
  familyId: string;
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime?: string;
  createdByUserId: string;
  assignedToUserId?: string;
  repeatType?: RecurrenceType;
  recurrenceRule?: string | null;
  recurrenceExceptionDates?: string[];
  reminder?: boolean;
  isPrivate?: boolean;
  colorHex?: string;
}

export type UpdateCalendarEventRequest = Partial<CreateCalendarEventRequest>;

interface RawCalendarEvent {
  EventID: number;
  FamilyID: number;
  Title: string;
  Description?: string | null;
  Location?: string | null;
  StartTime: string;
  EndTime?: string | null;
  CreatedByUserID: string;
  CreatedByName?: string | null;
  AssignedToUserID?: string | null;
  AssignedToName?: string | null;
  Color?: string | null;
  IsPrivate?: boolean | null;
  Reminder?: boolean | null;
  RepeatType?: string | null;
  RecurrencePattern?: string | null;
  RecurrenceExceptionDates?: string[] | null;
  RecurrenceParentID?: number | null;
  RecurrenceOriginalStart?: string | null;
  RecurrenceOriginalEnd?: string | null;
  CreatedAt?: string;
  UpdatedAt?: string;
}

const mapRecurrence = (value?: string | null): RecurrenceType | undefined => {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (normalized === 'daily' || normalized === 'weekly' || normalized === 'monthly') {
    return normalized as RecurrenceType;
  }
  return 'none';
};

const mapCalendarEvent = (raw: RawCalendarEvent): CalendarEvent => ({
  eventId: raw.EventID,
  familyId: raw.FamilyID,
  title: raw.Title,
  description: raw.Description ?? undefined,
  location: raw.Location ?? undefined,
  startTime: raw.StartTime,
  endTime: raw.EndTime ?? undefined,
  createdByUserId: raw.CreatedByUserID,
  createdByName: raw.CreatedByName ?? undefined,
  assignedToUserId: raw.AssignedToUserID ?? undefined,
  assignedToName: raw.AssignedToName ?? undefined,
  color: raw.Color ?? undefined,
  isPrivate: raw.IsPrivate ?? undefined,
  reminder: raw.Reminder ?? undefined,
  repeatType: mapRecurrence(raw.RepeatType ?? raw.RecurrencePattern ?? undefined),
  recurrenceRule: raw.RecurrencePattern ?? null,
  recurrenceExceptionDates: raw.RecurrenceExceptionDates ?? undefined,
  recurrenceParentId: raw.RecurrenceParentID ?? null,
  recurrenceOriginalStart: raw.RecurrenceOriginalStart ?? null,
  recurrenceOriginalEnd: raw.RecurrenceOriginalEnd ?? null,
  createdAt: raw.CreatedAt ?? raw.StartTime,
  updatedAt: raw.UpdatedAt ?? raw.StartTime,
});

export const getCalendarEvents = async (familyId: string): Promise<CalendarEvent[]> => {
  const response = await apiClient.get(`/calendar/${familyId}`);
  const raw = Array.isArray(response.data) ? (response.data as RawCalendarEvent[]) : [];
  return raw.map(mapCalendarEvent);
};

const buildPayload = (data: CreateCalendarEventRequest | UpdateCalendarEventRequest) => {
  const payload: Record<string, unknown> = {};
  if ('familyId' in data && data.familyId) {
    payload.FamilyID = Number(data.familyId);
  }
  if (data.title !== undefined) payload.Title = data.title;
  if (data.description !== undefined) payload.Description = data.description || null;
  if (data.location !== undefined) payload.Location = data.location || null;
  if (data.startTime !== undefined) payload.StartTime = data.startTime;
  if (data.endTime !== undefined) payload.EndTime = data.endTime || null;
  if (data.createdByUserId !== undefined) payload.CreatedByUserID = data.createdByUserId;
  if (data.assignedToUserId !== undefined) payload.AssignedToUserID = data.assignedToUserId || null;
  if (data.reminder !== undefined) payload.Reminder = data.reminder;
  if (data.isPrivate !== undefined) payload.IsPrivate = data.isPrivate;
  if (data.colorHex !== undefined) payload.Color = data.colorHex;
  if (data.recurrenceExceptionDates !== undefined) {
    payload.RecurrenceExceptionDates = data.recurrenceExceptionDates;
  }
  if (data.recurrenceRule !== undefined) {
    payload.RecurrencePattern = data.recurrenceRule;
  } else if (data.repeatType && data.repeatType !== 'none') {
    payload.RecurrencePattern = buildSimpleRRule(data.repeatType, data.startTime);
  }
  if (data.repeatType !== undefined) {
    payload.RepeatType = data.repeatType;
  }

  return payload;
};

const buildSimpleRRule = (repeatType: RecurrenceType, start?: string): string | null => {
  if (!start || repeatType === 'none') return null;
  const dtStart = new Date(start);
  if (Number.isNaN(dtStart.getTime())) return null;
  const iso = dtStart.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  switch (repeatType) {
    case 'daily':
      return `DTSTART:${iso}\nRRULE:FREQ=DAILY`;
    case 'weekly':
      return `DTSTART:${iso}\nRRULE:FREQ=WEEKLY`;
    case 'monthly':
      return `DTSTART:${iso}\nRRULE:FREQ=MONTHLY`;
    default:
      return null;
  }
};

export const createCalendarEvent = async (
  data: CreateCalendarEventRequest
): Promise<CalendarEvent> => {
  const payload = buildPayload(data);
  const response = await apiClient.post('/calendar', payload);
  return mapCalendarEvent(response.data as RawCalendarEvent);
};

export const updateCalendarEvent = async (
  eventId: number,
  data: UpdateCalendarEventRequest
): Promise<CalendarEvent> => {
  const payload = buildPayload(data);
  const response = await apiClient.put(`/calendar/${eventId}`, payload);
  return mapCalendarEvent(response.data as RawCalendarEvent);
};

export const deleteCalendarEvent = async (eventId: number): Promise<void> => {
  await apiClient.delete(`/calendar/${eventId}`);
};
