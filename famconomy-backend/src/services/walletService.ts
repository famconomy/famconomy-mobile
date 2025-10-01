import {
  Prisma,
  WalletEntryAccountType,
  WalletEntryDirection,
  WalletLedgerStatus,
  WalletLedgerType,
} from '@prisma/client';
import { prisma } from '../db';
import { mockBankingAdapter, MockTransferEvent } from './mockBankingAdapter';

type TransactionClient = Prisma.TransactionClient;

const DEFAULT_CURRENCY = 'USD';

const toBigInt = (value: number | string | bigint): bigint => {
  if (typeof value === 'bigint') {
    return value;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('Amount must be a finite number');
    }
    if (!Number.isInteger(value)) {
      throw new Error('Amount (in cents) must be an integer');
    }
    return BigInt(value);
  }

  if (!/^[-]?\d+$/.test(value)) {
    throw new Error('Amount string must be an integer representation');
  }

  return BigInt(value);
};

const assertPositiveAmount = (amountCents: bigint) => {
  if (amountCents <= 0n) {
    throw new Error('Amount must be greater than zero');
  }
};

const assertBalancesMatch = (entries: LedgerEntryInput[]) => {
  let debitTotal = 0n;
  let creditTotal = 0n;

  for (const entry of entries) {
    if (entry.amountCents <= 0n) {
      throw new Error('Ledger entry amounts must be positive');
    }
    if (entry.direction === WalletEntryDirection.DEBIT) {
      debitTotal += entry.amountCents;
    } else {
      creditTotal += entry.amountCents;
    }
  }

  if (debitTotal !== creditTotal) {
    throw new Error('Ledger entries must balance (total debits equal total credits)');
  }
};

const assertSufficientBalance = (balance: bigint, amount: bigint, context: string) => {
  if (balance < amount) {
    throw new Error(`Insufficient balance for ${context}`);
  }
};

const serializeWallet = <T extends { balanceCents: bigint }>(wallet: T | null) => {
  if (!wallet) {
    return null;
  }

  return {
    ...wallet,
    balanceCents: wallet.balanceCents.toString(),
  };
};

type LedgerWithEntries = Prisma.WalletLedgerGetPayload<{
  include: { entries: true; initiatedByUser: true };
}>;

const normalizeLedger = (ledger: LedgerWithEntries | null) => {
  if (!ledger) {
    return null;
  }

  return {
    ...ledger,
    amountCents: ledger.amountCents.toString(),
    entries: ledger.entries.map((entry) => ({
      ...entry,
      amountCents: entry.amountCents.toString(),
    })),
  };
};

interface LedgerEntryInput {
  accountType: WalletEntryAccountType;
  direction: WalletEntryDirection;
  amountCents: bigint;
  familyWalletId?: number;
  userWalletId?: number;
  externalAccountId?: string;
  memo?: string;
}

interface CreateLedgerInput {
  familyId: number;
  familyWalletId?: number;
  type: WalletLedgerType;
  status: WalletLedgerStatus;
  amountCents: bigint;
  currency?: string;
  description?: string;
  referenceType?: string;
  referenceId?: string;
  externalId?: string;
  metadata?: Prisma.JsonValue;
  initiatedByUserId?: string;
  entries: LedgerEntryInput[];
}

export interface TransferFromFamilyToUserParams {
  familyId: number;
  userId: string;
  amountCents: number | string | bigint;
  initiatedByUserId?: string;
  description?: string;
  referenceType?: string;
  referenceId?: string;
  type?: Extract<WalletLedgerType, 'TASK_REWARD' | 'GIG_REWARD' | 'TRANSFER'>;
}

const getOrCreateFamilyWallet = async (familyId: number, tx: TransactionClient) => {
  let familyWallet = await tx.familyWallet.findUnique({ where: { familyId } });

  if (!familyWallet) {
    familyWallet = await tx.familyWallet.create({ data: { familyId } });
  }

  return familyWallet;
};

const getOrCreateUserWallet = async (familyId: number, userId: string, tx: TransactionClient) => {
  let userWallet = await tx.userWallet.findUnique({ where: { familyId_userId: { familyId, userId } } });

  if (!userWallet) {
    userWallet = await tx.userWallet.create({ data: { familyId, userId } });
  }

  return userWallet;
};

