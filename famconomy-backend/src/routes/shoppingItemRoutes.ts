
import express from 'express';
import {
  getShoppingItems,
  createShoppingItem,
  updateShoppingItem,
  deleteShoppingItem,
} from '../controllers/shoppingItemController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

router.use(authenticateToken);

router.get('/list/:listId', getShoppingItems);
router.post('/', createShoppingItem);
router.put('/:id', updateShoppingItem);
router.delete('/:id', deleteShoppingItem);

export default router;
