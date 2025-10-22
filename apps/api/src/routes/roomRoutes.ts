import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import * as roomController from '../controllers/roomController';

console.log('--- INFO: Loading roomRoutes.ts ---');

const router = express.Router();

router.use(authenticateToken);

router.get('/', roomController.getRooms);
router.post('/', roomController.createRoom);
router.delete('/:roomId', roomController.deleteRoom);
router.post('/reset', roomController.resetRooms);

export default router;
