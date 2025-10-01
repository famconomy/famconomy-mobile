import express from 'express';
import {
  subscribe,
  unsubscribe,
} from '../controllers/pushSubscriptionController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/subscribe', authenticateToken, subscribe);
router.post('/unsubscribe', authenticateToken, unsubscribe);

export default router;