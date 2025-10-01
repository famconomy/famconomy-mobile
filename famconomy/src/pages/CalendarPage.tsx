import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import { EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import rrulePlugin from '@fullcalendar/rrule';
import { Plus } from 'lucide-react';
import { CalendarEvent, Task } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useFamily } from '../hooks/useFamily';
import { useAuth } from '../hooks/useAuth';
import {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  CalendarEventRequest,
} from '../api/calendar';
import { createDebugLogger } from '../utils/debug';
import './CalendarPage.css';
import { RRule, Weekday } from 'rrule';
import { fetchFamilyTasks } from '../api/tasks';

type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
type WeekdayCode = 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA';
type RecurrenceEnds = 'never' | 'onDate' | 'after';
type RecurrenceMonthlyMode = 'dayOfMonth' | 'ordinalWeekday';

interface RecurrenceState {
  frequency: RecurrenceFrequency;
  interval: number;
  weekDays: WeekdayCode[];
  monthlyMode: RecurrenceMonthlyMode;
  ordinal: '1' | '2' | '3' | '4' | 'last';
  ordinalWeekday: WeekdayCode;
  monthlyDay: number;
  ends: RecurrenceEnds;
  until?: string;
  count?: number;
}

const DEFAULT_EVENT_COLOR = '#3788d8';
const TASK_EVENT_COLOR = '#f97316';
const JS_DAY_TO_CODE: WeekdayCode[] = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const WEEKDAY_NUM_TO_CODE: WeekdayCode[] = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
const WEEKDAY_OPTIONS: { value: WeekdayCode; label: string }[] = [
  { value: 'SU', label: 'Sunday' },
  { value: 'MO', label: 'Monday' },
  { value: 'TU', label: 'Tuesday' },
  { value: 'WE', label: 'Wednesday' },
  { value: 'TH', label: 'Thursday' },
  { value: 'FR', label: 'Friday' },
  { value: 'SA', label: 'Saturday' },
];

const ORDINAL_OPTIONS: { value: '1' | '2' | '3' | '4' | 'last'; label: string }[] = [
  { value: '1', label: 'First' },
  { value: '2', label: 'Second' },
  { value: '3', label: 'Third' },
  { value: '4', label: 'Fourth' },
  { value: 'last', label: 'Last' },
];

const FREQUENCY_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY', label: 'Yearly' },
];

const WEEKDAY_TO_RRULE: Record<WeekdayCode, Weekday> = {
  SU: RRule.SU,
  MO: RRule.MO,
  TU: RRule.TU,
  WE: RRule.WE,
  TH: RRule.TH,
  FR: RRule.FR,
  SA: RRule.SA,
};

const isWeekdayCode = (value: string): value is WeekdayCode =>
  JS_DAY_TO_CODE.includes(value as WeekdayCode);

const weekdayToCode = (weekday: Weekday | number): WeekdayCode => {
  if (typeof weekday === 'number') {
    const normalized = ((weekday % 7) + 7) % 7;
    return WEEKDAY_NUM_TO_CODE[normalized];
  }
  const code = (weekday as Weekday).toString().slice(0, 2).toUpperCase();
  return isWeekdayCode(code) ? (code as WeekdayCode) : 'MO';
};

const getWeekdayCodeFromIso = (iso: string): WeekdayCode => {
  const date = iso ? new Date(iso) : new Date();
  if (Number.isNaN(date.getTime())) {
    return 'MO';
  }
  return JS_DAY_TO_CODE[date.getDay()];
};

const getOrdinalFromIso = (iso: string): '1' | '2' | '3' | '4' | 'last' => {
  const date = iso ? new Date(iso) : new Date();
  if (Number.isNaN(date.getTime())) {
    return '1';
  }
  const day = date.getDate();
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  if (day > daysInMonth - 7) {
    return 'last';
  }
  const ordinalIndex = Math.min(Math.ceil(day / 7), 4);
  return String(ordinalIndex) as '1' | '2' | '3' | '4';
};

const ordinalToBySetPos = (ordinal: '1' | '2' | '3' | '4' | 'last'): number =>
  ordinal === 'last' ? -1 : parseInt(ordinal, 10);

const bySetPosToOrdinal = (value: number | undefined): '1' | '2' | '3' | '4' | 'last' => {
  if (value === undefined) {
    return '1';
  }
  if (value === -1) {
    return 'last';
  }
  const normalized = Math.min(Math.max(value, 1), 4);
  return String(normalized) as '1' | '2' | '3' | '4';
};

const formatDateInput = (date: Date) => date.toISOString().split('T')[0];

const defaultRecurrenceState = (startIso: string): RecurrenceState => {
  const start = startIso ? new Date(startIso) : new Date();
  const weekday = getWeekdayCodeFromIso(startIso);
  const monthlyDay = Number.isNaN(start.getDate()) ? 1 : start.getDate();
  return {
    frequency: 'WEEKLY',
    interval: 1,
    weekDays: [weekday],
    monthlyMode: 'dayOfMonth',
    ordinal: getOrdinalFromIso(startIso),
    ordinalWeekday: weekday,
    monthlyDay,
    ends: 'never',
  };
};

const msToDuration = (startIso: string, endIso?: string): EventInput['duration'] => {
  if (!endIso) return undefined;
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return undefined;
  }
  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) {
    return undefined;
  }
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const duration: { hours?: number; minutes?: number; seconds?: number } = {};
  if (hours) duration.hours = hours;
  if (minutes) duration.minutes = minutes;
  if (!hours && !minutes && seconds) duration.seconds = seconds;
  return Object.keys(duration).length > 0 ? duration : undefined;
};

const buildRRuleString = (state: RecurrenceState, startIso: string): string => {
  const freqMap: Record<RecurrenceFrequency, number> = {
    DAILY: RRule.DAILY,
    WEEKLY: RRule.WEEKLY,
    MONTHLY: RRule.MONTHLY,
    YEARLY: RRule.YEARLY,
  };

  const options: Partial<RRule.Options> = {
    freq: freqMap[state.frequency],
    interval: Math.max(state.interval, 1),
    dtstart: new Date(startIso),
  };

  if (state.frequency === 'WEEKLY') {
    const days = state.weekDays.length ? state.weekDays : [getWeekdayCodeFromIso(startIso)];
    options.byweekday = days.map(day => WEEKDAY_TO_RRULE[day]);
  }

  if (state.frequency === 'MONTHLY') {
    if (state.monthlyMode === 'dayOfMonth') {
      options.bymonthday = [state.monthlyDay];
    } else {
      options.byweekday = [WEEKDAY_TO_RRULE[state.ordinalWeekday]];
      options.bysetpos = [ordinalToBySetPos(state.ordinal)];
    }
  }

  if (state.frequency === 'YEARLY') {
    const start = new Date(startIso);
    options.bymonth = [start.getMonth() + 1];
    if (state.monthlyMode === 'ordinalWeekday') {
      options.byweekday = [WEEKDAY_TO_RRULE[state.ordinalWeekday]];
      options.bysetpos = [ordinalToBySetPos(state.ordinal)];
    } else {
      options.bymonthday = [state.monthlyDay];
    }
  }

  if (state.ends === 'onDate' && state.until) {
    options.until = new Date(`${state.until}T23:59:59`);
  } else if (state.ends === 'after' && state.count && state.count > 0) {
    options.count = state.count;
  }

  const rule = new RRule(options as RRule.Options);
  return rule.toString();
};

