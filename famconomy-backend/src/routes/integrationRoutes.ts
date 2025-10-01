import { Router } from 'express';
import {
  redirectToInstacart,
  handleInstacartCallback,
  getIntegrationStatus,
  disconnectInstacart,
  searchInstacart,
  addInstacartItem,
  redirectToShipt,
  handleShiptCallback,
  disconnectShipt,
  redirectToKroger,
  handleKrogerCallback,
  disconnectKroger // Assuming this will be created
} from '../controllers/integrationController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// All integration routes should be protected
router.use(authenticateToken);

router.get('/status', getIntegrationStatus);

// Instacart
router.get('/instacart/connect', redirectToInstacart);
router.get('/instacart/callback', handleInstacartCallback);
router.delete('/instacart/disconnect', disconnectInstacart);
router.post('/instacart/search', searchInstacart);
router.post('/instacart/add-to-cart', addInstacartItem);

// Shipt
router.get('/shipt/connect', redirectToShipt);
router.get('/shipt/callback', handleShiptCallback);
router.delete('/shipt/disconnect', disconnectShipt);

// Kroger
router.get('/kroger/connect', redirectToKroger);
router.get('/kroger/callback', handleKrogerCallback);
router.delete('/kroger/disconnect', disconnectKroger);

export default router;