const applyLedgerEntries = async (ledgerId: number, tx: TransactionClient) => {
  const entries = await tx.walletLedgerEntry.findMany({
    where: { ledgerId, applied: false },
  });

  for (const entry of entries) {
    if (entry.accountType === WalletEntryAccountType.FAMILY && entry.familyWalletId) {
      if (entry.direction === WalletEntryDirection.CREDIT) {
        await tx.familyWallet.update({
          where: { id: entry.familyWalletId },
          data: { balanceCents: { increment: entry.amountCents } },
        });
      } else {
        await tx.familyWallet.update({
          where: { id: entry.familyWalletId },
          data: { balanceCents: { decrement: entry.amountCents } },
        });
      }
    }

    if (entry.accountType === WalletEntryAccountType.USER && entry.userWalletId) {
      if (entry.direction === WalletEntryDirection.CREDIT) {
        await tx.userWallet.update({
          where: { id: entry.userWalletId },
          data: { balanceCents: { increment: entry.amountCents } },
        });
      } else {
        await tx.userWallet.update({
          where: { id: entry.userWalletId },
          data: { balanceCents: { decrement: entry.amountCents } },
        });
      }
    }

    await tx.walletLedgerEntry.update({ where: { id: entry.id }, data: { applied: true } });
  }
};

const createLedger = async (input: CreateLedgerInput, tx: TransactionClient) => {
  assertPositiveAmount(input.amountCents);
  assertBalancesMatch(input.entries);

  const ledger = await tx.walletLedger.create({
    data: {
      familyId: input.familyId,
      familyWalletId: input.familyWalletId,
      type: input.type,
      status: input.status,
      amountCents: input.amountCents,
      currency: input.currency ?? DEFAULT_CURRENCY,
      description: input.description,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      externalId: input.externalId,
      metadata: input.metadata,
      initiatedByUserId: input.initiatedByUserId,
      entries: {
        create: input.entries.map((entry) => ({
          accountType: entry.accountType,
          direction: entry.direction,
          amountCents: entry.amountCents,
          familyWalletId: entry.familyWalletId,
          userWalletId: entry.userWalletId,
          externalAccountId: entry.externalAccountId,
          memo: entry.memo,
        })),
      },
    },
    include: { entries: true },
  });

  if (input.status === WalletLedgerStatus.COMPLETED) {
    await applyLedgerEntries(ledger.id, tx);
  }

  return ledger;
};

const fetchLedgerWithEntries = async (ledgerId: number) => {
  const ledger = await prisma.walletLedger.findUnique({
    where: { id: ledgerId },
    include: {
      entries: true,
      initiatedByUser: true,
    },
  });

  return normalizeLedger(ledger);
};

export const markLedgerStatus = async (ledgerId: number, status: WalletLedgerStatus) => {
  return prisma.$transaction(async (tx) => {
    const ledger = await tx.walletLedger.findUnique({ where: { id: ledgerId } });

    if (!ledger) {
      throw new Error(`Ledger ${ledgerId} not found`);
    }

    if (ledger.status === status) {
      return fetchLedgerWithEntries(ledgerId);
    }

    await tx.walletLedger.update({
      where: { id: ledgerId },
      data: { status },
    });

    if (status === WalletLedgerStatus.COMPLETED) {
      await applyLedgerEntries(ledgerId, tx);
    }

    if (status === WalletLedgerStatus.FAILED) {
      await tx.walletLedgerEntry.updateMany({
        where: { ledgerId, applied: false },
        data: { memo: 'Marked failed' },
      });
    }

    return fetchLedgerWithEntries(ledgerId);
  });
};

export const initiateFamilyFunding = async (params: {
  familyId: number;
  amountCents: number | string | bigint;
  initiatedByUserId?: string;
  description?: string;
  metadata?: Prisma.JsonValue;
}) => {
  const amount = toBigInt(params.amountCents);

  const ledger = await prisma.$transaction(async (tx) => {
    const familyWallet = await getOrCreateFamilyWallet(params.familyId, tx);

    return createLedger(
      {
        familyId: params.familyId,
        familyWalletId: familyWallet.id,
        type: WalletLedgerType.FUNDING,
        status: WalletLedgerStatus.PENDING,
        amountCents: amount,
        description: params.description,
        metadata: params.metadata,
        initiatedByUserId: params.initiatedByUserId,
        entries: [
          {
            accountType: WalletEntryAccountType.EXTERNAL,
            direction: WalletEntryDirection.DEBIT,
            amountCents: amount,
            externalAccountId: 'mock-external',
            memo: 'Mock funding source debit',
          },
          {
            accountType: WalletEntryAccountType.FAMILY,
            direction: WalletEntryDirection.CREDIT,
            amountCents: amount,
            familyWalletId: familyWallet.id,
            memo: 'Family wallet credit (pending)',
          },
        ],
      },
      tx
    );
  });

  const transfer = await mockBankingAdapter.createFundingTransfer({
    ledgerId: ledger.id,
    familyId: params.familyId,
    amountCents: Number(amount),
  });

  await prisma.walletLedger.update({ where: { id: ledger.id }, data: { externalId: transfer.id } });

  return fetchLedgerWithEntries(ledger.id);
};