const parseRRuleString = (ruleString: string, startIso: string): RecurrenceState => {
  const defaults = defaultRecurrenceState(startIso);
  try {
    const options = RRule.parseString(ruleString);
    const freq = options.freq ?? RRule.WEEKLY;
    let frequency: RecurrenceFrequency = 'WEEKLY';
    if (freq === RRule.DAILY) frequency = 'DAILY';
    if (freq === RRule.WEEKLY) frequency = 'WEEKLY';
    if (freq === RRule.MONTHLY) frequency = 'MONTHLY';
    if (freq === RRule.YEARLY) frequency = 'YEARLY';

    const parsed: RecurrenceState = {
      ...defaults,
      frequency,
      interval: options.interval ?? 1,
      weekDays: defaults.weekDays,
      monthlyMode: defaults.monthlyMode,
      ordinal: defaults.ordinal,
      ordinalWeekday: defaults.ordinalWeekday,
      monthlyDay: defaults.monthlyDay,
      ends: 'never',
    };

    if (frequency === 'WEEKLY' && options.byweekday) {
      const weekdays = Array.isArray(options.byweekday) ? options.byweekday : [options.byweekday];
      parsed.weekDays = weekdays.map(weekday => weekdayToCode(weekday as any));
    }

    if (frequency === 'MONTHLY') {
      if (options.bysetpos && options.byweekday) {
        const weekdays = Array.isArray(options.byweekday) ? options.byweekday : [options.byweekday];
        parsed.monthlyMode = 'ordinalWeekday';
        parsed.ordinalWeekday = weekdayToCode(weekdays[0] as any);
        const byset = Array.isArray(options.bysetpos) ? options.bysetpos[0] : options.bysetpos;
        parsed.ordinal = bySetPosToOrdinal(byset as number);
      } else if (options.bymonthday) {
        const monthDay = Array.isArray(options.bymonthday) ? options.bymonthday[0] : options.bymonthday;
        if (typeof monthDay === 'number') {
          parsed.monthlyMode = 'dayOfMonth';
          parsed.monthlyDay = monthDay;
        }
      }
    }

    if (frequency === 'YEARLY') {
      if (options.bysetpos && options.byweekday) {
        const weekdays = Array.isArray(options.byweekday) ? options.byweekday : [options.byweekday];
        parsed.monthlyMode = 'ordinalWeekday';
        parsed.ordinalWeekday = weekdayToCode(weekdays[0] as any);
        const byset = Array.isArray(options.bysetpos) ? options.bysetpos[0] : options.bysetpos;
        parsed.ordinal = bySetPosToOrdinal(byset as number);
      } else if (options.bymonthday) {
        const monthDay = Array.isArray(options.bymonthday) ? options.bymonthday[0] : options.bymonthday;
        if (typeof monthDay === 'number') {
          parsed.monthlyMode = 'dayOfMonth';
          parsed.monthlyDay = monthDay;
        }
      }
    }

    if (options.until) {
      parsed.ends = 'onDate';
      parsed.until = formatDateInput(new Date(options.until));
    } else if (options.count) {
      parsed.ends = 'after';
      parsed.count = options.count;
    }

    return parsed;
  } catch (error) {
    console.error('Failed to parse recurrence rule:', ruleString, error);
    return defaults;
  }
};

