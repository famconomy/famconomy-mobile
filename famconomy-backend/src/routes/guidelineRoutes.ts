import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import {
  listGuidelines,
  createGuideline,
  approveGuideline,
  updateGuideline,
} from '../controllers/guidelineController';

const router = express.Router({ mergeParams: true });

router.use(authenticateToken);

router.get('/', listGuidelines);
router.post('/', createGuideline);
router.post('/:guidelineId/approve', approveGuideline);
router.patch('/:guidelineId', updateGuideline);

export default router;
