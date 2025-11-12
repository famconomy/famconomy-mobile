import { prisma } from '../db';
import { WalletLedgerType, Prisma } from '@prisma/client';
import type { AuthorizationScope, FamilyControlsAccount } from '@famconomy/shared';
import crypto from 'crypto';

/**
 * Family Controls Service
 * Manages authorization tokens, screen time data, and device policies
 * Provides CRUD operations for iOS native integration
 */

// ============================================================
// Token Management
// ============================================================

/**
 * Generate a secure authorization token
 */
export const generateAuthorizationToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Create a new authorization token
 */
export const createAuthorizationToken = async (params: {
  userId: string;
  targetUserId: string;
  familyId: number;
  accountId: string;
  scopes: AuthorizationScope[];
  expiresInDays?: number;
}) => {
  const { userId, targetUserId, familyId, accountId, scopes, expiresInDays = 365 } = params;

  try {
    const token = generateAuthorizationToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const authToken = await prisma.authorizationToken.create({
      data: {
        userId,
        targetUserId,
        familyId,
        accountId,
        token,
        grantedScopes: scopes.join(','),
        expiresAt,
      },
    });

    return {
      success: true,
      token: authToken.token,
      authorizationToken: authToken,
    };
  } catch (error) {
    console.error('Error creating authorization token:', error);
    throw {
      code: 'TOKEN_CREATE_001',
      message: 'Failed to create authorization token',
      error,
    };
  }
};

/**
 * Validate an authorization token
 */
export const validateAuthorizationToken = async (token: string) => {
  try {
    const authToken = await prisma.authorizationToken.findUnique({
      where: { token },
    });

    if (!authToken) {
      return {
        valid: false,
        error: 'Token not found',
        code: 'TOKEN_INVALID_001',
      };
    }

    if (authToken.isRevoked) {
      return {
        valid: false,
        error: 'Token has been revoked',
        code: 'TOKEN_REVOKED_001',
      };
    }

    const now = new Date();
    if (authToken.expiresAt < now) {
      return {
        valid: false,
        error: 'Token has expired',
        code: 'TOKEN_EXPIRED_001',
      };
    }

    // Update last used timestamp and increment usage count
    await prisma.authorizationToken.update({
      where: { id: authToken.id },
      data: {
        lastUsedAt: now,
        usageCount: authToken.usageCount + 1,
      },
    });

    return {
      valid: true,
      authToken,
    };
  } catch (error) {
    console.error('Error validating authorization token:', error);
    throw error;
  }
};

/**
 * Check token status
 */
