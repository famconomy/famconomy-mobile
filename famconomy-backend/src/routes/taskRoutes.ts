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
import { upload } from '../middleware/upload';

const router = express.Router();

router.use(authenticateToken);

router.delete('/:taskId/attachments/:attachmentId', deleteTaskAttachment);

router.post('/', createTask);
router.get('/family/:familyId', getTasks);
router.get('/:id', getTaskById);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);
router.post('/:id/attachments', upload.single('attachment'), uploadAttachment);

export default router;