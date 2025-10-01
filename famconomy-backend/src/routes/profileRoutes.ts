import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import {
  getMemberProfile,
  upsertMemberProfile,
  generateProfileShareLink,
  revokeProfileShareLink,
} from '../controllers/memberProfileController';

const router = express.Router({ mergeParams: true });

router.use(authenticateToken);

router.get('/:userId/profile', getMemberProfile);
router.put('/:userId/profile', upsertMemberProfile);
router.post('/:userId/profile/share', generateProfileShareLink);
router.post('/:userId/profile/share/revoke', revokeProfileShareLink);

export default router;
