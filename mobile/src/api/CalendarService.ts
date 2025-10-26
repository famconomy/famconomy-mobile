// Calendar Service - Event Management with Recurring Events

// ============================================
// ENUMS
// ============================================

export enum EventType {
  BIRTHDAY = 'birthday',
  HOLIDAY = 'holiday',
  APPOINTMENT = 'appointment',
  FAMILY_EVENT = 'family_event',
  REMINDER = 'reminder',
  VACATION = 'vacation',
  MILESTONE = 'milestone',
  OTHER = 'other'
}

export enum EventStatus {
  SCHEDULED = 'scheduled',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  POSTPONED = 'postponed'
}

export enum EventRecurrence {
  NONE = 'none',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly'
}

export enum EventVisibility {
  PRIVATE = 'private',
  FAMILY = 'family',
  PUBLIC = 'public'
}

export enum NotificationTiming {
  ON_TIME = 'on_time',
  FIVE_MINUTES = '5_minutes',
  FIFTEEN_MINUTES = '15_minutes',
  THIRTY_MINUTES = '30_minutes',
  ONE_HOUR = '1_hour',
  ONE_DAY = '1_day',
  ONE_WEEK = '1_week'
}

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface EventAttendee {
  userId: string;
  name: string;
  email: string;
  image?: string;
  status: 'invited' | 'accepted' | 'declined' | 'tentative';
  responseDate?: string;
}

export interface EventNotification {
  id: string;
  type: 'push' | 'email' | 'in_app';
  timing: NotificationTiming;
  enabled: boolean;
}

export interface EventLocation {
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  url?: string;
}

export interface EventAttachment {
  id: string;
  url: string;
  type: 'image' | 'document' | 'video';
  name: string;
  uploadedAt: string;
}

export interface CalendarEvent {
  id: string;
  familyId: string;
  createdBy: string;
  title: string;
  description?: string;
  type: EventType;
  status: EventStatus;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  allDay: boolean;
  location?: EventLocation;
  attendees: EventAttendee[];
  organizer: {
    userId: string;
    name: string;
    email: string;
    image?: string;
  };
  recurrence: EventRecurrence;
  recurrenceEndDate?: string;
  recurrencePattern?: {
    daysOfWeek?: number[];
    dayOfMonth?: number;
    monthOfYear?: number;
  };
  visibility: EventVisibility;
  color?: string;
  reminders: EventNotification[];
  attachments: EventAttachment[];
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  type: EventType;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  location?: EventLocation;
  attendeeIds?: string[];
  recurrence?: EventRecurrence;
  recurrenceEndDate?: string;
  recurrencePattern?: {
    daysOfWeek?: number[];
    dayOfMonth?: number;
    monthOfYear?: number;
  };
  visibility?: EventVisibility;
  color?: string;
  reminders?: EventNotification[];
  tags?: string[];
  notes?: string;
}

export interface UpdateEventRequest extends Partial<CreateEventRequest> {
  status?: EventStatus;
}

export interface CalendarEventResponse {
  id: string;
  familyId: string;
  title: string;
  description?: string;
  type: EventType;
  status: EventStatus;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  allDay: boolean;
  location?: EventLocation;
  attendees: EventAttendee[];
  organizer: {
    userId: string;
    name: string;
  };
  recurrence: EventRecurrence;
  visibility: EventVisibility;
  color?: string;
  tags: string[];
  createdAt: string;
}

export interface EventsListResponse {
  events: CalendarEventResponse[];
  total: number;
}

export interface EventFilter {
  familyId: string;
  type?: EventType;
  status?: EventStatus;
  startDateFrom?: string;
  startDateTo?: string;
  attendeeId?: string;
  visibility?: EventVisibility;
  tags?: string[];
  page?: number;
  limit?: number;
}

export interface CalendarView {
  year: number;
  month: number;
  days: CalendarDay[];
}

export interface CalendarDay {
  date: string;
  dayOfWeek: number;
  events: CalendarEventResponse[];
  isCurrentMonth: boolean;
}