const transferFromFamilyToUserInternal = async (
  params: TransferFromFamilyToUserParams,
  tx: TransactionClient
) => {
  const amount = toBigInt(params.amountCents);
  const familyWallet = await getOrCreateFamilyWallet(params.familyId, tx);
  const userWallet = await getOrCreateUserWallet(params.familyId, params.userId, tx);

  assertSufficientBalance(
    familyWallet.balanceCents,
    amount,
    'family wallet reward transfer'
  );

  return createLedger(
    {
      familyId: params.familyId,
      familyWalletId: familyWallet.id,
      type: params.type ?? WalletLedgerType.TRANSFER,
      status: WalletLedgerStatus.COMPLETED,
      amountCents: amount,
      description: params.description,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      initiatedByUserId: params.initiatedByUserId,
      entries: [
        {
          accountType: WalletEntryAccountType.FAMILY,
          direction: WalletEntryDirection.DEBIT,
          amountCents: amount,
          familyWalletId: familyWallet.id,
          memo: 'Family wallet debit',
        },
        {
          accountType: WalletEntryAccountType.USER,
          direction: WalletEntryDirection.CREDIT,
          amountCents: amount,
          userWalletId: userWallet.id,
          memo: 'User wallet credit',
        },
      ],
    },
    tx
  );
};

export const transferFromFamilyToUserTx = (
  params: TransferFromFamilyToUserParams,
  tx: TransactionClient
) => transferFromFamilyToUserInternal(params, tx);

export const transferFromFamilyToUser = async (params: TransferFromFamilyToUserParams) => {
  const ledger = await prisma.$transaction((tx) => transferFromFamilyToUserInternal(params, tx));
  return fetchLedgerWithEntries(ledger.id);
};

export const requestUserWithdrawal = async (params: {
  familyId: number;
  userId: string;
  amountCents: number | string | bigint;
  initiatedByUserId?: string;
  description?: string;
}) => {
  const amount = toBigInt(params.amountCents);

  const ledger = await prisma.$transaction(async (tx) => {
    const familyWallet = await getOrCreateFamilyWallet(params.familyId, tx);
    const userWallet = await getOrCreateUserWallet(params.familyId, params.userId, tx);

    assertSufficientBalance(userWallet.balanceCents, amount, 'user withdrawal');

    return createLedger(
      {
        familyId: params.familyId,
        familyWalletId: familyWallet.id,
        type: WalletLedgerType.WITHDRAWAL,
        status: WalletLedgerStatus.PENDING,
        amountCents: amount,
        description: params.description,
        initiatedByUserId: params.initiatedByUserId,
        entries: [
          {
            accountType: WalletEntryAccountType.USER,
            direction: WalletEntryDirection.DEBIT,
            amountCents: amount,
            userWalletId: userWallet.id,
            memo: 'User wallet debit (pending payout)',
          },
          {
            accountType: WalletEntryAccountType.EXTERNAL,
            direction: WalletEntryDirection.CREDIT,
            amountCents: amount,
            externalAccountId: 'mock-external',
            memo: 'External payout credit',
          },
        ],
      },
      tx
    );
  });

  const transfer = await mockBankingAdapter.createPayout({
    ledgerId: ledger.id,
    familyId: params.familyId,
    userId: params.userId,
    amountCents: Number(amount),
  });

  await prisma.walletLedger.update({ where: { id: ledger.id }, data: { externalId: transfer.id } });

  return fetchLedgerWithEntries(ledger.id);
};

export const getFamilyWalletOverview = async (familyId: number) => {
  const [familyWallet, userWallets] = await Promise.all([
    prisma.familyWallet.findUnique({ where: { familyId } }),
    prisma.userWallet.findMany({
      where: { familyId },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  return {
    familyWallet: serializeWallet(familyWallet),
    userWallets: userWallets.map((wallet) => ({
      ...wallet,
      balanceCents: wallet.balanceCents.toString(),
    })),
  };
};

export const listFamilyLedgers = async (familyId: number, limit = 50) => {
  const ledgers = await prisma.walletLedger.findMany({
    where: { familyId },
    include: { entries: true, initiatedByUser: true },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return ledgers.map((ledger) => ({
    ...ledger,
    amountCents: ledger.amountCents.toString(),
    entries: ledger.entries.map((entry) => ({
      ...entry,
      amountCents: entry.amountCents.toString(),
    })),
  }));
};

const handleMockTransferEvent = async (event: MockTransferEvent) => {
  if (event.status === 'completed') {
    await markLedgerStatus(event.ledgerId, WalletLedgerStatus.COMPLETED);
    return;
  }

  if (event.status === 'failed') {
    await markLedgerStatus(event.ledgerId, WalletLedgerStatus.FAILED);
  }
};

mockBankingAdapter.registerWebhookHandler(handleMockTransferEvent);
