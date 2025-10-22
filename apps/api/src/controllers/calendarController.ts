import { Request, Response } from 'express';
import { prisma } from '../db';
import { _createNotificationInternal } from './notificationController'; // Import _createNotificationInternal
import { fetchGoogleCalendarEvents } from '../utils/googleCalendar'; // Import fetchGoogleCalendarEvents

// Get all calendar events for a family
export const getEvents = async (req: Request & { userId?: string }, res: Response) => {
  const { familyId } = req.params;
  const userId = req.userId; // Get userId from authenticated request

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // Fetch events from local database
    const localEventsRaw = await prisma.calendarEvents.findMany({
      where: { FamilyID: parseInt(familyId) },
    });

    const localEvents = localEventsRaw.map(event => {
      let parsedExceptions: string[] = [];
      if (event.RecurrenceExceptionDates) {
        try {
          const json = JSON.parse(event.RecurrenceExceptionDates);
          if (Array.isArray(json)) {
            parsedExceptions = json;
          }
        } catch (err) {
          // Ignore parse errors and fall back to empty array
        }
      }

      return {
        ...event,
        RecurrenceExceptionDates: parsedExceptions,
      };
    });

    let googleEvents: any[] = [];
    const user = await prisma.users.findUnique({
      where: { UserID: userId },
      select: { googleAccessToken: true, googleRefreshToken: true },
    });

    if (user && user.googleAccessToken && user.googleRefreshToken) {
      try {
        // Fetch events from Google Calendar for the next 3 months (adjust as needed)
        const timeMin = new Date().toISOString();
        const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(); // 3 months from now
        googleEvents = await fetchGoogleCalendarEvents(userId, timeMin, timeMax);

        // Map Google Calendar events to a format compatible with your local events
        // This is a basic mapping, you might need to adjust fields
        googleEvents = googleEvents.map(gEvent => ({
          EventID: `google-${gEvent.id}`, // Prefix to distinguish from local events
          FamilyID: parseInt(familyId), // Assign to current family for display
          Title: gEvent.summary,
          Description: gEvent.description,
          StartTime: gEvent.start.dateTime || gEvent.start.date,
          EndTime: gEvent.end.dateTime || gEvent.end.date,
          CreatedByUserID: userId, // Assume current user created it for display purposes
          IsGoogleEvent: true, // Custom field to identify Google events
        }));
      } catch (googleErr: any) {
        console.error('Error fetching Google Calendar events:', googleErr);
        // Don't block the response if Google Calendar fails, just log the error
      }
    }

    // Combine local and Google events
    const allEvents = [...localEvents, ...googleEvents];

    res.json(allEvents);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to fetch calendar events', error: err.message });
  }
};

// Create a new calendar event
export const createEvent = async (req: Request & { userId?: string }, res: Response) => {
  const {
    familyId,
    title,
    description,
    startTime,
    endTime,
    recurrenceRule,
    recurrenceExceptionDates,
    recurrenceParentId,
    recurrenceOriginalStart,
    recurrenceOriginalEnd,
  } = req.body;
  const userId = req.userId;

  if (!title || !startTime) {
    return res.status(400).json({ error: 'Title and StartTime are required.' });
  }

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const parsedStart = new Date(startTime);
    if (Number.isNaN(parsedStart.getTime())) {
      return res.status(400).json({ error: 'Invalid StartTime.' });
    }

    const parsedEnd = endTime ? new Date(endTime) : new Date(startTime);
    if (Number.isNaN(parsedEnd.getTime())) {
      return res.status(400).json({ error: 'Invalid EndTime.' });
    }

    const eventData: any = {
      FamilyID: parseInt(familyId, 10),
      Title: title,
      Description: description,
      StartTime: parsedStart,
      EndTime: parsedEnd,
      CreatedByUserID: userId,
      ApprovalStatusID: 1,
    };

    if (recurrenceRule !== undefined) {
      eventData.IsRecurring = Boolean(recurrenceRule);
      eventData.RecurrencePattern = recurrenceRule || null;
    }

    if (Array.isArray(recurrenceExceptionDates)) {
      eventData.RecurrenceExceptionDates = recurrenceExceptionDates.length
        ? JSON.stringify(recurrenceExceptionDates)
        : null;
    }

    if (recurrenceParentId !== undefined) {
      const parsedParentId = recurrenceParentId !== null ? Number(recurrenceParentId) : null;
      if (parsedParentId !== null && Number.isNaN(parsedParentId)) {
        return res.status(400).json({ error: 'Invalid recurrenceParentId.' });
      }
      eventData.RecurrenceParentID = parsedParentId;
    }

    if (recurrenceOriginalStart !== undefined) {
      const parsed = recurrenceOriginalStart ? new Date(recurrenceOriginalStart) : null;
      if (parsed && Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ error: 'Invalid recurrenceOriginalStart.' });
      }
      eventData.RecurrenceOriginalStart = parsed;
    }

    if (recurrenceOriginalEnd !== undefined) {
      const parsed = recurrenceOriginalEnd ? new Date(recurrenceOriginalEnd) : null;
      if (parsed && Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ error: 'Invalid recurrenceOriginalEnd.' });
      }
      eventData.RecurrenceOriginalEnd = parsed;
    }

    const newEvent = await prisma.calendarEvents.create({
      data: eventData,
    });

    // Get all family members except the creator
    const familyMembers = await prisma.familyUsers.findMany({
      where: { FamilyID: parseInt(familyId), NOT: { UserID: userId } },
      select: { UserID: true },
    });

    // Create notifications for other family members
    for (const member of familyMembers) {
      await _createNotificationInternal({
        userId: member.UserID,
        message: `New event: ${title}`,
        type: 'event',
        link: '/calendar', // Link to the calendar page
      });
    }

    res.status(201).json(newEvent);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to create event', error: err.message });
  }
};

