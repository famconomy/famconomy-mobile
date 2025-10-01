import { google } from 'googleapis';
import { prisma } from '../db';

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI // This should match your callbackURL in passport.ts
);

// Function to get a Google Calendar client for a user
export const getGoogleCalendarClient = async (userId: string) => {
  const user = await prisma.users.findUnique({
    where: { UserID: userId },
    select: { googleAccessToken: true, googleRefreshToken: true },
  });

  if (!user || !user.googleAccessToken || !user.googleRefreshToken) {
    throw new Error('User not authenticated with Google Calendar.');
  }

  oAuth2Client.setCredentials({
    access_token: user.googleAccessToken,
    refresh_token: user.googleRefreshToken,
  });

  // Handle token refresh
  oAuth2Client.on('tokens', async (tokens) => {
    if (tokens.refresh_token) {
      // Store the new refresh token if it's provided
      await prisma.users.update({
        where: { UserID: userId },
        data: { googleRefreshToken: tokens.refresh_token },
      });
    }
    // Store the new access token
    await prisma.users.update({
      where: { UserID: userId },
      data: { googleAccessToken: tokens.access_token || user.googleAccessToken },
    });
    console.log('Google access token refreshed for user:', userId);
  });

  return google.calendar({ version: 'v3', auth: oAuth2Client });
};

// Example: Fetch events from primary calendar
export const fetchGoogleCalendarEvents = async (userId: string, timeMin: string, timeMax: string) => {
  const calendar = await getGoogleCalendarClient(userId);
  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: timeMin,
    timeMax: timeMax,
    singleEvents: true,
    orderBy: 'startTime',
  });
  return res.data.items;
};

// Example: Create an event in primary calendar
export const createGoogleCalendarEvent = async (userId: string, event: any) => {
  const calendar = await getGoogleCalendarClient(userId);
  const res = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
  });
  return res.data;
};

// Example: Update an event in primary calendar
export const updateGoogleCalendarEvent = async (userId: string, eventId: string, event: any) => {
  const calendar = await getGoogleCalendarClient(userId);
  const res = await calendar.events.update({
    calendarId: 'primary',
    eventId: eventId,
    requestBody: event,
  });
  return res.data;
};

// Example: Delete an event from primary calendar
export const deleteGoogleCalendarEvent = async (userId: string, eventId: string) => {
  const calendar = await getGoogleCalendarClient(userId);
  await calendar.events.delete({
    calendarId: 'primary',
    eventId: eventId,
  });
  return true;
};