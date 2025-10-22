import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import {
  listWishlists,
  createWishlist,
  updateWishlist,
  deleteWishlist,
  addWishlistItem,
  updateWishlistItem,
  deleteWishlistItem,
  claimWishlistItem,
  generateWishlistShareLink,
  revokeWishlistShareLink,
} from '../controllers/wishlistController';

const router = express.Router({ mergeParams: true });

router.use(authenticateToken);

router.get('/', listWishlists);
router.post('/', createWishlist);
router.patch('/:wishlistId', updateWishlist);
router.delete('/:wishlistId', deleteWishlist);

router.post('/:wishlistId/items', addWishlistItem);
router.patch('/:wishlistId/items/:itemId', updateWishlistItem);
router.delete('/:wishlistId/items/:itemId', deleteWishlistItem);
router.post('/:wishlistId/items/:itemId/claim', claimWishlistItem);

router.post('/:wishlistId/share', generateWishlistShareLink);
router.post('/:wishlistId/share/revoke', revokeWishlistShareLink);

export default router;