export const CalendarPage: React.FC = () => {
  const { family } = useFamily();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const calendarRef = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [calendarTitle, setCalendarTitle] = useState('');
  const [timeZone, setTimeZone] = useState('UTC');

  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventStart, setNewEventStart] = useState('');
  const [newEventEnd, setNewEventEnd] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency>('WEEKLY');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceWeekdays, setRecurrenceWeekdays] = useState<WeekdayCode[]>([]);
  const [recurrenceMonthlyMode, setRecurrenceMonthlyMode] = useState<RecurrenceMonthlyMode>('dayOfMonth');
  const [recurrenceMonthlyDay, setRecurrenceMonthlyDay] = useState<number>(1);
  const [recurrenceOrdinal, setRecurrenceOrdinal] = useState<'1' | '2' | '3' | '4' | 'last'>('1');
  const [recurrenceOrdinalWeekday, setRecurrenceOrdinalWeekday] = useState<WeekdayCode>('MO');
  const [recurrenceEnds, setRecurrenceEnds] = useState<RecurrenceEnds>('never');
  const [recurrenceUntil, setRecurrenceUntil] = useState('');
  const [recurrenceCount, setRecurrenceCount] = useState<string>('');
  const [recurrenceExceptions, setRecurrenceExceptions] = useState<string[]>([]);
  const [occurrenceContext, setOccurrenceContext] = useState<{ start: string; end: string | null; isOverride: boolean } | null>(null);
  const [editScope, setEditScope] = useState<'one' | 'future' | 'all'>('all');
  const [showDeleteOptions, setShowDeleteOptions] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [showTaskEvents, setShowTaskEvents] = useState(true);
  const calendarDebug = useMemo(() => createDebugLogger('calendar-page'), []);

  const resetRecurrenceControls = useCallback((startIso: string) => {
    const defaults = defaultRecurrenceState(startIso);
    setIsRecurring(false);
    setRecurrenceFrequency(defaults.frequency);
    setRecurrenceInterval(defaults.interval);
    setRecurrenceWeekdays(defaults.weekDays);
    setRecurrenceMonthlyMode(defaults.monthlyMode);
    setRecurrenceMonthlyDay(defaults.monthlyDay);
    setRecurrenceOrdinal(defaults.ordinal);
    setRecurrenceOrdinalWeekday(defaults.ordinalWeekday);
    setRecurrenceEnds(defaults.ends);
    setRecurrenceUntil('');
    setRecurrenceCount('');
    setRecurrenceExceptions([]);
  }, []);

  const applyRecurrenceStateToForm = useCallback((state: RecurrenceState) => {
    setRecurrenceFrequency(state.frequency);
    setRecurrenceInterval(state.interval);
    setRecurrenceWeekdays(state.weekDays);
    setRecurrenceMonthlyMode(state.monthlyMode);
    setRecurrenceMonthlyDay(state.monthlyDay);
    setRecurrenceOrdinal(state.ordinal);
    setRecurrenceOrdinalWeekday(state.ordinalWeekday);
    setRecurrenceEnds(state.ends);
    setRecurrenceUntil(state.until ?? '');
    setRecurrenceCount(state.count ? String(state.count) : '');
  }, []);

  const recurrenceState = useMemo<RecurrenceState>(() => {
    const computedCount = Number(recurrenceCount);
    return {
      frequency: recurrenceFrequency,
      interval: recurrenceInterval,
      weekDays: recurrenceWeekdays,
      monthlyMode: recurrenceMonthlyMode,
      ordinal: recurrenceOrdinal,
      ordinalWeekday: recurrenceOrdinalWeekday,
      monthlyDay: recurrenceMonthlyDay,
      ends: recurrenceEnds,
      until: recurrenceEnds === 'onDate' ? recurrenceUntil : undefined,
      count:
        recurrenceEnds === 'after' && !Number.isNaN(computedCount) && computedCount > 0
          ? computedCount
          : undefined,
    };
  }, [
    recurrenceCount,
    recurrenceEnds,
    recurrenceFrequency,
    recurrenceInterval,
    recurrenceMonthlyDay,
    recurrenceMonthlyMode,
    recurrenceOrdinal,
    recurrenceOrdinalWeekday,
    recurrenceUntil,
    recurrenceWeekdays,
  ]);

  const recurrenceRulePreview = useMemo(() => {
    if (!isRecurring || !newEventStart) {
      return null;
    }
    try {
      return buildRRuleString(recurrenceState, newEventStart);
    } catch (error) {
      console.error('Failed to build recurrence rule preview:', error);
      return null;
    }
  }, [isRecurring, newEventStart, recurrenceState]);

  const recurrenceReferenceDate = useMemo(() => {
    if (!newEventStart) {
      return null;
    }
    const date = new Date(newEventStart);
    return Number.isNaN(date.getTime()) ? null : date;
  }, [newEventStart]);

  const recurrenceMonthLabel = useMemo(
    () => (recurrenceReferenceDate ? recurrenceReferenceDate.toLocaleString(undefined, { month: 'long' }) : ''),
    [recurrenceReferenceDate],
  );

  const toggleWeekday = useCallback(
    (day: WeekdayCode) => {
      if (!isEditing || editScope === 'one' || Boolean(selectedEvent?.RecurrenceParentID)) return;
      setRecurrenceWeekdays(prev => {
        const exists = prev.includes(day);
        if (exists) {
          return prev.filter(d => d !== day);
        }
        const updated = [...prev, day];
        return updated.sort((a, b) => JS_DAY_TO_CODE.indexOf(a) - JS_DAY_TO_CODE.indexOf(b));
      });
    },
    [isEditing, editScope, selectedEvent?.RecurrenceParentID],
  );

  useEffect(() => {
    if (!isRecurring || recurrenceFrequency !== 'WEEKLY' || recurrenceWeekdays.length > 0) {
      return;
    }
    const fallbackDay = getWeekdayCodeFromIso(newEventStart || new Date().toISOString());
    setRecurrenceWeekdays([fallbackDay]);
  }, [isRecurring, recurrenceFrequency, recurrenceWeekdays.length, newEventStart]);

  useEffect(() => {
    if (selectedEvent) {
      return;
    }
    if (!newEventStart) {
      return;
    }
    const date = new Date(newEventStart);
    if (Number.isNaN(date.getTime())) {
      return;
    }
    setRecurrenceMonthlyDay(date.getDate());
    setRecurrenceOrdinal(getOrdinalFromIso(newEventStart));
    setRecurrenceOrdinalWeekday(getWeekdayCodeFromIso(newEventStart));
    if (recurrenceWeekdays.length === 0) {
      setRecurrenceWeekdays([getWeekdayCodeFromIso(newEventStart)]);
    }
  }, [newEventStart, recurrenceWeekdays.length, selectedEvent]);

  useEffect(() => {
    if (!selectedEvent) {
      setEditScope('all');
      return;
    }
    if (selectedEvent.RecurrenceParentID) {
      setEditScope('one');
    } else {
      setEditScope('all');
    }
  }, [selectedEvent]);

  useEffect(() => {
    if (editScope === 'one' || selectedEvent?.RecurrenceParentID) {
      setIsRecurring(false);
    }
  }, [editScope, selectedEvent?.RecurrenceParentID]);

  const recurrenceControlsDisabled = !isEditing || editScope === 'one' || Boolean(selectedEvent?.RecurrenceParentID);

  const validateEventForm = () => {
    const errors: { [key: string]: string } = {};
    if (!newEventTitle) {
      errors.newEventTitle = 'Event title is required.';
    }
    if (!newEventStart) {
      errors.newEventStart = 'Start date is required.';
    }

    if (isRecurring && !recurrenceControlsDisabled) {
      if (recurrenceFrequency === 'WEEKLY' && recurrenceWeekdays.length === 0) {
        errors.recurrenceWeekdays = 'Select at least one weekday.';
      }

      if (recurrenceFrequency === 'MONTHLY' && recurrenceMonthlyMode === 'dayOfMonth') {
        if (recurrenceMonthlyDay < 1 || recurrenceMonthlyDay > 31) {
          errors.recurrenceMonthlyDay = 'Choose a valid day of the month (1-31).';
        }
      }

      if (recurrenceEnds === 'onDate' && !recurrenceUntil) {
        errors.recurrenceUntil = 'Please choose when the repeating series should end.';
      }

      if (recurrenceEnds === 'after') {
        const occurrences = Number(recurrenceCount);
        if (!recurrenceCount || Number.isNaN(occurrences) || occurrences <= 0) {
          errors.recurrenceCount = 'Enter how many occurrences should be created.';
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const fetchEvents = useCallback(async () => {
    calendarDebug.log('fetchEvents: Called. Family:', family);
    if (!family) {
      calendarDebug.log('fetchEvents: Family not available, returning.');
      return;
    }
    try {
      setIsLoading(true);
      const eventsData = await getCalendarEvents(family.FamilyID.toString());
      calendarDebug.log('fetchEvents: Received eventsData:', eventsData);
      setEvents(eventsData);
    } catch (err) {
      calendarDebug.error('fetchEvents: Error fetching events:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [family, calendarDebug]);

  const fetchTasks = useCallback(async () => {
    calendarDebug.log('fetchTasks: Called. Family:', family);
    if (!family) {
      calendarDebug.log('fetchTasks: Family not available, clearing tasks.');
      setTasks([]);
      return;
    }

    try {
      const tasksData = await fetchFamilyTasks(family.FamilyID.toString());
      const tasksWithDueDates = tasksData.filter(task => Boolean(task.DueDate));
      calendarDebug.log('fetchTasks: Received tasksData count:', tasksWithDueDates.length);
      setTasks(tasksWithDueDates);
    } catch (err) {
      calendarDebug.error('fetchTasks: Error fetching tasks for calendar sync:', err);
      setTasks([]);
    }
  }, [family, calendarDebug]);

  useEffect(() => {
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  

  useEffect(() => {
    calendarDebug.log('useEffect: Calling fetchEvents and fetchTasks...');
    fetchEvents();
    fetchTasks();
    if (calendarRef.current) {
      setCalendarTitle(calendarRef.current.getApi().view.title);
    }
  }, [fetchEvents, fetchTasks, calendarDebug]);

  const handleEventClick = (info: any) => {
    if (info.event.extendedProps?.eventKind === 'task') {
      const taskDetails: Task | undefined = info.event.extendedProps?.task;
      calendarDebug.log('handleEventClick: Task event clicked', {
        taskId: taskDetails?.TaskID,
        title: taskDetails?.Title,
      });
      return;
    }

    const rawEvent = info.event.extendedProps?.rawEvent as CalendarEvent | undefined;
    const event = rawEvent ?? events.find(e => e.EventID === Number(info.event.id));

    if (!event) {
      calendarDebug.warn('Event not found for id:', info.event.id);
      return;
    }

    setSelectedEvent(event);
    setNewEventTitle(event.Title);
    setNewEventStart(event.StartTime ? new Date(event.StartTime).toISOString().substring(0, 16) : '');
    setNewEventEnd(event.EndTime ? new Date(event.EndTime).toISOString().substring(0, 16) : '');
    setNewEventDescription(event.Description || '');
    setNewEventLocation(event.Location || '');

    resetRecurrenceControls(event.StartTime);

    const exceptions = Array.isArray(event.RecurrenceExceptionDates) ? event.RecurrenceExceptionDates : [];
    setRecurrenceExceptions(exceptions);

    if (event.RecurrencePattern) {
      setIsRecurring(true);
      const parsed = parseRRuleString(event.RecurrencePattern, event.StartTime);
      applyRecurrenceStateToForm(parsed);
    } else {
      setIsRecurring(false);
    }

    const occurrenceStart = info.event.start ? info.event.start.toISOString() : event.StartTime;
    const occurrenceEnd = info.event.end ? info.event.end.toISOString() : event.EndTime ?? null;
    if (occurrenceStart) {
      const startLocal = new Date(occurrenceStart);
      if (!Number.isNaN(startLocal.getTime())) {
        const startLocalIso = new Date(startLocal.getTime() - startLocal.getTimezoneOffset() * 60000)
          .toISOString()
          .substring(0, 16);
        setNewEventStart(startLocalIso);
      }
    }
    if (occurrenceEnd) {
      const endLocal = new Date(occurrenceEnd);
      if (!Number.isNaN(endLocal.getTime())) {
        const endLocalIso = new Date(endLocal.getTime() - endLocal.getTimezoneOffset() * 60000)
          .toISOString()
          .substring(0, 16);
        setNewEventEnd(endLocalIso);
      }
    }
    setOccurrenceContext({
      start: occurrenceStart,
      end: occurrenceEnd,
      isOverride: Boolean(event.RecurrenceParentID),
    });
    setEditScope(event.RecurrenceParentID ? 'one' : 'all');
    setShowDeleteOptions(false);

    setIsEditing(false); // Set to view mode initially
    setShowEventModal(true);
  };

  const handleDateClick = (info: any) => {
    setSelectedEvent(null);
    setNewEventTitle('');
    const startIso = `${info.dateStr}T00:00`;
    setNewEventStart(startIso);
    setNewEventEnd('');
    setNewEventDescription('');
    setNewEventLocation('');
    resetRecurrenceControls(startIso);
    setOccurrenceContext({ start: startIso, end: null, isOverride: false });
    setEditScope('all');
    setShowDeleteOptions(false);
    setIsEditing(true); // Set to edit mode for new events
    setShowEventModal(true);
  };

  const handleSaveEvent = async () => {
    if (!validateEventForm()) {
      return;
    }
    if (authLoading || !isAuthenticated || !family || !user) {
      calendarDebug.error("Cannot save event: Auth status loading, not authenticated, or family/user data missing.");
      return;
    }

    const recurrenceRule = isRecurring && newEventStart && !recurrenceControlsDisabled ? recurrenceRulePreview : null;
    const parsedStart = new Date(newEventStart);
    if (Number.isNaN(parsedStart.getTime())) {
      setFormErrors(prev => ({ ...prev, newEventStart: 'Start date is invalid.' }));
      return;
    }

    const parsedEnd = newEventEnd ? new Date(newEventEnd) : undefined;
    const endIso = parsedEnd && !Number.isNaN(parsedEnd.getTime()) ? parsedEnd.toISOString() : undefined;

    const startIso = parsedStart.toISOString();
    const baseCreateData: CalendarEventRequest = {
      familyId: family.FamilyID,
      title: newEventTitle,
      description: newEventDescription || undefined,
      startTime: startIso,
      endTime: endIso,
      location: newEventLocation || undefined,
      createdByUserId: user.id,
      recurrenceRule,
      recurrenceExceptionDates: recurrenceRule !== null ? recurrenceExceptions : undefined,
    };

    calendarDebug.log('handleSaveEvent: Attempting to save event with data:', baseCreateData, {
      editScope,
      occurrenceContext,
    });

    try {
      if (!selectedEvent) {
        await createCalendarEvent(baseCreateData);
      } else if (selectedEvent.RecurrenceParentID) {
        // Detached occurrence, simple update
        const overrideUpdate: Partial<CalendarEventRequest> = {
          title: baseCreateData.title,
          description: baseCreateData.description,
          startTime: baseCreateData.startTime,
          endTime: baseCreateData.endTime,
          location: baseCreateData.location,
          recurrenceRule: null,
        };
        await updateCalendarEvent(selectedEvent.EventID.toString(), overrideUpdate);
      } else if (!selectedEvent.RecurrencePattern) {
        // Non-recurring event update
        const simpleUpdate: Partial<CalendarEventRequest> = {
          title: baseCreateData.title,
          description: baseCreateData.description,
          startTime: baseCreateData.startTime,
          endTime: baseCreateData.endTime,
          location: baseCreateData.location,
          recurrenceRule: baseCreateData.recurrenceRule,
          recurrenceExceptionDates: baseCreateData.recurrenceExceptionDates,
        };
        await updateCalendarEvent(selectedEvent.EventID.toString(), simpleUpdate);
      } else {
        // Recurring series master
        const masterId = selectedEvent.EventID.toString();
        const occurrenceStartIso = occurrenceContext?.start;
        const occurrenceEndIso = occurrenceContext?.end ?? null;

        if (editScope === 'all') {
          const updatePayload: Partial<CalendarEventRequest> = {
            title: baseCreateData.title,
            description: baseCreateData.description,
            startTime: baseCreateData.startTime,
            endTime: baseCreateData.endTime,
            location: baseCreateData.location,
            recurrenceRule: baseCreateData.recurrenceRule,
            recurrenceExceptionDates: baseCreateData.recurrenceRule ? recurrenceExceptions : [],
          };
          await updateCalendarEvent(masterId, updatePayload);
        } else if (editScope === 'one') {
          if (!occurrenceStartIso) {
            throw new Error('Unable to determine occurrence start for single-instance edit.');
          }

          const exceptionSet = new Set<string>(recurrenceExceptions);
          exceptionSet.add(occurrenceStartIso);

          const masterUpdate: Partial<CalendarEventRequest> = {
            title: selectedEvent.Title,
            description: selectedEvent.Description || undefined,
            startTime: new Date(selectedEvent.StartTime).toISOString(),
            endTime: selectedEvent.EndTime ? new Date(selectedEvent.EndTime).toISOString() : undefined,
            location: selectedEvent.Location || undefined,
            recurrenceRule: selectedEvent.RecurrencePattern || null,
            recurrenceExceptionDates: Array.from(exceptionSet),
          };
          await updateCalendarEvent(masterId, masterUpdate);

          const overrideCreate: CalendarEventRequest = {
            ...baseCreateData,
            recurrenceRule: null,
            recurrenceExceptionDates: undefined,
            recurrenceParentId: selectedEvent.EventID,
            recurrenceOriginalStart: occurrenceStartIso,
            recurrenceOriginalEnd: occurrenceEndIso,
          };
          await createCalendarEvent(overrideCreate);
        } else if (editScope === 'future') {
          if (!occurrenceStartIso) {
            throw new Error('Unable to determine occurrence start for series split.');
          }

          let truncatedRule = selectedEvent.RecurrencePattern || null;
          if (selectedEvent.RecurrencePattern) {
            try {
              const options = RRule.parseString(selectedEvent.RecurrencePattern);
              const splitBoundary = new Date(new Date(occurrenceStartIso).getTime() - 1000);
              options.until = splitBoundary;
              options.dtstart = new Date(selectedEvent.StartTime);
              truncatedRule = new RRule(options as RRule.Options).toString();
            } catch (err) {
              console.error('Failed to truncate recurrence rule during split.', err);
            }
          }

          const masterUpdate: Partial<CalendarEventRequest> = {
            title: selectedEvent.Title,
            description: selectedEvent.Description || undefined,
            startTime: new Date(selectedEvent.StartTime).toISOString(),
            endTime: selectedEvent.EndTime ? new Date(selectedEvent.EndTime).toISOString() : undefined,
            location: selectedEvent.Location || undefined,
            recurrenceRule: truncatedRule,
            recurrenceExceptionDates: recurrenceExceptions,
          };
          await updateCalendarEvent(masterId, masterUpdate);

          const newSeriesData: CalendarEventRequest = {
            ...baseCreateData,
            recurrenceParentId: undefined,
            recurrenceOriginalStart: occurrenceStartIso,
            recurrenceOriginalEnd: occurrenceEndIso,
          };
          await createCalendarEvent(newSeriesData);
        }
      }
      setShowEventModal(false);
      setShowDeleteOptions(false);
      fetchEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save event');
    }
  };

  const handleDeleteEvent = async (scope: 'one' | 'future' | 'all') => {
    if (!selectedEvent) return;

    try {
      const masterId = selectedEvent.EventID.toString();
      if (
        scope === 'all' ||
        selectedEvent.RecurrenceParentID ||
        !selectedEvent.RecurrencePattern
      ) {
        await deleteCalendarEvent(masterId);
      } else if (scope === 'one') {
        const occurrenceStartIso = occurrenceContext?.start;
        if (!occurrenceStartIso) {
          throw new Error('Unable to determine occurrence start for deletion.');
        }
        const exceptionSet = new Set<string>(
          Array.isArray(recurrenceExceptions) ? recurrenceExceptions : [],
        );
        exceptionSet.add(occurrenceStartIso);
        const masterUpdate: Partial<CalendarEventRequest> = {
          title: selectedEvent.Title,
          description: selectedEvent.Description || undefined,
          startTime: new Date(selectedEvent.StartTime).toISOString(),
          endTime: selectedEvent.EndTime ? new Date(selectedEvent.EndTime).toISOString() : undefined,
          location: selectedEvent.Location || undefined,
          recurrenceRule: selectedEvent.RecurrencePattern || null,
          recurrenceExceptionDates: Array.from(exceptionSet),
        };
        await updateCalendarEvent(masterId, masterUpdate);
      } else if (scope === 'future') {
        const occurrenceStartIso = occurrenceContext?.start;
        if (!occurrenceStartIso) {
          throw new Error('Unable to determine occurrence start for deletion.');
        }
        let truncatedRule = selectedEvent.RecurrencePattern || null;
        if (selectedEvent.RecurrencePattern) {
          try {
            const options = RRule.parseString(selectedEvent.RecurrencePattern);
            const splitBoundary = new Date(new Date(occurrenceStartIso).getTime() - 1000);
            options.until = splitBoundary;
            options.dtstart = new Date(selectedEvent.StartTime);
            truncatedRule = new RRule(options as RRule.Options).toString();
          } catch (err) {
            console.error('Failed to truncate recurrence rule during deletion.', err);
          }
        }
        const masterUpdate: Partial<CalendarEventRequest> = {
          title: selectedEvent.Title,
          description: selectedEvent.Description || undefined,
          startTime: new Date(selectedEvent.StartTime).toISOString(),
          endTime: selectedEvent.EndTime ? new Date(selectedEvent.EndTime).toISOString() : undefined,
          location: selectedEvent.Location || undefined,
          recurrenceRule: truncatedRule,
          recurrenceExceptionDates: recurrenceExceptions,
        };
        await updateCalendarEvent(masterId, masterUpdate);
      }

      setShowDeleteOptions(false);
      setShowEventModal(false);
      fetchEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete event');
    }
  };

  const handleCalendarNav = (action: 'prev' | 'next' | 'today' | 'dayGridMonth' | 'dayGridWeek' | 'dayGridDay') => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      if (action === 'prev') {
        calendarApi.prev();
      } else if (action === 'next') {
        calendarApi.next();
      } else if (action === 'today') {
        calendarApi.today();
      } else {
        calendarApi.changeView(action);
      }
      setCalendarTitle(calendarApi.view.title);
    }
  };

  const formattedEvents = useMemo<EventInput[]>(() => {
    const calendarItems = events.map(event => {
      const baseColor = event.Color || DEFAULT_EVENT_COLOR;
      const baseProps: EventInput = {
        id: event.EventID.toString(),
        title: event.Title,
        backgroundColor: baseColor,
        borderColor: baseColor,
        extendedProps: {
          rawEvent: event,
          isOverride: Boolean(event.RecurrenceParentID),
        },
      };

      if (event.RecurrencePattern) {
        try {
          const rruleOptions = RRule.parseString(event.RecurrencePattern);
          rruleOptions.dtstart = new Date(event.StartTime);
          const recurringEvent: EventInput = {
            ...baseProps,
            rrule: rruleOptions,
            extendedProps: {
              ...(baseProps.extendedProps ?? {}),
              isSeriesMaster: true,
            },
          };

          const duration = msToDuration(event.StartTime, event.EndTime);
          if (duration) {
            recurringEvent.duration = duration;
          }

          if (Array.isArray(event.RecurrenceExceptionDates) && event.RecurrenceExceptionDates.length > 0) {
            recurringEvent.exdate = event.RecurrenceExceptionDates;
          }

          return recurringEvent;
        } catch (error) {
          console.error('Failed to parse recurrence pattern for event', event.EventID, error);
        }
      }

      return {
        ...baseProps,
        start: event.StartTime,
        end: event.EndTime ?? undefined,
        extendedProps: {
          ...(baseProps.extendedProps ?? {}),
          isSeriesMaster: Boolean(event.RecurrencePattern),
        },
      };
    });

    if (!showTaskEvents) {
      return calendarItems;
    }

    const taskItems = tasks.reduce<EventInput[]>((acc, task) => {
      if (!task.DueDate) {
        return acc;
      }

      const dueDate = new Date(task.DueDate);
      if (Number.isNaN(dueDate.getTime())) {
        return acc;
      }

      const hasExplicitTime = /\d{2}:\d{2}/.test(task.DueDate);
      const isMidnightUtc = dueDate.getUTCHours() === 0 && dueDate.getUTCMinutes() === 0;

      const taskEvent: EventInput = {
        id: `task-${task.TaskID}`,
        title: `Task: ${task.Title}`,
        start: dueDate.toISOString(),
        allDay: !hasExplicitTime || isMidnightUtc,
        backgroundColor: TASK_EVENT_COLOR,
        borderColor: TASK_EVENT_COLOR,
        extendedProps: {
          eventKind: 'task',
          task,
        },
      };

      acc.push(taskEvent);
      return acc;
    }, []);

    return [...calendarItems, ...taskItems];
  }, [events, tasks, showTaskEvents]);

  if (isLoading) return <div>Loading calendar...</div>;
  if (error) return <div className="text-error-500">Error: {error}</div>;

  return (
    <div id="calendar-board" className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">Family Calendar</h1>
          <p className="text-neutral-500 dark:text-neutral-400">Plan and coordinate family activities</p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-end">
          <button 
            onClick={() => {
              setSelectedEvent(null);
              setNewEventTitle('');
              const now = new Date();
              const nowIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
                .toISOString()
                .substring(0, 16);
              setNewEventStart(nowIso);
              setNewEventEnd('');
              setNewEventDescription('');
              setNewEventLocation('');
              resetRecurrenceControls(now.toISOString());
              setOccurrenceContext(null);
              setEditScope('all');
              setShowDeleteOptions(false);
              setIsEditing(true);
              setShowEventModal(true);
            }}
            className="flex items-center px-3 py-2 rounded-2xl bg-primary-500 text-white hover:bg-primary-600 dark:hover:bg-primary-400 transition-colors"
          >
            <Plus size={18} className="mr-2" />
            <span>Add Event</span>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex gap-1 nav-button-container">
        <button onClick={() => handleCalendarNav('prev')}
          className="px-3 py-2 rounded-xl text-white hover:bg-white/10 transition-colors nav-button">
          &lt;
        </button>
        <button onClick={() => handleCalendarNav('dayGridDay')}
          className="px-3 py-2 rounded-xl text-white hover:bg-white/10 transition-colors nav-button">
          Day
        </button>
        <button onClick={() => handleCalendarNav('dayGridWeek')}
          className="px-3 py-2 rounded-xl text-white hover:bg-white/10 transition-colors nav-button">
          Week
        </button>
        <button onClick={() => handleCalendarNav('today')}
          className="px-3 py-2 rounded-xl text-white hover:bg-white/10 transition-colors nav-button">
          Today
        </button>
        <button onClick={() => handleCalendarNav('dayGridMonth')}
          className="px-3 py-2 rounded-xl text-white hover:bg-white/10 transition-colors nav-button">
          Month
        </button>
        <button onClick={() => handleCalendarNav('next')}
          className="px-3 py-2 rounded-xl text-white hover:bg-white/10 transition-colors nav-button">
          &gt;
        </button>
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={showTaskEvents}
              onChange={(event) => setShowTaskEvents(event.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-600 text-primary-500 focus:ring-primary-500"
            />
            Show tasks
          </label>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-card p-6">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, interactionPlugin, rrulePlugin]}
          initialView={'dayGridMonth'}
          timeZone={timeZone}
          events={formattedEvents}
          eventClick={handleEventClick}
          dateClick={handleDateClick}
          height="auto"
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            meridiem: false,
          }}
          eventDisplay="block"
          eventClassNames="rounded-lg"
          dayMaxEvents={3}
          moreLinkContent={({ num }) => (
            <div className="text-xs text-primary-500 dark:text-primary-400 font-medium">
              +{num} more
            </div>
          )}
        />
      </div>

      <AnimatePresence>
        {showEventModal && (
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-neutral-800 rounded-2xl shadow-lg max-w-lg w-full"
            >
              <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
                <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
                  {selectedEvent ? 'Edit Event' : 'New Event'}
                </h3>
                <button
                  onClick={() => setShowEventModal(false)}
                  className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
                >
                  &times;
                </button>
              </div>

              <div className="p-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Event Title
                    </label>
                    <input
                      type="text"
                      value={newEventTitle}
                      onChange={isEditing ? (e) => setNewEventTitle(e.target.value) : undefined}
                      readOnly={!isEditing}
                      className={`w-full px-3 py-2 rounded-xl border ${formErrors.newEventTitle ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-700'} bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 ${!isEditing ? 'bg-neutral-100 dark:bg-neutral-700 cursor-not-allowed' : ''}`}
                      placeholder="Enter event title"
                    />
                    {formErrors.newEventTitle && <p className="text-red-500 text-xs mt-1">{formErrors.newEventTitle}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Start Date
                      </label>
                      <input
                        type="datetime-local"
                        value={newEventStart}
                        onChange={isEditing ? (e) => setNewEventStart(e.target.value) : undefined}
                        readOnly={!isEditing}
                        className={`w-full px-3 py-2 rounded-xl border ${formErrors.newEventStart ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-700'} bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 ${!isEditing ? 'bg-neutral-100 dark:bg-neutral-700 cursor-not-allowed' : ''}`}
                      />
                      {formErrors.newEventStart && <p className="text-red-500 text-xs mt-1">{formErrors.newEventStart}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        End Date
                      </label>
                      <input
                        type="datetime-local"
                        value={newEventEnd}
                        onChange={isEditing ? (e) => setNewEventEnd(e.target.value) : undefined}
                        readOnly={!isEditing}
                        className={`w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 ${!isEditing ? 'bg-neutral-100 dark:bg-neutral-700 cursor-not-allowed' : ''}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={newEventDescription}
                      onChange={isEditing ? (e) => setNewEventDescription(e.target.value) : undefined}
                      readOnly={!isEditing}
                      className={`w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 ${!isEditing ? 'bg-neutral-100 dark:bg-neutral-700 cursor-not-allowed' : ''}`}
                      placeholder="Add event description"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={newEventLocation}
                      onChange={isEditing ? (e) => setNewEventLocation(e.target.value) : undefined}
                      readOnly={!isEditing}
                      className={`w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 ${!isEditing ? 'bg-neutral-100 dark:bg-neutral-700 cursor-not-allowed' : ''}`}
                      placeholder="Add location"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Repeat
                    </label>
                    <div className={`flex items-center gap-2 ${recurrenceControlsDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
                      <input
                        type="checkbox"
                        checked={isRecurring && !recurrenceControlsDisabled}
                        onChange={
                          recurrenceControlsDisabled
                            ? undefined
                            : (e) => {
                                setIsRecurring(e.target.checked);
                                if (!e.target.checked) {
                                  setRecurrenceWeekdays([]);
                                  setRecurrenceEnds('never');
                                  setRecurrenceUntil('');
                                  setRecurrenceCount('');
                                }
                              }
                        }
                        disabled={recurrenceControlsDisabled}
                        className="h-4 w-4"
                      />
                      <span className="text-sm text-neutral-700 dark:text-neutral-300">
                        Repeating event
                      </span>
                    </div>

                    {isRecurring && !recurrenceControlsDisabled && (
                      <div className="space-y-4 mt-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                              Frequency
                            </label>
                            <select
                              value={recurrenceFrequency}
                              onChange={(e) => setRecurrenceFrequency(e.target.value as RecurrenceFrequency)}
                              disabled={recurrenceControlsDisabled}
                              className={`w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 ${recurrenceControlsDisabled ? 'bg-neutral-100 dark:bg-neutral-700 cursor-not-allowed' : ''}`}
                            >
                              {FREQUENCY_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                              Interval
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={recurrenceInterval}
                              onChange={(e) => setRecurrenceInterval(Math.max(1, Number(e.target.value) || 1))}
                              readOnly={recurrenceControlsDisabled}
                              className={`w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 ${recurrenceControlsDisabled ? 'bg-neutral-100 dark:bg-neutral-700 cursor-not-allowed' : ''}`}
                            />
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                              Every {recurrenceInterval} {recurrenceFrequency.toLowerCase()}(s)
                            </p>
                          </div>
                        </div>

                        {recurrenceFrequency === 'WEEKLY' && (
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                              Repeat on
                            </label>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {WEEKDAY_OPTIONS.map(option => {
                                const isSelected = recurrenceWeekdays.includes(option.value);
                                return (
                                  <button
                                    type="button"
                                    key={option.value}
                                    disabled={recurrenceControlsDisabled}
                                    onClick={() => toggleWeekday(option.value)}
                                    className={`px-3 py-1 rounded-lg border text-sm transition-colors ${isSelected ? 'bg-primary-500 text-white border-primary-500' : 'border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'} ${recurrenceControlsDisabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-primary-400 dark:hover:border-primary-400'}`}
                                  >
                                    {option.label.slice(0, 3)}
                                  </button>
                                );
                              })}
                            </div>
                            {formErrors.recurrenceWeekdays && (
                              <p className="text-red-500 text-xs mt-1">{formErrors.recurrenceWeekdays}</p>
                            )}
                          </div>
                        )}

                        {(recurrenceFrequency === 'MONTHLY' || recurrenceFrequency === 'YEARLY') && (
                          <div className="space-y-3">
                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                              Repeat on
                            </label>
                            <div className="space-y-3 text-sm text-neutral-700 dark:text-neutral-300">
                              <label className={`flex flex-wrap items-center gap-2 ${recurrenceControlsDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                <input
                                  type="radio"
                                  checked={recurrenceMonthlyMode === 'dayOfMonth'}
                                  onChange={recurrenceControlsDisabled ? undefined : () => setRecurrenceMonthlyMode('dayOfMonth')}
                                  disabled={recurrenceControlsDisabled}
                                />
                                <span>Day</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={31}
                                  value={recurrenceMonthlyDay}
                                  onChange={(e) =>
                                    setRecurrenceMonthlyDay(
                                      Math.min(31, Math.max(1, Number(e.target.value) || 1)),
                                    )
                                  }
                                  disabled={recurrenceControlsDisabled || recurrenceMonthlyMode !== 'dayOfMonth'}
                                  className={`w-16 px-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 ${recurrenceControlsDisabled || recurrenceMonthlyMode !== 'dayOfMonth' ? 'cursor-not-allowed opacity-60' : ''}`}
                                />
                                <span>
                                  of {recurrenceFrequency === 'YEARLY' ? recurrenceMonthLabel || 'the month' : 'the month'}
                                </span>
                              </label>

                              <label className={`flex flex-wrap items-center gap-2 ${recurrenceControlsDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                <input
                                  type="radio"
                                  checked={recurrenceMonthlyMode === 'ordinalWeekday'}
                                  onChange={recurrenceControlsDisabled ? undefined : () => setRecurrenceMonthlyMode('ordinalWeekday')}
                                  disabled={recurrenceControlsDisabled}
                                />
                                <span>The</span>
                                <select
                                  value={recurrenceOrdinal}
                                  onChange={(e) => setRecurrenceOrdinal(e.target.value as '1' | '2' | '3' | '4' | 'last')}
                                  disabled={recurrenceControlsDisabled || recurrenceMonthlyMode !== 'ordinalWeekday'}
                                  className={`px-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 ${recurrenceControlsDisabled || recurrenceMonthlyMode !== 'ordinalWeekday' ? 'cursor-not-allowed opacity-60' : ''}`}
                                >
                                  {ORDINAL_OPTIONS.map(option => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  value={recurrenceOrdinalWeekday}
                                  onChange={(e) => setRecurrenceOrdinalWeekday(e.target.value as WeekdayCode)}
                                  disabled={recurrenceControlsDisabled || recurrenceMonthlyMode !== 'ordinalWeekday'}
                                  className={`px-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 ${recurrenceControlsDisabled || recurrenceMonthlyMode !== 'ordinalWeekday' ? 'cursor-not-allowed opacity-60' : ''}`}
                                >
                                  {WEEKDAY_OPTIONS.map(option => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                                <span>
                                  {recurrenceFrequency === 'YEARLY'
                                    ? `of ${recurrenceMonthLabel || 'the month'}`
                                    : 'each month'}
                                </span>
                              </label>
                            </div>
                            {formErrors.recurrenceMonthlyDay && (
                              <p className="text-red-500 text-xs mt-1">{formErrors.recurrenceMonthlyDay}</p>
                            )}
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                            Ends
                          </label>
                          <div className="flex flex-col gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                            <label className={`flex items-center gap-2 ${recurrenceControlsDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
                              <input
                                type="radio"
                                checked={recurrenceEnds === 'never'}
                                onChange={recurrenceControlsDisabled ? undefined : () => setRecurrenceEnds('never')}
                                disabled={recurrenceControlsDisabled}
                              />
                              <span>Never</span>
                            </label>
                            <label className={`flex flex-wrap items-center gap-2 ${recurrenceControlsDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
                              <input
                                type="radio"
                                checked={recurrenceEnds === 'onDate'}
                                onChange={recurrenceControlsDisabled ? undefined : () => setRecurrenceEnds('onDate')}
                                disabled={recurrenceControlsDisabled}
                              />
                              <span>On</span>
                              <input
                                type="date"
                                value={recurrenceUntil}
                                onChange={(e) => setRecurrenceUntil(e.target.value)}
                                disabled={recurrenceControlsDisabled || recurrenceEnds !== 'onDate'}
                                className={`px-3 py-2 rounded-xl border ${formErrors.recurrenceUntil ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-700'} bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 ${recurrenceControlsDisabled || recurrenceEnds !== 'onDate' ? 'cursor-not-allowed opacity-60' : ''}`}
                              />
                              {formErrors.recurrenceUntil && (
                                <span className="text-red-500 text-xs">{formErrors.recurrenceUntil}</span>
                              )}
                            </label>
                            <label className={`flex flex-wrap items-center gap-2 ${recurrenceControlsDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
                              <input
                                type="radio"
                                checked={recurrenceEnds === 'after'}
                                onChange={recurrenceControlsDisabled ? undefined : () => setRecurrenceEnds('after')}
                                disabled={recurrenceControlsDisabled}
                              />
                              <span>After</span>
                              <input
                                type="number"
                                min={1}
                                value={recurrenceCount}
                                onChange={(e) => setRecurrenceCount(e.target.value)}
                                disabled={recurrenceControlsDisabled || recurrenceEnds !== 'after'}
                                className={`w-20 px-2 py-1 rounded-lg border ${formErrors.recurrenceCount ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-700'} bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 ${recurrenceControlsDisabled || recurrenceEnds !== 'after' ? 'cursor-not-allowed opacity-60' : ''}`}
                              />
                              <span>occurrence(s)</span>
                              {formErrors.recurrenceCount && (
                                <span className="text-red-500 text-xs">{formErrors.recurrenceCount}</span>
                              )}
                            </label>
                          </div>
                        </div>

                        {recurrenceRulePreview && (
                          <div className="text-xs text-neutral-600 dark:text-neutral-300 border border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg px-3 py-2 bg-neutral-50 dark:bg-neutral-700/30">
                            RRULE: {recurrenceRulePreview}
                          </div>
                        )}

                        {recurrenceExceptions.length > 0 && (
                          <div className="text-xs text-neutral-500 dark:text-neutral-400">
                            {recurrenceExceptions.length} exception{recurrenceExceptions.length === 1 ? '' : 's'} in this series.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {isEditing && selectedEvent && selectedEvent.RecurrencePattern && occurrenceContext && !selectedEvent.RecurrenceParentID && (
                    <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-3">
                      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        Apply changes to
                      </p>
                      <div className="flex flex-col gap-2 mt-2 text-sm text-neutral-700 dark:text-neutral-300">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            value="one"
                            checked={editScope === 'one'}
                            onChange={() => setEditScope('one')}
                          />
                          <span>This event only</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            value="future"
                            checked={editScope === 'future'}
                            onChange={() => setEditScope('future')}
                          />
                          <span>This and following events</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            value="all"
                            checked={editScope === 'all'}
                            onChange={() => setEditScope('all')}
                          />
                          <span>Entire series</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {selectedEvent?.RecurrenceParentID && (
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      This occurrence is already detached from its original series.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end p-4 border-t border-neutral-200 dark:border-neutral-700 space-x-3">
                {selectedEvent && !isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 dark:hover:bg-primary-400 rounded-xl"
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={() => setShowEventModal(false)}
                  className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl"
                >
                  Cancel
                </button>
                {isEditing && (
                  <button
                    onClick={handleSaveEvent}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 dark:hover:bg-primary-400 rounded-xl"
                  >
                    {selectedEvent ? 'Save Changes' : 'Create Event'}
                  </button>
                )}
                {selectedEvent && (
                  <div className="relative">
                    <button
                      data-testid="delete-event-button"
                      onClick={() => {
                        if (
                          selectedEvent.RecurrencePattern &&
                          !selectedEvent.RecurrenceParentID &&
                          occurrenceContext
                        ) {
                          setShowDeleteOptions(prev => !prev);
                        } else {
                          void handleDeleteEvent('all');
                        }
                      }}
                      className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl"
                    >
                      Delete
                    </button>
                    {showDeleteOptions && selectedEvent.RecurrencePattern && !selectedEvent.RecurrenceParentID && occurrenceContext && (
                      <div className="absolute right-0 mt-2 w-56 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-lg z-10">
                        <button
                          onClick={() => {
                            void handleDeleteEvent('one');
                          }}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-t-lg"
                        >
                          Delete this event only
                        </button>
                        <button
                          onClick={() => {
                            void handleDeleteEvent('future');
                          }}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700"
                        >
                          Delete this and following events
                        </button>
                        <button
                          onClick={() => {
                            void handleDeleteEvent('all');
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-b-lg"
                        >
                          Delete entire series
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
