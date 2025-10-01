import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { upload } from '../middleware/upload';
import { updateUser, uploadProfilePhoto, deleteUser } from '../controllers/userController';

const router = express.Router();

router.use(authenticateToken);

router.put('/:id', updateUser);
router.post('/:id/photo', upload.single('profilePhoto'), uploadProfilePhoto);
router.delete('/:id', deleteUser);

export default router;
