import { Router } from 'express';
import multer from 'multer';
import { submitFeedback } from '../controllers/feedbackController';
import { authenticateToken as isAuthenticated } from '../middleware/authMiddleware';

const router = Router();
const upload = multer({ dest: 'uploads/' });

router.post('/', isAuthenticated, upload.single('screenshot'), submitFeedback);

export default router;
