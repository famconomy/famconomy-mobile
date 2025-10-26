// Calendar Validation Helpers and Utilities

import {
  EventType,
  EventRecurrence,
  EventVisibility,
  CreateEventRequest,
  UpdateEventRequest,
  EventLocation,
} from './CalendarService';

export class CalendarValidator {
  /**
   * Validate event title
   */
  static validateTitle(title: string): { valid: boolean; error?: string } {
    if (!title || title.trim().length === 0) {
      return { valid: false, error: 'Event title is required' };
    }
    if (title.length < 2) {
      return { valid: false, error: 'Event title must be at least 2 characters' };
    }
    if (title.length > 100) {
      return { valid: false, error: 'Event title must be less than 100 characters' };
    }
    return { valid: true };
  }

  /**
   * Validate event description
   */
  static validateDescription(description?: string): { valid: boolean; error?: string } {
    if (description && description.length > 1000) {
      return { valid: false, error: 'Description must be less than 1000 characters' };
    }
    return { valid: true };
  }

  /**
   * Validate event type
   */
  static validateEventType(type: string): { valid: boolean; error?: string } {
    const validTypes = Object.values(EventType);
    if (!validTypes.includes(type as EventType)) {
      return { valid: false, error: 'Invalid event type' };
    }
    return { valid: true };
  }

  /**
   * Validate date
   */
  static validateDate(date: string): { valid: boolean; error?: string } {
    if (!date) {
      return { valid: false, error: 'Date is required' };
    }

    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
      return { valid: false, error: 'Invalid date format' };
    }

