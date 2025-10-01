import { Request, Response } from 'express';
import { prisma } from '../db';
import webpush from 'web-push';

// Configure web-push (replace with your actual VAPID keys from .env)
webpush.setVapidDetails(
  'mailto:your_email@example.com', // Replace with your email
  process.env.VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

export const subscribe = async (req: Request & { userId?: string }, res: Response) => {
  const { subscription } = req.body;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // Save the subscription to the database
    const newSubscription = await prisma.pushSubscription.create({
      data: {
        UserID: userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });
    res.status(201).json({ message: 'Subscription saved', subscription: newSubscription });
  } catch (error: any) {
    console.error('Error saving subscription:', error);
    res.status(500).json({ message: 'Failed to save subscription', error: error.message });
  }
};

export const unsubscribe = async (req: Request & { userId?: string }, res: Response) => {
  const { endpoint } = req.body;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    await prisma.pushSubscription.deleteMany({
      where: {
        UserID: userId,
        endpoint: endpoint,
      },
    });
    res.status(200).json({ message: 'Subscription removed' });
  } catch (error: any) {
    console.error('Error removing subscription:', error);
    res.status(500).json({ message: 'Failed to remove subscription', error: error.message });
  }
};