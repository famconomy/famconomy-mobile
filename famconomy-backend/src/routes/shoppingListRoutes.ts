
import express from 'express';
import {
  getShoppingLists,
  createShoppingList,
  updateShoppingList,
  deleteShoppingList,
  archiveShoppingList,
  addMealPlanToShoppingList,
} from '../controllers/shoppingListController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

router.use(authenticateToken);

router.post('/add-meal-plan', addMealPlanToShoppingList);
router.get('/family/:familyId', getShoppingLists);
router.post('/', createShoppingList);
router.put('/:id', updateShoppingList);
router.patch('/:id/archive', archiveShoppingList);
router.delete('/:id', deleteShoppingList);

export default router;
