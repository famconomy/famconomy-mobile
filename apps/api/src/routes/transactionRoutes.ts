
import express from 'express';
import {
  createTransaction,
  getTransactions,
  getAllTransactions,
  getTransactionsForAccounts,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
} from '../controllers/transactionController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

router.use(authenticateToken);

router.post('/', createTransaction);
router.post('/accounts', getTransactionsForAccounts);
router.get('/', getAllTransactions);
router.get('/budget/:budgetId', getTransactions);
router.get('/:id', getTransactionById);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

export default router;
