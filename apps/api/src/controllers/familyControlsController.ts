import { Request, Response } from 'express';
import * as familyControlsService from '../services/familyControlsService';
import { prisma } from '../db';

/**
 * Family Controls Controller
 * Exposes REST endpoints for iOS native integration
 * Handles authorization tokens, screen time records, and device policies
 */

// ============================================================
// Authorization Token Endpoints
// ============================================================

/**
 * POST /family-controls/authorize
 * Create a new authorization token
 */
export const authorizeUser = async (req: Request, res: Response) => {
  try {
    const { userId, targetUserId, familyId, scopes, expiresInDays } = req.body;

    if (!userId || !targetUserId || !familyId || !scopes || !Array.isArray(scopes)) {
      return res.status(400).json({
        code: 'VAL_001',
        message: 'Missing required parameters: userId, targetUserId, familyId, scopes[]',
        userFriendlyMessage: 'Invalid request parameters',
      });
    }

    // Get or create account
    const account = await familyControlsService.getOrCreateFamilyControlsAccount({
      userId,
      familyId,
    });

    // Create authorization token
    const result = await familyControlsService.createAuthorizationToken({
      userId,
      targetUserId,
      familyId,
      accountId: account.id!,
      scopes,
      expiresInDays,
    });

    return res.status(201).json({
      success: true,
      data: {
        authorizationToken: result.token,
        expiresAt: result.authorizationToken.expiresAt.getTime(),
        grantedScopes: scopes,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    console.error('Error authorizing user:', error);
    return res.status(500).json({
      code: 'AUTH_001',
      message: 'Failed to create authorization token',
      error: String(error),
    });
  }
};

/**
 * GET /family-controls/tokens/:token
 * Check authorization token status
 */
export const checkTokenStatus = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        code: 'VAL_001',
        message: 'Token parameter required',
      });
    }

    const status = await familyControlsService.checkTokenStatus(token);

    return res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    console.error('Error checking token status:', error);

    if (error.code === 'TOKEN_CHECK_001') {
      return res.status(404).json({
        code: error.code,
        message: error.message,
        userFriendlyMessage: 'Authorization token not found',
      });
    }

    return res.status(500).json({
      code: 'CHECK_001',
      message: 'Failed to check token status',
      error: String(error),
    });
  }
};

/**
 * POST /family-controls/tokens/:token/validate
 * Validate and use an authorization token
 */
