import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  type CreateCalendarEventRequest,
  type UpdateCalendarEventRequest,
} from '../api/calendar';
import type { CalendarEvent } from '../types';
import type { CalendarTimeframe } from '../store/calendarFiltersStore';

interface UseCalendarOptions {
  familyId?: string;
  timeframe?: CalendarTimeframe;
  memberId?: string;
  showPrivateOnly?: boolean;
  showRemindersOnly?: boolean;
}

export interface UseCalendarReturn {
  events: CalendarEvent[];
  filteredEvents: CalendarEvent[];
  groupedEvents: Array<{ date: string; events: CalendarEvent[] }>;
  nextEvent?: CalendarEvent;
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  createEvent: (data: CreateCalendarEventRequest) => Promise<CalendarEvent>;
  updateEvent: (eventId: number, data: UpdateCalendarEventRequest) => Promise<CalendarEvent>;
  deleteEvent: (eventId: number) => Promise<void>;
}

const formatDateKey = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso.split('T')[0] ?? iso;
  }
  return date.toISOString().split('T')[0];
};

const sortEvents = (events: CalendarEvent[]): CalendarEvent[] =>
  [...events].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

export const useCalendar = (options: UseCalendarOptions = {}): UseCalendarReturn => {
  const {
    familyId,
    timeframe = 'upcoming',
    memberId,
    showPrivateOnly = false,
    showRemindersOnly = false,
  } = options;
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const hasLoadedRef = useRef(false);

  const fetchEvents = useCallback(
    async (source: 'initial' | 'refresh' = 'initial') => {
      if (!familyId) {
        setEvents([]);
        setIsLoading(false);
        setIsRefreshing(false);
        setError(null);
        hasLoadedRef.current = false;
        return;
      }

      const shouldShowInitial = !hasLoadedRef.current && source === 'initial';
      try {
        if (shouldShowInitial) {
          setIsLoading(true);
        }
        if (source === 'refresh') {
          setIsRefreshing(true);
        }
        setError(null);

        const data = await getCalendarEvents(familyId);
        const ordered = sortEvents(data);
        setEvents(ordered);
        hasLoadedRef.current = true;
      } catch (err) {
        const calendarError = err instanceof Error ? err : new Error('Failed to load events');
        setError(calendarError);
      } finally {
        if (shouldShowInitial) {
          setIsLoading(false);
        }
        setIsRefreshing(false);
      }
    },
    [familyId]
  );

  useEffect(() => {
    fetchEvents('initial');
  }, [fetchEvents]);

  const refetch = useCallback(async () => {
    await fetchEvents('refresh');
  }, [fetchEvents]);

  const handleCreate = useCallback(
    async (data: CreateCalendarEventRequest): Promise<CalendarEvent> => {
      if (!familyId) {
        throw new Error('Family ID is required to create events');
      }

      const event = await createCalendarEvent({ ...data, familyId });
      setEvents((prev) => sortEvents([event, ...prev]));
      return event;
    },
    [familyId]
  );

  const handleUpdate = useCallback(
    async (eventId: number, data: UpdateCalendarEventRequest): Promise<CalendarEvent> => {
      const updated = await updateCalendarEvent(eventId, data);
      setEvents((prev) =>
        sortEvents(prev.map((evt) => (evt.eventId === eventId ? updated : evt)))
      );
      return updated;
    },
    []
  );

  const handleDelete = useCallback(async (eventId: number): Promise<void> => {
    await deleteCalendarEvent(eventId);
    setEvents((prev) => prev.filter((evt) => evt.eventId !== eventId));
  }, []);

  const filteredEvents = useMemo(() => {
    if (!events.length) return [];
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(startOfToday);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);
    endOfWeek.setMilliseconds(endOfWeek.getMilliseconds() - 1);

    const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);
    const endOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth() + 1, 0, 23, 59, 59, 999);

    return events.filter((event) => {
      const eventStart = new Date(event.startTime);
      if (Number.isNaN(eventStart.getTime())) {
        return false;
      }

      if (memberId) {
        const matchesMember =
          event.assignedToUserId === memberId || event.createdByUserId === memberId;
        if (!matchesMember) return false;
      }

      if (showPrivateOnly && !event.isPrivate) return false;
      if (showRemindersOnly && !event.reminder) return false;

      switch (timeframe) {
        case 'upcoming':
          if (eventStart < startOfToday) return false;
          break;
        case 'week':
          if (eventStart < startOfWeek || eventStart > endOfWeek) return false;
          break;
        case 'month':
          if (eventStart < startOfMonth || eventStart > endOfMonth) return false;
          break;
        case 'past':
          if (eventStart >= startOfToday) return false;
          break;
        case 'all':
        default:
          break;
      }
      return true;
    });
  }, [events, memberId, showPrivateOnly, showRemindersOnly, timeframe]);

  const groupedEvents = useMemo(() => {
    const groupedMap = new Map<string, CalendarEvent[]>();
    filteredEvents.forEach((event) => {
      const key = formatDateKey(event.startTime);
      const existing = groupedMap.get(key) ?? [];
      groupedMap.set(key, [...existing, event]);
    });

    return Array.from(groupedMap.entries())
      .sort(([keyA], [keyB]) => new Date(keyA).getTime() - new Date(keyB).getTime())
      .map(([date, dayEvents]) => ({
        date,
        events: sortEvents(dayEvents),
      }));
  }, [filteredEvents]);

  const nextEvent = useMemo(() => {
    const now = Date.now();
    return filteredEvents.find((evt) => new Date(evt.startTime).getTime() >= now);
  }, [filteredEvents]);

  return {
    events,
    filteredEvents,
    groupedEvents,
    nextEvent,
    isLoading,
    isRefreshing,
    error,
    refetch,
    createEvent: handleCreate,
    updateEvent: handleUpdate,
    deleteEvent: handleDelete,
  };
};
