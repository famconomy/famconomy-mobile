
import express from 'express';
import { getAllTaskStatuses } from '../controllers/taskStatusController';

const router = express.Router();

router.get('/', getAllTaskStatuses);

export default router;
