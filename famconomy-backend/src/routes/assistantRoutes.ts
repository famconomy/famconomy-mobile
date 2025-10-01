import { Router } from 'express';
import { handleAssistantRequest, streamOnboardingAssistant } from '../controllers/assistantController';

const router = Router();

router.post('/assistant', handleAssistantRequest);
router.post('/assistant/onboarding', streamOnboardingAssistant);
router.post('/api/assistant', handleAssistantRequest);
router.post('/api/assistant/onboarding', streamOnboardingAssistant);

export default router;