export interface EventStats {
  totalEvents: number;
  upcomingEvents: number;
  pastEvents: number;
  birthdaysThisMonth: number;
  eventsByType: Record<EventType, number>;
}

// ============================================
// CALENDAR API SERVICE
// ============================================

class CalendarApiService {
  private baseUrl = '/api/calendar';
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
    };
  }

  // ==================== EVENT CRUD ====================

  /**
   * Create a new event
   */
  async createEvent(familyId: string, request: CreateEventRequest): Promise<CalendarEventResponse> {
    const response = await fetch(`${this.baseUrl}/events`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ ...request, familyId }),
    });

    if (!response.ok) throw new Error('Failed to create event');
    return response.json();
  }

  /**
   * Get all events for a family
   */
  async getEvents(filter: EventFilter): Promise<EventsListResponse> {
    const params = new URLSearchParams();
    params.append('familyId', filter.familyId);
    if (filter.type) params.append('type', filter.type);
    if (filter.status) params.append('status', filter.status);
    if (filter.startDateFrom) params.append('startDateFrom', filter.startDateFrom);
    if (filter.startDateTo) params.append('startDateTo', filter.startDateTo);
    if (filter.attendeeId) params.append('attendeeId', filter.attendeeId);
    if (filter.visibility) params.append('visibility', filter.visibility);
    if (filter.tags?.length) params.append('tags', filter.tags.join(','));
    if (filter.page) params.append('page', filter.page.toString());
    if (filter.limit) params.append('limit', filter.limit.toString());

    const response = await fetch(`${this.baseUrl}/events?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch events');
    return response.json();
  }

  /**
   * Get a single event
   */
  async getEvent(eventId: string): Promise<CalendarEventResponse> {
    const response = await fetch(`${this.baseUrl}/events/${eventId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch event');
    return response.json();
  }

  /**
   * Update an event
   */
  async updateEvent(
    eventId: string,
    request: UpdateEventRequest
  ): Promise<CalendarEventResponse> {
    const response = await fetch(`${this.baseUrl}/events/${eventId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Failed to update event');
    return response.json();
  }

  /**
   * Delete an event
   */
  async deleteEvent(eventId: string, deleteAll?: boolean): Promise<{ success: boolean }> {
    const params = new URLSearchParams();
    if (deleteAll) params.append('deleteAll', 'true');

    const response = await fetch(`${this.baseUrl}/events/${eventId}?${params}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to delete event');
    return response.json();
  }

  // ==================== EVENT ATTENDEES ====================

  /**
   * Add attendee to event
   */
  async addAttendee(eventId: string, userId: string): Promise<CalendarEventResponse> {
    const response = await fetch(`${this.baseUrl}/events/${eventId}/attendees`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) throw new Error('Failed to add attendee');
    return response.json();
  }

  /**
   * Remove attendee from event
   */
  async removeAttendee(eventId: string, userId: string): Promise<CalendarEventResponse> {
    const response = await fetch(`${this.baseUrl}/events/${eventId}/attendees/${userId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to remove attendee');
    return response.json();
  }

  /**
   * Update attendee status
   */
  async updateAttendeeStatus(
    eventId: string,
    userId: string,
    status: 'accepted' | 'declined' | 'tentative'
  ): Promise<CalendarEventResponse> {
    const response = await fetch(
      `${this.baseUrl}/events/${eventId}/attendees/${userId}/status`,
      {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({ status }),
      }
    );

    if (!response.ok) throw new Error('Failed to update attendee status');
    return response.json();
  }

  // ==================== CALENDAR VIEWS ====================

  /**
   * Get calendar view for a month
   */
  async getCalendarMonth(
    familyId: string,
    year: number,
    month: number
  ): Promise<CalendarView> {
    const params = new URLSearchParams({
      familyId,
      year: year.toString(),
      month: month.toString(),
    });

    const response = await fetch(`${this.baseUrl}/month?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch calendar month');
    return response.json();
  }

  /**
   * Get calendar view for a week
   */
  async getCalendarWeek(
    familyId: string,
    startDate: string
  ): Promise<CalendarEventResponse[]> {
    const params = new URLSearchParams({
      familyId,
      startDate,
    });

    const response = await fetch(`${this.baseUrl}/week?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch calendar week');
    return response.json();
  }

  /**
   * Get calendar view for a day
   */
  async getCalendarDay(familyId: string, date: string): Promise<CalendarEventResponse[]> {
    const params = new URLSearchParams({
      familyId,
      date,
    });

    const response = await fetch(`${this.baseUrl}/day?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch calendar day');
    return response.json();
  }

  // ==================== UPCOMING EVENTS ====================

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(familyId: string, days: number = 30): Promise<CalendarEventResponse[]> {
    const params = new URLSearchParams({
      familyId,
      days: days.toString(),
    });

    const response = await fetch(`${this.baseUrl}/upcoming?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch upcoming events');
    return response.json();
  }

  /**
   * Get today's events
   */
  async getTodayEvents(familyId: string): Promise<CalendarEventResponse[]> {
    const params = new URLSearchParams({ familyId });

    const response = await fetch(`${this.baseUrl}/today?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch today events');
    return response.json();
  }

  /**
   * Get events happening this week
   */
  async getWeekEvents(familyId: string): Promise<CalendarEventResponse[]> {
    const params = new URLSearchParams({ familyId });

    const response = await fetch(`${this.baseUrl}/week-events?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch week events');
    return response.json();
  }

  // ==================== BIRTHDAYS & SPECIAL DATES ====================

  /**
   * Get birthdays for a family
   */
  async getBirthdays(familyId: string, month?: number): Promise<CalendarEventResponse[]> {
    const params = new URLSearchParams({ familyId });
    if (month) params.append('month', month.toString());

    const response = await fetch(`${this.baseUrl}/birthdays?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch birthdays');
    return response.json();
  }

  /**
   * Get holidays
   */
  async getHolidays(familyId: string, year: number): Promise<CalendarEventResponse[]> {
    const params = new URLSearchParams({
      familyId,
      year: year.toString(),
    });

    const response = await fetch(`${this.baseUrl}/holidays?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch holidays');
    return response.json();
  }

  // ==================== CALENDAR STATISTICS ====================

  /**
   * Get calendar statistics
   */
  async getCalendarStats(familyId: string): Promise<EventStats> {
    const params = new URLSearchParams({ familyId });

    const response = await fetch(`${this.baseUrl}/stats?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch calendar stats');
    return response.json();
  }

  // ==================== EVENT SEARCH ====================

  /**
   * Search events
   */
  async searchEvents(familyId: string, query: string): Promise<CalendarEventResponse[]> {
    const params = new URLSearchParams({
      familyId,
      query,
    });

    const response = await fetch(`${this.baseUrl}/search?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to search events');
    return response.json();
  }

  // ==================== RECURRING EVENTS ====================

  /**
   * Get all occurrences of a recurring event
   */
  async getRecurrenceInstances(eventId: string): Promise<CalendarEventResponse[]> {
    const response = await fetch(`${this.baseUrl}/events/${eventId}/instances`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch recurrence instances');
    return response.json();
  }

  /**
   * Update all occurrences of a recurring event
   */
  async updateRecurrenceAll(
    eventId: string,
    request: UpdateEventRequest
  ): Promise<{ updated: number }> {
    const response = await fetch(`${this.baseUrl}/events/${eventId}/recurrence/update-all`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Failed to update recurrence');
    return response.json();
  }

  /**
   * Update this and future occurrences
   */
  async updateRecurrenceFuture(
    eventId: string,
    request: UpdateEventRequest
  ): Promise<{ updated: number }> {
    const response = await fetch(`${this.baseUrl}/events/${eventId}/recurrence/update-future`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Failed to update future occurrences');
    return response.json();
  }
}

export default new CalendarApiService();
