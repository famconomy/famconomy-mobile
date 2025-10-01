
import express from 'express';
import { getAllApprovalStatuses } from '../controllers/approvalStatusController';

const router = express.Router();

router.get('/', getAllApprovalStatuses);

export default router;
