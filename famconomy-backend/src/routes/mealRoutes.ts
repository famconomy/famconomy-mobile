import { Router } from 'express';
import {
  listMeals,
  createMeal,
  updateMeal,
  listMealPlans,
  upsertMealPlanEntry,
  deleteMealPlanEntry,
} from '../controllers/mealController';

const router = Router();

router.get('/:familyId/meals', listMeals);
router.post('/:familyId/meals', createMeal);
router.put('/meals/:mealId', updateMeal);

router.get('/:familyId/plan', listMealPlans);
router.post('/:familyId/plan', upsertMealPlanEntry);
router.delete('/plan/entry/:entryId', deleteMealPlanEntry);

export default router;
