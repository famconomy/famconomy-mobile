import express from 'express';
import { getVapidPublicKey } from '../controllers/authController'; // Still import from authController for now
import { getSharedWishlist } from '../controllers/wishlistController';
import { getSharedProfile } from '../controllers/memberProfileController';

const router = express.Router();

router.get('/vapid-public-key', getVapidPublicKey);
router.get('/wishlists/shared/:token', getSharedWishlist);
router.get('/profiles/shared/:token', getSharedProfile);
router.get('/api/wishlists/shared/:token', getSharedWishlist);
router.get('/api/profiles/shared/:token', getSharedProfile);

export default router;
