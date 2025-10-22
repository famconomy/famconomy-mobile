import express from 'express';
import { createLinkToken, exchangePublicToken, getTransactions, getAccounts, deleteAccount, updateAccount } from '../controllers/plaidController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/create_link_token', authenticateToken, createLinkToken);
router.post('/exchange_public_token', authenticateToken, exchangePublicToken);
router.delete('/accounts/:id', authenticateToken, deleteAccount);
router.put('/accounts/:id', authenticateToken, updateAccount);
router.post('/transactions', authenticateToken, getTransactions);
router.get('/accounts', authenticateToken, getAccounts);

export default router;
