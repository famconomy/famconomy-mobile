import { Router } from 'express';
import { commitOnboarding, resetOnboarding } from '../controllers/onboardingController';

const router = Router();

router.post('/commit', commitOnboarding);
router.post('/reset', resetOnboarding);

export default router;
