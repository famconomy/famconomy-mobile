import express from 'express';
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  approveTask,
  uploadAttachment,
  deleteTaskAttachment,
} from '../controllers/taskController';
import { authenticateToken } from '../middleware/authMiddleware';
import { requireFamilyMembership, requireTaskAccess } from '../utils/authUtils';
import { upload } from '../middleware/upload';

const router = express.Router();

router.use(authenticateToken);

// Task-specific routes with access control
router.delete('/:taskId/attachments/:attachmentId', requireTaskAccess('taskId'), deleteTaskAttachment);
router.get('/:id', requireTaskAccess('id'), getTaskById);
router.put('/:id', requireTaskAccess('id'), updateTask);
router.delete('/:id', requireTaskAccess('id'), deleteTask);
router.post('/:id/attachments', requireTaskAccess('id'), upload.single('attachment'), uploadAttachment);

// Family-based routes (authorization handled in controller)
router.post('/', createTask);
router.get('/family/:familyId', getTasks);

export default router;