    return { valid: true };
  }

  /**
   * Validate time format (HH:MM)
   */
  static validateTime(time: string): { valid: boolean; error?: string } {
    if (!time) return { valid: true }; // Optional field

    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      return { valid: false, error: 'Invalid time format. Use HH:MM' };
    }
    return { valid: true };
  }

  /**
   * Validate date range
   */
  static validateDateRange(
    startDate: string,
    endDate: string
  ): { valid: boolean; error?: string } {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      return { valid: false, error: 'Start date must be before end date' };
    }

    return { valid: true };
  }

  /**
   * Validate time range
   */
  static validateTimeRange(startTime: string, endTime: string): { valid: boolean; error?: string } {
    if (!startTime || !endTime) return { valid: true }; // Optional fields

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (startMinutes >= endMinutes) {
      return { valid: false, error: 'Start time must be before end time' };
    }

    return { valid: true };
  }

  /**
   * Validate location
   */
  static validateLocation(location?: EventLocation): { valid: boolean; error?: string } {
    if (!location) return { valid: true };

    if (!location.name || location.name.trim().length === 0) {
      return { valid: false, error: 'Location name is required' };
    }

    if (location.latitude !== undefined && location.longitude !== undefined) {
      if (
        typeof location.latitude !== 'number' ||
        typeof location.longitude !== 'number' ||
        location.latitude < -90 ||
        location.latitude > 90 ||
        location.longitude < -180 ||
        location.longitude > 180
      ) {
        return { valid: false, error: 'Invalid coordinates' };
      }
    }

    return { valid: true };
  }

  /**
   * Validate recurrence
   */
  static validateRecurrence(
    recurrence?: string,
    recurrenceEndDate?: string
  ): { valid: boolean; error?: string } {
    if (!recurrence) return { valid: true };

    const validRecurrences = Object.values(EventRecurrence);
    if (!validRecurrences.includes(recurrence as EventRecurrence)) {
      return { valid: false, error: 'Invalid recurrence type' };
    }

    if (recurrence !== EventRecurrence.NONE && recurrenceEndDate) {
      const endDate = new Date(recurrenceEndDate);
      if (isNaN(endDate.getTime())) {
        return { valid: false, error: 'Invalid recurrence end date' };
      }
    }

    return { valid: true };
  }

  /**
   * Validate visibility
   */
  static validateVisibility(visibility?: string): { valid: boolean; error?: string } {
    if (!visibility) return { valid: true };

    const validVisibilities = Object.values(EventVisibility);
    if (!validVisibilities.includes(visibility as EventVisibility)) {
      return { valid: false, error: 'Invalid visibility setting' };
    }

    return { valid: true };
  }

  /**
   * Validate attendee IDs
   */
  static validateAttendeeIds(attendeeIds?: string[]): { valid: boolean; error?: string } {
    if (!attendeeIds) return { valid: true };

    if (!Array.isArray(attendeeIds)) {
      return { valid: false, error: 'Attendee IDs must be an array' };
    }

    if (attendeeIds.some(id => !id || typeof id !== 'string')) {
      return { valid: false, error: 'Invalid attendee ID' };
    }

    return { valid: true };
  }

  /**
   * Validate tags
   */
  static validateTags(tags?: string[]): { valid: boolean; error?: string } {
    if (!tags) return { valid: true };

    if (!Array.isArray(tags)) {
      return { valid: false, error: 'Tags must be an array' };
    }

    if (tags.length > 10) {
      return { valid: false, error: 'Maximum 10 tags allowed' };
    }

    if (tags.some(tag => tag.length > 20)) {
      return { valid: false, error: 'Each tag must be less than 20 characters' };
    }

    return { valid: true };
  }

  /**
   * Validate create event request
   */
  static validateCreateEventRequest(request: CreateEventRequest): { valid: boolean; error?: string } {
    // Validate title
    const titleValidation = this.validateTitle(request.title);
    if (!titleValidation.valid) return titleValidation;

    // Validate description
    const descValidation = this.validateDescription(request.description);
    if (!descValidation.valid) return descValidation;

    // Validate event type
    const typeValidation = this.validateEventType(request.type);
    if (!typeValidation.valid) return typeValidation;

    // Validate dates
    const startDateValidation = this.validateDate(request.startDate);
    if (!startDateValidation.valid) return startDateValidation;

    const endDateValidation = this.validateDate(request.endDate);
    if (!endDateValidation.valid) return endDateValidation;

    // Validate date range
    const dateRangeValidation = this.validateDateRange(request.startDate, request.endDate);
    if (!dateRangeValidation.valid) return dateRangeValidation;

    // Validate times if provided
    if (request.startTime) {
      const startTimeValidation = this.validateTime(request.startTime);
      if (!startTimeValidation.valid) return startTimeValidation;
    }

    if (request.endTime) {
      const endTimeValidation = this.validateTime(request.endTime);
      if (!endTimeValidation.valid) return endTimeValidation;
    }

    // Validate time range if both provided
    if (request.startTime && request.endTime) {
      const timeRangeValidation = this.validateTimeRange(request.startTime, request.endTime);
      if (!timeRangeValidation.valid) return timeRangeValidation;
    }

    // Validate location
    const locationValidation = this.validateLocation(request.location);
    if (!locationValidation.valid) return locationValidation;

    // Validate attendees
    const attendeeValidation = this.validateAttendeeIds(request.attendeeIds);
    if (!attendeeValidation.valid) return attendeeValidation;

    // Validate recurrence
    const recurrenceValidation = this.validateRecurrence(
      request.recurrence,
      request.recurrenceEndDate
    );
    if (!recurrenceValidation.valid) return recurrenceValidation;

    // Validate visibility
    const visibilityValidation = this.validateVisibility(request.visibility);
    if (!visibilityValidation.valid) return visibilityValidation;

    // Validate tags
    const tagsValidation = this.validateTags(request.tags);
    if (!tagsValidation.valid) return tagsValidation;

    return { valid: true };
  }

  /**
   * Validate update event request
   */
  static validateUpdateEventRequest(request: UpdateEventRequest): { valid: boolean; error?: string } {
    if (request.title) {
      const titleValidation = this.validateTitle(request.title);
      if (!titleValidation.valid) return titleValidation;
    }

    if (request.description) {
      const descValidation = this.validateDescription(request.description);
      if (!descValidation.valid) return descValidation;
    }

    if (request.type) {
      const typeValidation = this.validateEventType(request.type);
      if (!typeValidation.valid) return typeValidation;
    }

    if (request.startDate) {
      const startDateValidation = this.validateDate(request.startDate);
      if (!startDateValidation.valid) return startDateValidation;
    }

    if (request.endDate) {
      const endDateValidation = this.validateDate(request.endDate);
      if (!endDateValidation.valid) return endDateValidation;
    }

    if (request.startDate && request.endDate) {
      const dateRangeValidation = this.validateDateRange(request.startDate, request.endDate);
      if (!dateRangeValidation.valid) return dateRangeValidation;
    }

    if (request.startTime) {
      const startTimeValidation = this.validateTime(request.startTime);
      if (!startTimeValidation.valid) return startTimeValidation;
    }

    if (request.endTime) {
      const endTimeValidation = this.validateTime(request.endTime);
      if (!endTimeValidation.valid) return endTimeValidation;
    }

    if (request.location) {
      const locationValidation = this.validateLocation(request.location);
      if (!locationValidation.valid) return locationValidation;
    }

    if (request.attendeeIds) {
      const attendeeValidation = this.validateAttendeeIds(request.attendeeIds);
      if (!attendeeValidation.valid) return attendeeValidation;
    }

    if (request.recurrence) {
      const recurrenceValidation = this.validateRecurrence(
        request.recurrence,
        request.recurrenceEndDate
      );
      if (!recurrenceValidation.valid) return recurrenceValidation;
    }

    if (request.visibility) {
      const visibilityValidation = this.validateVisibility(request.visibility);
      if (!visibilityValidation.valid) return visibilityValidation;
    }

    if (request.tags) {
      const tagsValidation = this.validateTags(request.tags);
      if (!tagsValidation.valid) return tagsValidation;
    }

    return { valid: true };
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format date to display format
 */
export function formatEventDate(date: string, includeDay: boolean = true): string {
  const d = new Date(date);
  const options: Intl.DateTimeFormatOptions = includeDay
    ? { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }
    : { month: 'short', day: 'numeric', year: 'numeric' };

  return d.toLocaleDateString('en-US', options);
}

/**
 * Format time to display format
 */
export function formatEventTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours);
  const m = parseInt(minutes);

  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayHours = h % 12 || 12;

  return `${displayHours}:${minutes} ${ampm}`;
}

