import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { getMessages, createMessage } from '../controllers/messagesController';

const router = express.Router();

router.use(authenticateToken);

router.get('/:familyId', getMessages);
router.post('/', createMessage);

export default router;
