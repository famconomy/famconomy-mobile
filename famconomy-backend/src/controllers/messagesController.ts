import { Request, Response } from 'express';
import { prisma } from '../db';
import { logger } from '../utils/logger';
import { verifyFamilyMembership } from '../utils/authUtils';
import { _createNotificationInternal } from './notificationController';
import { constructFullName } from '../utils/userUtils';

// Get all messages for a family
export const getMessages = async (req: Request, res: Response) => {
  const { familyId } = req.params;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const familyIdNumber = parseInt(familyId);
  if (isNaN(familyIdNumber)) {
    return res.status(400).json({ error: 'Invalid family ID' });
  }

  try {
    // Verify user belongs to the family
    const isMember = await verifyFamilyMembership(userId, familyIdNumber);
    if (!isMember) {
      logger.warn('Unauthorized message access attempt', { userId, familyId: familyIdNumber });
      return res.status(403).json({ error: 'Access denied. User is not a member of this family.' });
    }

    const messages = await prisma.message.findMany({
      where: { FamilyID: familyIdNumber },
      orderBy: { Timestamp: 'asc' },
      include: {
        Sender: {
          select: {
            UserID: true,
            FirstName: true,
            LastName: true,
          },
        },
      },
    });

    // Transform user data to include fullName for frontend compatibility
    const transformedMessages = messages.map(message => ({
      ...message,
      Sender: message.Sender ? {
        ...message.Sender,
        fullName: constructFullName(message.Sender.FirstName, message.Sender.LastName)
      } : null
    }));

    res.json(transformedMessages);
  } catch (err: any) {
    logger.error('Failed to fetch messages', { userId, familyId: familyIdNumber, error: err });
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

// Create a new message
export const createMessage = async (req: Request, res: Response) => {
  const { FamilyID, MessageText, SourceID } = req.body;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!FamilyID || !MessageText) {
    return res.status(400).json({ error: 'FamilyID and MessageText are required' });
  }

  try {
    // Verify user belongs to the family
    const isMember = await verifyFamilyMembership(userId, FamilyID);
    if (!isMember) {
      logger.warn('Unauthorized message creation attempt', { userId, familyId: FamilyID });
      return res.status(403).json({ error: 'Access denied. User is not a member of this family.' });
    }
    const messageSource = await prisma.messageSource.upsert({
      where: { SourceID: 1 },
      update: { SourceName: 'General' },
      create: {
        SourceID: 1,
        SourceName: 'General',
      },
    });

    const newMessage = await prisma.message.create({
      data: {
        FamilyID: FamilyID,
        MessageText: MessageText,
        Timestamp: new Date(),
        SenderID: userId,
        SourceID: messageSource.SourceID,
      },
    });

    // Get all family members except the sender
    const familyMembers = await prisma.familyUsers.findMany({
      where: { FamilyID: FamilyID, NOT: { UserID: userId } },
      select: { UserID: true },
    });

    const sender = await prisma.users.findUnique({
      where: { UserID: userId },
      select: { FirstName: true, LastName: true },
    });

    const senderName = sender ? `${sender.FirstName} ${sender.LastName}` : 'Unknown User';

    // Create notifications for other family members
    for (const member of familyMembers) {
      await _createNotificationInternal({
        userId: member.UserID,
        message: `New message from ${senderName}: ${MessageText.substring(0, 50)}...`, // Truncate message for notification
        type: 'message',
        link: '/messages', // Link to the messages page
      });
    }

    res.status(201).json(newMessage);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create message', error: err.message });
  }
};
