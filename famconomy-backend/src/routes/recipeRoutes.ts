import { Router } from 'express';
import {
  listRecipes,
  createRecipe,
  getRecipe,
  updateRecipe,
  deleteRecipe,
  shareRecipe,
  importRecipeFromUrl,
  importRecipeFromScan,
  createRecipeMemory,
  listRecipeMemories,
  toggleRecipeFavorite,
} from '../controllers/recipeController';
import { authenticateToken } from '../middleware/authMiddleware';
import { upload } from '../middleware/upload';

const router = Router();

router.use(authenticateToken);

router.get('/:familyId/recipes', listRecipes);
router.post('/:familyId/recipes', createRecipe);
router.post('/:familyId/recipes/import', importRecipeFromUrl);
router.post('/:familyId/recipes/import/scan', upload.single('scan'), importRecipeFromScan);
router.get('/:familyId/recipes/:recipeId', getRecipe);
router.put('/:familyId/recipes/:recipeId', updateRecipe);
router.delete('/:familyId/recipes/:recipeId', deleteRecipe);
router.post('/:familyId/recipes/:recipeId/share', shareRecipe);
router.post('/:familyId/recipes/:recipeId/memories', createRecipeMemory);
router.get('/:familyId/recipes/:recipeId/memories', listRecipeMemories);
router.post('/:familyId/recipes/:recipeId/favorite', toggleRecipeFavorite);

export default router;
