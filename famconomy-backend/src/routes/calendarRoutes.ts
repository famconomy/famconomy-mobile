import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { getEvents, createEvent, updateCalendarEvent, deleteCalendarEvent } from '../controllers/calendarController';

const router = express.Router();

router.use(authenticateToken);

router.get('/:familyId', getEvents);
router.post('/', createEvent);
router.put('/:id', updateCalendarEvent);
router.delete('/:id', deleteCalendarEvent);

export default router;