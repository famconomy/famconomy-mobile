import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import {
  fundFamilyWallet,
  getWalletOverview,
  listWalletLedgers,
  requestWithdrawal,
  transferToFamilyUser,
} from '../controllers/walletController';

const router = express.Router({ mergeParams: true });

router.use(authenticateToken);

router.get('/family/:familyId/overview', getWalletOverview);
router.get('/family/:familyId/ledgers', listWalletLedgers);
router.post('/family/:familyId/fund', fundFamilyWallet);
router.post('/family/:familyId/users/:userId/transfer', transferToFamilyUser);
router.post('/family/:familyId/users/:userId/withdraw', requestWithdrawal);

export default router;
