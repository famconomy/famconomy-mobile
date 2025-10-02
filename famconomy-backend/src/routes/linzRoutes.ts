import { Router } from 'express';
import {
  hydrateLinzContext,
  updateLinzMemory,
  getLinzFacts,
  upsertLinzFacts,
  generateAndSaveIngredients,
  getMealSuggestions,
  getMealNameSuggestions,
} from '../controllers/linzController';

const router = Router();

router.get('/context/hydrate', hydrateLinzContext);
router.put('/memory', updateLinzMemory);
router.get('/facts', getLinzFacts);
router.post('/facts', upsertLinzFacts);
router.post('/generate-ingredients', generateAndSaveIngredients);
router.get('/meal-suggestions', getMealSuggestions);
router.get('/meal-name-suggestions', getMealNameSuggestions);

export default router;
