import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import * as familyController from '../controllers/familyController';

console.log('--- INFO: Loading familyRoutes.ts ---');
console.log('--- DEBUG: Imported getMyFamily is of type:', typeof familyController.getMyFamily, '---');

const router = express.Router();

router.use(authenticateToken);

if (familyController.getMyFamily) {
  router.get('/', familyController.getMyFamily);
} else {
  router.get('/', (req, res) => {
    res.status(500).json({ error: 'CRITICAL: familyController.getMyFamily was not imported correctly and is undefined.' });
  });
}

if (familyController.createFamily) {
  router.post('/', familyController.createFamily);
} else {
  router.post('/', (req, res) => {
    res.status(500).json({ error: 'CRITICAL: familyController.createFamily was not imported correctly and is undefined.' });
  });
}

if (familyController.updateFamily) {
  router.put('/:id', familyController.updateFamily);
} else {
  router.put('/:id', (req, res) => {
    res.status(500).json({ error: 'CRITICAL: familyController.updateFamily was not imported correctly and is undefined.' });
  });
}

if (familyController.removeFamilyMember) {
  router.delete('/:familyId/members/:memberId', familyController.removeFamilyMember);
} else {
  router.delete('/:familyId/members/:memberId', (req, res) => {
    res.status(500).json({ error: 'CRITICAL: familyController.removeFamilyMember was not imported correctly and is undefined.' });
  });
}

if (familyController.leaveFamily) {
  router.delete('/leave', familyController.leaveFamily);
} else {
  router.delete('/leave', (req, res) => {
    res.status(500).json({ error: 'CRITICAL: familyController.leaveFamily was not imported correctly and is undefined.' });
  });
}

export default router;