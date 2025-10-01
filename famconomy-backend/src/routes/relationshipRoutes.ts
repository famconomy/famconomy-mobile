
import express from 'express';
import { getAllRelationships } from '../controllers/relationshipController';

const router = express.Router();

router.get('/', getAllRelationships);

export default router;
