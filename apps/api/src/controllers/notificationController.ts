
import { Request, Response } from 'express';
import { prisma } from '../db';
import webpush from 'web-push'; // Import web-push
import { Server } from 'socket.io'; // Import Server from socket.io

let io: Server; // Declare io instance
const shouldLogPushNotifications = process.env.DEBUG_NOTIFICATIONS === 'true';

export const setIoInstance = (ioInstance: Server) => {
  io = ioInstance;
};

// Configure web-push (replace with your actual VAPID keys from .env)
webpush.setVapidDetails(
  'mailto:your_email@example.com', // Replace with your email
  process.env.VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

// Get all notifications for a user
export const getNotifications = async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const notifications = await prisma.notification.findMany({
      where: { UserID: userId, IsRead: false },
      select: {
        NotificationID: true,
        UserID: true,
        Message: true,
        IsRead: true,
        CreatedAt: true,
        Type: true,
        Link: true, // Include the Link field
      },
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Mark a notification as read
export const markAsRead = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const updatedNotification = await prisma.notification.update({
      where: { NotificationID: parseInt(id) },
      data: { IsRead: true },
    });
    res.json(updatedNotification);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    await prisma.notification.updateMany({
      where: { UserID: userId },
      data: { IsRead: true },
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Internal function to create a notification
export const _createNotificationInternal = async (notificationData: {
  userId: string;
  message: string;
  type?: string;
  link?: string;
}) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        UserID: notificationData.userId,
        Message: notificationData.message,
        Type: notificationData.type,
        Link: notificationData.link,
      },
    });

    // Emit WebSocket event for new notification
    if (io) {
      io.to(notificationData.userId).emit('newNotification', notification);
    }

    // Send push notification
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { UserID: notificationData.userId },
    });

    for (const sub of subscriptions) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      const payload = JSON.stringify({
        title: 'FamConomy Notification',
        body: notificationData.message,
        icon: '/Logo.png', // Path to your app icon
        data: {
          url: notificationData.link || '/',
        },
      });

      try {
        await webpush.sendNotification(pushSubscription, payload);
        if (shouldLogPushNotifications) {
          console.log('Push notification sent to:', notificationData.userId);
        }
      } catch (pushError: any) {
        console.error('Error sending push notification:', pushError);
        // If subscription is no longer valid, remove it from the database
        if (pushError.statusCode === 410) { // GONE status
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
          if (shouldLogPushNotifications) {
            console.log('Expired push subscription removed:', sub.id);
          }
        }
      }
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification internally:', error);
    throw new Error('Failed to create notification');
  }
};

// Create a notification (Express handler)
export const createNotification = async (req: Request, res: Response) => {
  const { userId, message, type, link } = req.body;
  try {
    const notification = await _createNotificationInternal({ userId, message, type, link });
    res.status(201).json(notification);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
