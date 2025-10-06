import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { requireFamilyMembership } from '../utils/authUtils';
import { getMessages, createMessage } from '../controllers/messagesController';

const router = express.Router();

router.use(authenticateToken);

// Messages are already secured in controller, but we can add middleware for clarity
router.get('/:familyId', getMessages);
router.post('/', createMessage);

export default router;
