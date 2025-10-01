import { Request, Response } from 'express';
import { prisma } from '../db';
import { _createNotificationInternal } from './notificationController'; // Import _createNotificationInternal

// Get all messages for a family
export const getMessages = async (req: Request, res: Response) => {
  const { familyId } = req.params;
  try {
    const messages = await prisma.message.findMany({
      where: { FamilyID: parseInt(familyId) },
      orderBy: { Timestamp: 'asc' },
    });
    res.json(messages);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch messages', error: err.message });
  }
};

// Create a new message
export const createMessage = async (req: Request & { userId?: string }, res: Response) => {
  const { FamilyID, MessageText, SourceID } = req.body;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
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