/**
 * Check if event is today
 */
export function isEventToday(startDate: string): boolean {
  const eventDate = new Date(startDate);
  const today = new Date();

  return (
    eventDate.getFullYear() === today.getFullYear() &&
    eventDate.getMonth() === today.getMonth() &&
    eventDate.getDate() === today.getDate()
  );
}

/**
 * Check if event is in the past
 */
export function isEventPast(endDate: string): boolean {
  const eventDate = new Date(endDate);
  const now = new Date();
  return eventDate < now;
}

/**
 * Check if event is upcoming (within next 7 days)
 */
export function isEventUpcoming(startDate: string): boolean {
  const eventDate = new Date(startDate);
  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return eventDate >= now && eventDate <= sevenDaysLater;
}

/**
 * Get event type icon/emoji
 */
export function getEventTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    birthday: '🎂',
    holiday: '🎉',
    appointment: '📅',
    family_event: '👨‍👩‍👧‍👦',
    reminder: '🔔',
    vacation: '✈️',
    milestone: '🏆',
    other: '📝',
  };

  return icons[type] || '📅';
}

/**
 * Get event type color
 */
export function getEventTypeColor(type: string): string {
  const colors: Record<string, string> = {
    birthday: '#ec4899',
    holiday: '#f59e0b',
    appointment: '#3b82f6',
    family_event: '#10b981',
    reminder: '#8b5cf6',
    vacation: '#06b6d4',
    milestone: '#f97316',
    other: '#6b7280',
  };

  return colors[type] || '#6b7280';
}

/**
 * Get days until event
 */
export function getDaysUntilEvent(startDate: string): number {
  const eventDate = new Date(startDate);
  const today = new Date();

  today.setHours(0, 0, 0, 0);
  eventDate.setHours(0, 0, 0, 0);

  const diffTime = eventDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Check if event is all day
 */
export function isAllDayEvent(startTime?: string, endTime?: string): boolean {
  return !startTime || !endTime;
}

/**
 * Calculate event duration in hours
 */
export function getEventDurationHours(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const diffMs = end.getTime() - start.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  return Math.ceil(diffHours);
}

/**
 * Get month name
 */
export function getMonthName(month: number): string {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  return months[month] || '';
}

/**
 * Get day name
 */
export function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek] || '';
}

/**
 * Get recurrence display text
 */
export function getRecurrenceText(recurrence: string, endDate?: string): string {
  let text = '';

  switch (recurrence) {
    case 'daily':
      text = 'Every day';
      break;
    case 'weekly':
      text = 'Every week';
      break;
    case 'biweekly':
      text = 'Every 2 weeks';
      break;
    case 'monthly':
      text = 'Every month';
      break;
    case 'yearly':
      text = 'Every year';
      break;
    default:
      text = 'Does not repeat';
  }

  if (endDate) {
    text += ` until ${formatEventDate(endDate, false)}`;
  }

  return text;
}