export const checkTokenStatus = async (token: string) => {
  try {
    const authToken = await prisma.authorizationToken.findUnique({
      where: { token },
    });

    if (!authToken) {
      throw {
        code: 'TOKEN_CHECK_001',
        message: 'Token not found',
      };
    }

    const now = new Date();
    const expiresAt = new Date(authToken.expiresAt);
    const daysUntilExpiration = Math.ceil(
      (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      authorized: !authToken.isRevoked && expiresAt > now,
      token: authToken.token,
      grantedScopes: authToken.grantedScopes.split(','),
      expiresAt: authToken.expiresAt.getTime(),
      isExpired: expiresAt <= now,
      requiresRenewal: daysUntilExpiration <= 30,
      daysUntilExpiration: daysUntilExpiration > 0 ? daysUntilExpiration : 0,
      lastUsedAt: authToken.lastUsedAt?.getTime(),
      usageCount: authToken.usageCount,
      targetUserId: authToken.targetUserId,
      grantedByUserId: authToken.userId,
      grantedAt: authToken.createdAt.getTime(),
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('Error checking token status:', error);
    throw error;
  }
};

/**
 * Revoke an authorization token
 */
export const revokeAuthorizationToken = async (params: {
  token: string;
  revokedByUserId: string;
  reason?: string;
}) => {
  try {
    const authToken = await prisma.authorizationToken.findUnique({
      where: { token: params.token },
    });

    if (!authToken) {
      throw {
        code: 'TOKEN_REVOKE_001',
        message: 'Token not found',
      };
    }

    const updated = await prisma.authorizationToken.update({
      where: { id: authToken.id },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedByUserId: params.revokedByUserId,
      },
    });

    return {
      success: true,
      revokedAt: updated.revokedAt?.getTime(),
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('Error revoking authorization token:', error);
    throw error;
  }
};

/**
 * Renew an authorization token (before expiration)
 */
export const renewAuthorizationToken = async (params: {
  token: string;
  expiresInDays?: number;
}) => {
  try {
    const authToken = await prisma.authorizationToken.findUnique({
      where: { token: params.token },
    });

    if (!authToken) {
      throw {
        code: 'TOKEN_RENEW_001',
        message: 'Token not found',
      };
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (params.expiresInDays || 365));

    const updated = await prisma.authorizationToken.update({
      where: { id: authToken.id },
      data: { expiresAt },
    });

    return {
      success: true,
      token: updated.token,
      expiresAt: updated.expiresAt.getTime(),
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('Error renewing authorization token:', error);
    throw error;
  }
};

/**
 * List tokens for a user
 */
export const listAuthorizationTokens = async (params: {
  userId?: string | undefined | null;
  targetUserId?: string | undefined | null;
  familyId?: number | undefined | null;
  includeExpired?: boolean;
  limit?: number;
  offset?: number;
}) => {
  try {
    const { userId, targetUserId, familyId, includeExpired = false, limit = 50, offset = 0 } = params;

    const where: any = {};
    if (userId) where.userId = userId;
    if (targetUserId) where.targetUserId = targetUserId;
    if (familyId) where.familyId = familyId;

    if (!includeExpired) {
      where.expiresAt = { gt: new Date() };
    }
    where.isRevoked = false;

    const [tokens, total] = await Promise.all([
      prisma.authorizationToken.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.authorizationToken.count({ where }),
    ]);

    return {
      tokens: tokens.map((token: any) => ({
        id: token.id,
        token: token.token,
        grantedScopes: token.grantedScopes.split(','),
        expiresAt: token.expiresAt.getTime(),
        lastUsedAt: token.lastUsedAt?.getTime(),
        usageCount: token.usageCount,
        createdAt: token.createdAt.getTime(),
      })),
      total,
      hasMore: offset + limit < total,
    };
  } catch (error) {
    console.error('Error listing authorization tokens:', error);
    throw error;
  }
};

// ============================================================
// Family Controls Account Management
// ============================================================

/**
 * Get or create a Family Controls account for a user
 */
export const getOrCreateFamilyControlsAccount = async (params: {
  userId: string;
  familyId: number;
}): Promise<FamilyControlsAccount> => {
  try {
    let account = await prisma.familyControlsAccount.findUnique({
      where: {
        userId_familyId: {
          userId: params.userId,
          familyId: params.familyId,
        },
      },
    });

    if (!account) {
      account = await prisma.familyControlsAccount.create({
        data: {
          userId: params.userId,
          familyId: params.familyId,
          isActive: true,
        },
      });
    }

    return {
      id: account.id,
      userId: account.userId,
      familyId: account.familyId,
  authorizationToken: account.authorizationToken || '',
  tokenExpiresAt: account.tokenExpiresAt?.getTime() ?? 0,
  screenTimeLimitMinutes: account.screenTimeLimitMinutes ?? 0,
  dailyScreenTimeMinutes: account.dailyScreenTimeMinutes ?? 0,
  lastSyncAt: account.lastSyncAt?.getTime() ?? 0,
      isActive: account.isActive,
      metadata: account.metadata as any,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    };
  } catch (error) {
    console.error('Error getting/creating Family Controls account:', error);
    throw error;
  }
};

/**
 * Update screen time account fields
 */
export const updateScreenTimeAccount = async (params: {
  userId: string;
  familyId: number;
  dailyScreenTimeMinutes?: number;
  screenTimeLimitMinutes?: number;
  metadata?: Record<string, any>;
}) => {
  try {
    const account = await prisma.familyControlsAccount.update({
      where: {
        userId_familyId: {
          userId: params.userId,
          familyId: params.familyId,
        },
      },
      data: {
        dailyScreenTimeMinutes: params.dailyScreenTimeMinutes ?? null,
        screenTimeLimitMinutes: params.screenTimeLimitMinutes ?? null,
        lastSyncAt: new Date(),
        ...(params.metadata && { metadata: params.metadata }),
      },
    });

    return {
      success: true,
      account: {
        id: account.id,
        dailyScreenTimeMinutes: account.dailyScreenTimeMinutes,
        screenTimeLimitMinutes: account.screenTimeLimitMinutes,
        lastSyncAt: account.lastSyncAt?.getTime(),
        timestamp: Date.now(),
      },
    };
  } catch (error) {
    console.error('Error updating screen time account:', error);
    throw error;
  }
};

// ============================================================
// Screen Time Records
// ============================================================

/**
 * Store screen time usage record
 */
export const recordScreenTime = async (params: {
  userId: string;
  familyId: number;
  date: Date;
  totalMinutesUsed: number;
  dailyLimitMinutes?: number;
  categoryBreakdown?: Record<string, number>;
  appBreakdown?: Record<string, number>;
  warnings?: any[];
}) => {
  try {
    // Get or create account first
    const account = await getOrCreateFamilyControlsAccount({
      userId: params.userId,
      familyId: params.familyId,
    });

    const date = new Date(params.date);
    date.setHours(0, 0, 0, 0); // Normalize to start of day

    const record = await prisma.screenTimeRecord.upsert({
      where: {
        userId_familyId_date: {
          userId: params.userId,
          familyId: params.familyId,
          date,
        },
      },
      update: {
        totalMinutesUsed: params.totalMinutesUsed,
        dailyLimitMinutes: params.dailyLimitMinutes ?? null,
        categoryBreakdown: params.categoryBreakdown ?? Prisma.JsonNull,
        appBreakdown: params.appBreakdown ?? Prisma.JsonNull,
        warnings: params.warnings ?? Prisma.JsonNull,
        lastUpdatedAt: new Date(),
      },
      create: {
        accountId: account.id!,
        userId: params.userId,
        familyId: params.familyId,
        date,
        totalMinutesUsed: params.totalMinutesUsed,
        dailyLimitMinutes: params.dailyLimitMinutes ?? null,
        categoryBreakdown: params.categoryBreakdown ?? Prisma.JsonNull,
        appBreakdown: params.appBreakdown ?? Prisma.JsonNull,
        warnings: params.warnings ?? Prisma.JsonNull,
        lastUpdatedAt: new Date(),
      },
    });

    return {
      success: true,
      record: {
        id: record.id,
        totalMinutesUsed: record.totalMinutesUsed,
        dailyLimitMinutes: record.dailyLimitMinutes,
        timestamp: Date.now(),
      },
    };
  } catch (error) {
    console.error('Error recording screen time:', error);
    throw error;
  }
};

/**
 * Get screen time history for a user
 */
export const getScreenTimeHistory = async (params: {
  userId: string;
  familyId: number;
  startDate: Date;
  endDate: Date;
}) => {
  try {
    const records = await prisma.screenTimeRecord.findMany({
      where: {
        userId: params.userId,
        familyId: params.familyId,
        date: {
          gte: params.startDate,
          lte: params.endDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    return {
      records: records.map((record: any) => ({
        id: record.id,
        date: record.date.toISOString(),
        totalMinutesUsed: record.totalMinutesUsed,
        dailyLimitMinutes: record.dailyLimitMinutes,
        categoryBreakdown: record.categoryBreakdown as any,
        appBreakdown: record.appBreakdown as any,
      })),
      total: records.length,
    };
  } catch (error) {
    console.error('Error getting screen time history:', error);
    throw error;
  }
};

// ============================================================
// Clean Up & Maintenance
// ============================================================

/**
 * Clean up expired tokens
 */
export const cleanupExpiredTokens = async () => {
  try {
    const result = await prisma.authorizationToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
        isRevoked: false, // Keep revoked tokens for audit
      },
    });

    console.log(`Cleaned up ${result.count} expired tokens`);
    return { deletedCount: result.count };
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
    throw error;
  }
};

/**
 * Get Family Controls statistics
 */
export const getFamilyControlsStats = async (familyId: number) => {
  try {
    const [activeTokens, totalTokens, activeAccounts, screenTimeRecords] = await Promise.all([
      prisma.authorizationToken.count({
        where: {
          familyId,
          isRevoked: false,
          expiresAt: { gt: new Date() },
        },
      }),
      prisma.authorizationToken.count({ where: { familyId } }),
      prisma.familyControlsAccount.count({
        where: { familyId, isActive: true },
      }),
      prisma.screenTimeRecord.count({ where: { familyId } }),
    ]);

    return {
      activeTokens,
      totalTokens,
      activeAccounts,
      screenTimeRecords,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('Error getting Family Controls stats:', error);
    throw error;
  }
};

// ============================================================
// Ledger Integration
// ============================================================

/**
 * Record screen time event to ledger
 * Maps Family Controls events to ledger entries for expense tracking
 */
export const recordScreenTimeEventToLedger = async (params: {
  userId: string;
  familyId: number;
  screenTimeMinutes: number;
  category: string;
  appName?: string;
  timestamp: Date;
  eventId?: string;
}) => {
  try {
    const {
      userId,
      familyId,
      screenTimeMinutes,
      category,
      appName,
      timestamp,
      eventId,
    } = params;

    // Map screen time to ledger value (configurable conversion)
    // Example: 1 hour = 1 point/dollar
    // For now, 1 minute = 1 cent
    const ledgerValueCents = BigInt(screenTimeMinutes); // 1 minute = 1 cent
    const ledgerEntry = await prisma.walletLedger.create({
      data: {
        initiatedByUserId: userId,
        familyId,
        amountCents: ledgerValueCents,
        currency: 'USD',
        type: WalletLedgerType.ADJUSTMENT, // Use a valid enum value, adjust if SCREEN_TIME is not present
        description: `Screen time: ${screenTimeMinutes}m in ${category}${appName ? ` (${appName})` : ''}`,
        metadata: {
          screenTimeMinutes,
          category,
          appName,
          familyControlsEventId: eventId,
          recordedAt: timestamp.toISOString(),
        },
        createdAt: timestamp,
      },
    });

    // Log the Family Controls event
    if (eventId) {
      await prisma.familyControlsEvent.create({
        data: {
          familyId,
          userId,
          eventType: 'SCREEN_TIME_RECORDED',
          eventData: {
            screenTimeMinutes,
            category,
            appName,
            ledgerEntryId: ledgerEntry.id,
          },
        },
      });
    }

    return ledgerEntry;
  } catch (error) {
    console.error('Error recording screen time event to ledger:', error);
    throw {
      code: 'LEDGER_EVENT_001',
      message: 'Failed to record screen time event to ledger',
      error,
    };
  }
};

/**
 * Record device control action to ledger
 */
export const recordDeviceActionToLedger = async (params: {
  userId: string;
  familyId: number;
  actionType: 'APP_BLOCKED' | 'APP_UNBLOCKED' | 'DEVICE_LOCKED' | 'DEVICE_UNLOCKED';
  actionDetails: string;
  appName?: string;
  timestamp: Date;
}) => {
  try {
    const { userId, familyId, actionType, actionDetails, appName, timestamp } = params;

    // Log the event
    const event = await prisma.familyControlsEvent.create({
      data: {
        familyId,
        userId,
        eventType: actionType,
        eventData: {
          actionDetails,
          appName,
          recordedAt: timestamp.toISOString(),
        },
      },
    });

    return event;
  } catch (error) {
    console.error('Error recording device action to ledger:', error);
    throw {
      code: 'LEDGER_ACTION_001',
      message: 'Failed to record device action to ledger',
      error,
    };
  }
};

/**
 * Record approval action to ledger
 */
export const recordApprovalToLedger = async (params: {
  childId: string;
  parentId: string;
  familyId: number;
  approvalType: 'SCREEN_TIME_GRANTED' | 'APP_ACCESS_GRANTED' | 'DEVICE_UNLOCK_GRANTED';
  approvalDetails: string;
  duration?: number;
  timestamp: Date;
}) => {
  try {
    const {
      childId,
      parentId,
      familyId,
      approvalType,
      approvalDetails,
      duration,
      timestamp,
    } = params;

    const event = await prisma.familyControlsEvent.create({
      data: {
        familyId,
        userId: parentId,
        eventType: approvalType,
        eventData: {
          childId,
          approvalDetails,
          duration,
          approvedAt: timestamp.toISOString(),
        },
      },
    });

    return event;
  } catch (error) {
    console.error('Error recording approval to ledger:', error);
    throw {
      code: 'LEDGER_APPROVAL_001',
      message: 'Failed to record approval to ledger',
      error,
    };
  }
};

/**
 * Get ledger entries for Family Controls events
 */
export const getLedgerEntriesForFamilyControls = async (params: {
  familyId: number;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) => {
  try {
    const { familyId, userId, startDate, endDate, limit = 100 } = params;

  const entries = await prisma.walletLedger.findMany({
      where: {
        familyId,
        type: WalletLedgerType.ADJUSTMENT, // Use a valid enum value, adjust if SCREEN_TIME is not present
        ...(userId && { initiatedByUserId: userId }),
        ...(startDate || endDate) && {
          createdAt: {
            ...(startDate && { gte: startDate }),
            ...(endDate && { lte: endDate }),
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return entries;
  } catch (error) {
    console.error('Error getting ledger entries:', error);
    throw error;
  }
};

/**
 * Sync Family Controls events with ledger
 * Called periodically to ensure all events are recorded
 */
export const syncFamilyControlsEventsToLedger = async (familyId: number) => {
  try {
    // Get recent Family Controls events without ledger entries
    const unlinkedEvents = await prisma.familyControlsEvent.findMany({
      where: {
        familyId,
        eventType: 'SCREEN_TIME_RECORDED',
        // Check if event has corresponding ledger entry
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    let synced = 0;

    for (const event of unlinkedEvents) {
      try {
        const eventData = event.eventData as any;
        
        // Check if already has ledger entry
        if (eventData.ledgerEntryId) {
          continue;
        }

        // Create ledger entry
        await recordScreenTimeEventToLedger({
          userId: event.userId,
          familyId,
          screenTimeMinutes: eventData.screenTimeMinutes || 0,
          category: eventData.category || 'unknown',
          appName: eventData.appName,
          timestamp: event.createdAt,
          eventId: event.id,
        });

        synced++;
      } catch (err) {
        console.warn(`Failed to sync event ${event.id}:`, err);
      }
    }

    return { synced, total: unlinkedEvents.length };
  } catch (error) {
    console.error('Error syncing Family Controls events:', error);
    throw error;
  }
};

