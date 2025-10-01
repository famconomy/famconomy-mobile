import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import * as gigController from '../controllers/gigController';

const router = express.Router();

router.use(authenticateToken);

router.get('/', gigController.getGigs);
router.get('/templates', gigController.getGigTemplates);
router.post('/:gigId/claim', gigController.claimGig);
router.post('/:gigId/complete', gigController.completeGig);
router.post('/', gigController.addGigToFamily);
router.put('/:id', gigController.updateFamilyGig);
router.delete('/:id', gigController.removeFamilyGig);

export default router;
