import { Router } from 'express';
import {
  listMeals,
  createMeal,
  updateMeal,
  listMealPlans,
  upsertMealPlanEntry,
  deleteMealPlanEntry,
  convertMealToRecipe,
  linkMealToRecipe,
} from '../controllers/mealController';

const router = Router();

router.get('/:familyId/meals', listMeals);
router.post('/:familyId/meals', createMeal);
router.put('/meals/:mealId', updateMeal);

// Meal-Recipe conversion
router.post('/meals/:mealId/convert-to-recipe', convertMealToRecipe);
router.put('/meals/:mealId/link-recipe', linkMealToRecipe);

router.get('/:familyId/plan', listMealPlans);
router.post('/:familyId/plan', upsertMealPlanEntry);
router.delete('/plan/entry/:entryId', deleteMealPlanEntry);

export default router;