export const validateToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        code: 'VAL_001',
        message: 'Token parameter required',
      });
    }

    const validation = await familyControlsService.validateAuthorizationToken(token);

    if (!validation.valid) {
      return res.status(401).json({
        code: validation.code,
        message: validation.error,
        userFriendlyMessage: 'Authorization failed',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        authorized: true,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    console.error('Error validating token:', error);
    return res.status(500).json({
      code: 'CHECK_001',
      message: 'Failed to validate token',
      error: String(error),
    });
  }
};

/**
 * POST /family-controls/tokens/:token/revoke
 * Revoke an authorization token
 */
export const revokeToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { revokedByUserId, reason } = req.body;

    if (!token || !revokedByUserId) {
      return res.status(400).json({
        code: 'VAL_001',
        message: 'Token and revokedByUserId required',
      });
    }

    const result = await familyControlsService.revokeAuthorizationToken({
      token,
      revokedByUserId,
      reason,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error revoking token:', error);

    if (error.code === 'TOKEN_REVOKE_001') {
      return res.status(404).json({
        code: error.code,
        message: error.message,
      });
    }

    return res.status(500).json({
      code: 'REVOKE_001',
      message: 'Failed to revoke token',
      error: String(error),
    });
  }
};

/**
 * POST /family-controls/tokens/:token/renew
 * Renew an authorization token (extend expiration)
 */
export const renewToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { expiresInDays } = req.body;

    if (!token) {
      return res.status(400).json({
        code: 'VAL_001',
        message: 'Token parameter required',
      });
    }

    const result = await familyControlsService.renewAuthorizationToken({
      token,
      expiresInDays,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error renewing token:', error);

    if (error.code === 'TOKEN_RENEW_001') {
      return res.status(404).json({
        code: error.code,
        message: error.message,
      });
    }

    return res.status(500).json({
      code: 'RENEW_001',
      message: 'Failed to renew token',
      error: String(error),
    });
  }
};

/**
 * GET /family-controls/tokens
 * List authorization tokens with filtering
 */
export const listTokens = async (req: Request, res: Response) => {
  try {
    const { userId, targetUserId, familyId, includeExpired, limit = '50', offset = '0' } = req.query;

    const result = await familyControlsService.listAuthorizationTokens({
      userId: userId as string | undefined,
      targetUserId: targetUserId as string | undefined,
      familyId: familyId ? parseInt(familyId as string) : undefined,
      includeExpired: includeExpired === 'true',
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error listing tokens:', error);
    return res.status(500).json({
      code: 'LIST_001',
      message: 'Failed to list tokens',
      error: String(error),
    });
  }
};

// ============================================================
// Screen Time Account Endpoints
// ============================================================

/**
 * POST /family-controls/accounts
 * Get or create a Family Controls account
 */
export const getOrCreateAccount = async (req: Request, res: Response) => {
  try {
    const { userId, familyId } = req.body;

    if (!userId || !familyId) {
      return res.status(400).json({
        code: 'VAL_001',
        message: 'userId and familyId required',
      });
    }

    const account = await familyControlsService.getOrCreateFamilyControlsAccount({
      userId,
      familyId,
    });

    return res.status(200).json({
      success: true,
      data: account,
    });
  } catch (error) {
    console.error('Error getting/creating account:', error);
    return res.status(500).json({
      code: 'ACCOUNT_001',
      message: 'Failed to get or create account',
      error: String(error),
    });
  }
};

/**
 * PUT /family-controls/accounts/:userId/:familyId
 * Update screen time account fields
 */
export const updateAccount = async (req: Request, res: Response) => {
  try {
    const { userId, familyId } = req.params;
    const { dailyScreenTimeMinutes, screenTimeLimitMinutes, metadata } = req.body;

    const result = await familyControlsService.updateScreenTimeAccount({
      userId,
      familyId: parseInt(familyId),
      dailyScreenTimeMinutes,
      screenTimeLimitMinutes,
      metadata,
    });

    return res.status(200).json({
      success: true,
      data: result.account,
    });
  } catch (error) {
    console.error('Error updating account:', error);
    return res.status(500).json({
      code: 'ACCOUNT_002',
      message: 'Failed to update account',
      error: String(error),
    });
  }
};

// ============================================================
// Screen Time Records Endpoints
// ============================================================

/**
 * POST /family-controls/screen-time
 * Record screen time usage
 */
export const recordScreenTime = async (req: Request, res: Response) => {
  try {
    const {
      userId,
      familyId,
      date,
      totalMinutesUsed,
      dailyLimitMinutes,
      categoryBreakdown,
      appBreakdown,
      warnings,
    } = req.body;

    if (!userId || !familyId || !date || totalMinutesUsed === undefined) {
      return res.status(400).json({
        code: 'VAL_001',
        message: 'userId, familyId, date, totalMinutesUsed required',
      });
    }

    const result = await familyControlsService.recordScreenTime({
      userId,
      familyId,
      date: new Date(date),
      totalMinutesUsed,
      dailyLimitMinutes,
      categoryBreakdown,
      appBreakdown,
      warnings,
    });

    return res.status(201).json({
      success: true,
      data: result.record,
    });
  } catch (error) {
    console.error('Error recording screen time:', error);
    return res.status(500).json({
      code: 'SCREEN_TIME_001',
      message: 'Failed to record screen time',
      error: String(error),
    });
  }
};

/**
 * GET /family-controls/screen-time/:userId/:familyId
 * Get screen time history
 */
export const getScreenTimeHistory = async (req: Request, res: Response) => {
  try {
    const { userId, familyId } = req.params;
    const { startDate, endDate } = req.query;

    if (!userId || !familyId || !startDate || !endDate) {
      return res.status(400).json({
        code: 'VAL_001',
        message: 'userId, familyId, startDate, endDate required',
      });
    }

    const result = await familyControlsService.getScreenTimeHistory({
      userId,
      familyId: parseInt(familyId),
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error getting screen time history:', error);
    return res.status(500).json({
      code: 'SCREEN_TIME_002',
      message: 'Failed to get screen time history',
      error: String(error),
    });
  }
};

// ============================================================
// Statistics & Health Endpoints
// ============================================================

/**
 * GET /family-controls/stats/:familyId
 * Get Family Controls statistics
 */
export const getStats = async (req: Request, res: Response) => {
  try {
    const { familyId } = req.params;

    if (!familyId) {
      return res.status(400).json({
        code: 'VAL_001',
        message: 'familyId required',
      });
    }

    const stats = await familyControlsService.getFamilyControlsStats(parseInt(familyId));

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    return res.status(500).json({
      code: 'STATS_001',
      message: 'Failed to get statistics',
      error: String(error),
    });
  }
};

/**
 * POST /family-controls/cleanup
 * Cleanup expired tokens (admin only)
 */
export const cleanupExpiredTokensHandler = async (_req: Request, res: Response) => {
  try {
    // Optional: Add authorization check here
    const result = await familyControlsService.cleanupExpiredTokens();

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error cleaning up tokens:', error);
    return res.status(500).json({
      code: 'CLEANUP_001',
      message: 'Failed to cleanup expired tokens',
      error: String(error),
    });
  }
};

// ============================================================
// Device Control Policy Endpoints
// ============================================================

/**
 * POST /family-controls/policies
 * Create or update device control policy
 */
export const upsertDevicePolicy = async (req: Request, res: Response) => {
  try {
    const { familyId, deviceId, appliedByUserId, blockedAppBundleIds, contentRestrictions, siriRestricted, purchasesRestricted } = req.body;

    if (!familyId || !deviceId || !appliedByUserId) {
      return res.status(400).json({
        code: 'VAL_001',
        message: 'familyId, deviceId, appliedByUserId required',
      });
    }

    const policy = await prisma.deviceControlPolicy.upsert({
      where: {
        familyId_deviceId: {
          familyId,
          deviceId,
        },
      },
      update: {
        blockedAppBundleIds: blockedAppBundleIds || undefined,
        contentRestrictions: contentRestrictions || undefined,
        siriRestricted: siriRestricted !== undefined ? siriRestricted : undefined,
        purchasesRestricted: purchasesRestricted !== undefined ? purchasesRestricted : undefined,
      },
      create: {
        familyId,
        deviceId,
        appliedByUserId,
        blockedAppBundleIds,
        contentRestrictions,
        siriRestricted: siriRestricted || false,
        purchasesRestricted: purchasesRestricted || false,
      },
    });

    return res.status(200).json({
      success: true,
      data: policy,
    });
  } catch (error) {
    console.error('Error upserting device policy:', error);
    return res.status(500).json({
      code: 'POLICY_001',
      message: 'Failed to create/update device policy',
      error: String(error),
    });
  }
};

/**
 * GET /family-controls/policies/:familyId/:deviceId
 * Get device control policy
 */
export const getDevicePolicy = async (req: Request, res: Response) => {
  try {
    const { familyId, deviceId } = req.params;

    const policy = await prisma.deviceControlPolicy.findUnique({
      where: {
        familyId_deviceId: {
          familyId: parseInt(familyId),
          deviceId,
        },
      },
    });

    if (!policy) {
      return res.status(404).json({
        code: 'POLICY_NOT_FOUND',
        message: 'Device policy not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: policy,
    });
  } catch (error) {
    console.error('Error getting device policy:', error);
    return res.status(500).json({
      code: 'POLICY_002',
      message: 'Failed to get device policy',
      error: String(error),
    });
  }
};
