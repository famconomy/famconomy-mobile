import express from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  createNotification,
} from '../controllers/notificationController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

router.use(authenticateToken);

router.get('/user/:userId', getNotifications);
router.put('/:id/read', markAsRead);
router.put('/read-all/user/:userId', markAllAsRead);
router.post('/', createNotification);

export default router;
