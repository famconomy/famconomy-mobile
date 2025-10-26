import { Router } from 'express';
import * as familyControlsController from '../controllers/familyControlsController';
import { authenticateToken } from '../middleware/authMiddleware';

/**
 * Family Controls Routes
 * All routes require authentication
 * Base path: /family-controls
 */

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// ============================================================
// Authorization Token Routes
// ============================================================

/**
 * POST /family-controls/authorize
 * Create a new authorization token
 */
router.post('/authorize', familyControlsController.authorizeUser);

/**
 * GET /family-controls/tokens
 * List authorization tokens with filtering
 */
router.get('/tokens', familyControlsController.listTokens);

/**
 * GET /family-controls/tokens/:token
 * Check authorization token status
 */
router.get('/tokens/:token', familyControlsController.checkTokenStatus);

/**
 * POST /family-controls/tokens/:token/validate
 * Validate and use an authorization token
 */
router.post('/tokens/:token/validate', familyControlsController.validateToken);

/**
 * POST /family-controls/tokens/:token/revoke
 * Revoke an authorization token
 */
router.post('/tokens/:token/revoke', familyControlsController.revokeToken);

/**
 * POST /family-controls/tokens/:token/renew
 * Renew an authorization token
 */
router.post('/tokens/:token/renew', familyControlsController.renewToken);

// ============================================================
// Screen Time Account Routes
// ============================================================

/**
 * POST /family-controls/accounts
 * Get or create a Family Controls account
 */
router.post('/accounts', familyControlsController.getOrCreateAccount);

/**
 * PUT /family-controls/accounts/:userId/:familyId
 * Update screen time account fields
 */
router.put('/accounts/:userId/:familyId', familyControlsController.updateAccount);

// ============================================================
// Screen Time Records Routes
// ============================================================

/**
 * POST /family-controls/screen-time
 * Record screen time usage
 */
router.post('/screen-time', familyControlsController.recordScreenTime);

/**
 * GET /family-controls/screen-time/:userId/:familyId
 * Get screen time history
 * Query params: startDate, endDate (ISO 8601)
 */
router.get('/screen-time/:userId/:familyId', familyControlsController.getScreenTimeHistory);

// ============================================================
// Device Control Policy Routes
// ============================================================

/**
 * POST /family-controls/policies
 * Create or update device control policy
 */
router.post('/policies', familyControlsController.upsertDevicePolicy);

/**
 * GET /family-controls/policies/:familyId/:deviceId
 * Get device control policy
 */
router.get('/policies/:familyId/:deviceId', familyControlsController.getDevicePolicy);

// ============================================================
// Statistics & Health Routes
// ============================================================

/**
 * GET /family-controls/stats/:familyId
 * Get Family Controls statistics
 */
router.get('/stats/:familyId', familyControlsController.getStats);

/**
 * POST /family-controls/cleanup
 * Cleanup expired tokens (admin only)
 */
router.post('/cleanup', familyControlsController.cleanupExpiredTokensHandler);

export default router;
