import { Request, Response } from 'express';
import { prisma } from '../db';
import {
  getFamilyWalletOverview,
  initiateFamilyFunding,
  listFamilyLedgers,
  requestUserWithdrawal,
  transferFromFamilyToUser,
} from '../services/walletService';
import { WalletLedgerType } from '@prisma/client';

const parseFamilyId = (value: unknown) => {
  const familyId = Number(value);
  if (!Number.isInteger(familyId) || familyId <= 0) {
    throw new Error('Invalid familyId');
  }
  return familyId;
};

const ensureFamilyMembership = async (familyId: number, userId: string) => {
  const membership = await prisma.familyUsers.findUnique({
    where: {
      UserID_FamilyID: {
        UserID: userId,
        FamilyID: familyId,
      },
    },
  });

  if (!membership) {
    const error = new Error('User does not belong to this family');
    (error as any).statusCode = 403;
    throw error;
  }
};

const ensureUserBelongsToFamily = async (familyId: number, userId: string) => {
  const membership = await prisma.familyUsers.findUnique({
    where: {
      UserID_FamilyID: {
        UserID: userId,
        FamilyID: familyId,
      },
    },
  });

  if (!membership) {
    const error = new Error('Target user is not a member of this family');
    (error as any).statusCode = 404;
    throw error;
  }
};

const parseAmountCents = (value: unknown) => {
  const amount = typeof value === 'string' ? Number(value) : value;
  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0) {
    throw new Error('amountCents must be a positive integer');
  }
  return amount;
};

export const getWalletOverview = async (req: Request & { userId?: string }, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const familyId = parseFamilyId(req.params.familyId);
    await ensureFamilyMembership(familyId, req.userId);

    const overview = await getFamilyWalletOverview(familyId);
    res.json(overview);
  } catch (error: any) {
    console.error('[walletController] getWalletOverview error', error);
    const status = error.statusCode ?? 500;
    res.status(status).json({ error: error.message ?? 'Failed to load wallet overview' });
  }
};

export const listWalletLedgers = async (req: Request & { userId?: string }, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const familyId = parseFamilyId(req.params.familyId);
    await ensureFamilyMembership(familyId, req.userId);

    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const ledgers = await listFamilyLedgers(familyId, limit && limit > 0 ? limit : undefined);
    res.json(ledgers);
  } catch (error: any) {
    console.error('[walletController] listWalletLedgers error', error);
    const status = error.statusCode ?? 500;
    res.status(status).json({ error: error.message ?? 'Failed to load wallet activity' });
  }
};

export const fundFamilyWallet = async (req: Request & { userId?: string }, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const familyId = parseFamilyId(req.params.familyId);
    await ensureFamilyMembership(familyId, req.userId);

    const amountCents = parseAmountCents(req.body.amountCents);
    const description = req.body.description as string | undefined;
    const metadata = req.body.metadata;

    const ledger = await initiateFamilyFunding({
      familyId,
      amountCents,
      description,
      metadata,
      initiatedByUserId: req.userId,
    });

    res.status(202).json(ledger);
  } catch (error: any) {
    console.error('[walletController] fundFamilyWallet error', error);
    const status = error.statusCode ?? 500;
    res.status(status).json({ error: error.message ?? 'Failed to fund wallet' });
  }
};

export const transferToFamilyUser = async (req: Request & { userId?: string }, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const familyId = parseFamilyId(req.params.familyId);
    await ensureFamilyMembership(familyId, req.userId);

    const targetUserId = req.params.userId;
    if (!targetUserId) {
      return res.status(400).json({ error: 'userId parameter is required' });
    }

    await ensureUserBelongsToFamily(familyId, targetUserId);

    const amountCents = parseAmountCents(req.body.amountCents);
    const description = req.body.description as string | undefined;
    const referenceType = req.body.referenceType as string | undefined;
    const referenceId = req.body.referenceId as string | undefined;
    const type = req.body.type as WalletLedgerType | undefined;

    const ledger = await transferFromFamilyToUser({
      familyId,
      userId: targetUserId,
      amountCents,
      description,
      referenceType,
      referenceId,
      type,
      initiatedByUserId: req.userId,
    });

    res.status(201).json(ledger);
  } catch (error: any) {
    console.error('[walletController] transferToFamilyUser error', error);
    const status = error.statusCode ?? 500;
    res.status(status).json({ error: error.message ?? 'Failed to transfer funds' });
  }
};

export const requestWithdrawal = async (req: Request & { userId?: string }, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const familyId = parseFamilyId(req.params.familyId);
    await ensureFamilyMembership(familyId, req.userId);

    const targetUserId = req.params.userId ?? req.userId;
    await ensureUserBelongsToFamily(familyId, targetUserId);

    const amountCents = parseAmountCents(req.body.amountCents);
    const description = req.body.description as string | undefined;

    const ledger = await requestUserWithdrawal({
      familyId,
      userId: targetUserId,
      amountCents,
      initiatedByUserId: req.userId,
      description,
    });

    res.status(202).json(ledger);
  } catch (error: any) {
    console.error('[walletController] requestWithdrawal error', error);
    const status = error.statusCode ?? 500;
    res.status(status).json({ error: error.message ?? 'Failed to request withdrawal' });
  }
};