// Update a calendar event
export const updateCalendarEvent = async (req: Request, res: Response) => {
  const { id } = req.params;
  const numericId = parseInt(id, 10);

  if (Number.isNaN(numericId)) {
    return res.status(400).json({ error: 'Invalid event id.' });
  }

  try {
    const existingEvent = await prisma.calendarEvents.findUnique({
      where: { EventID: numericId },
    });

    if (!existingEvent) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const title = req.body.title ?? req.body.Title ?? existingEvent.Title;
    const description = req.body.description ?? req.body.Description ?? existingEvent.Description;
    const startInput = req.body.startTime ?? req.body.StartTime;
    const endInput = req.body.endTime ?? req.body.EndTime;
    const recurrenceRule = req.body.recurrenceRule ?? req.body.RecurrencePattern ?? req.body.RecurrenceRule;
    const recurrenceExceptionDatesInput = req.body.recurrenceExceptionDates ?? req.body.RecurrenceExceptionDates;
    const recurrenceParentId = req.body.recurrenceParentId ?? req.body.RecurrenceParentID;
    const recurrenceOriginalStartInput = req.body.recurrenceOriginalStart ?? req.body.RecurrenceOriginalStart;
    const recurrenceOriginalEndInput = req.body.recurrenceOriginalEnd ?? req.body.RecurrenceOriginalEnd;

    if (!title) {
      return res.status(400).json({ error: 'Title is required.' });
    }

    const parsedStart = startInput ? new Date(startInput) : existingEvent.StartTime;
    if (Number.isNaN(parsedStart.getTime())) {
      return res.status(400).json({ error: 'Invalid StartTime.' });
    }

    const parsedEnd = endInput ? new Date(endInput) : existingEvent.EndTime;
    if (Number.isNaN(parsedEnd.getTime())) {
      return res.status(400).json({ error: 'Invalid EndTime.' });
    }

    const updateData: any = {
      Title: title,
      Description: description,
      StartTime: parsedStart,
      EndTime: parsedEnd,
    };

    if (recurrenceRule !== undefined) {
      updateData.IsRecurring = Boolean(recurrenceRule);
      updateData.RecurrencePattern = recurrenceRule || null;
    }

    if (recurrenceExceptionDatesInput !== undefined) {
      let parsedExceptions: string[] | null = null;
      if (Array.isArray(recurrenceExceptionDatesInput)) {
        parsedExceptions = recurrenceExceptionDatesInput.length ? recurrenceExceptionDatesInput : null;
      } else if (typeof recurrenceExceptionDatesInput === 'string' && recurrenceExceptionDatesInput.trim().length > 0) {
        try {
          const json = JSON.parse(recurrenceExceptionDatesInput);
          if (Array.isArray(json)) {
            parsedExceptions = json;
          }
        } catch (err) {
          return res.status(400).json({ error: 'Invalid recurrenceExceptionDates format.' });
        }
      }

      updateData.RecurrenceExceptionDates = parsedExceptions ? JSON.stringify(parsedExceptions) : null;
    }

    if (recurrenceParentId !== undefined) {
      const parsedParentId = recurrenceParentId !== null ? Number(recurrenceParentId) : null;
      if (parsedParentId !== null && Number.isNaN(parsedParentId)) {
        return res.status(400).json({ error: 'Invalid recurrenceParentId.' });
      }
      updateData.RecurrenceParentID = parsedParentId;
    }

    if (recurrenceOriginalStartInput !== undefined) {
      const parsed = recurrenceOriginalStartInput ? new Date(recurrenceOriginalStartInput) : null;
      if (parsed && Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ error: 'Invalid recurrenceOriginalStart.' });
      }
      updateData.RecurrenceOriginalStart = parsed;
    }

    if (recurrenceOriginalEndInput !== undefined) {
      const parsed = recurrenceOriginalEndInput ? new Date(recurrenceOriginalEndInput) : null;
      if (parsed && Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ error: 'Invalid recurrenceOriginalEnd.' });
      }
      updateData.RecurrenceOriginalEnd = parsed;
    }

    const updatedEvent = await prisma.calendarEvents.update({
      where: { EventID: numericId },
      data: updateData,
    });

    res.json(updatedEvent);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a calendar event
export const deleteCalendarEvent = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.calendarEvents.delete({
      where: { EventID: parseInt(id) },
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
