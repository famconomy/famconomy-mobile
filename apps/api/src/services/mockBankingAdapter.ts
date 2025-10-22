import { randomUUID } from 'crypto';

type MockTransferType = 'funding' | 'payout';
type MockTransferStatus = 'pending' | 'completed' | 'failed';

export interface MockTransferRecord {
  id: string;
  ledgerId: number;
  familyId?: number;
  userId?: string;
  amountCents: number;
  type: MockTransferType;
  status: MockTransferStatus;
  createdAt: number;
  updatedAt: number;
}

export interface CreateMockTransferInput {
  ledgerId: number;
  familyId?: number;
  userId?: string;
  amountCents: number;
}

export interface MockTransferEvent {
  transferId: string;
  ledgerId: number;
  type: MockTransferType;
  status: MockTransferStatus;
}

type WebhookHandler = (event: MockTransferEvent) => Promise<void> | void;

const transfers = new Map<string, MockTransferRecord>();
const webhookHandlers: WebhookHandler[] = [];
const DEFAULT_SETTLEMENT_DELAY_MS = 500;

const notifyHandlers = async (event: MockTransferEvent) => {
  for (const handler of webhookHandlers) {
    try {
      await handler(event);
    } catch (error) {
      console.error('[mock-banking-adapter] webhook handler error', error);
    }
  }
};

const scheduleAutoCompletion = (record: MockTransferRecord) => {
  setTimeout(async () => {
    const latest = transfers.get(record.id);
    if (!latest || latest.status !== 'pending') {
      return;
    }

    latest.status = 'completed';
    latest.updatedAt = Date.now();
    transfers.set(latest.id, latest);
    await notifyHandlers({
      transferId: latest.id,
      ledgerId: latest.ledgerId,
      type: latest.type,
      status: 'completed',
    });
  }, DEFAULT_SETTLEMENT_DELAY_MS).unref?.();
};

const createTransferRecord = (
  type: MockTransferType,
  input: CreateMockTransferInput
): MockTransferRecord => {
  const now = Date.now();
  return {
    id: randomUUID(),
    ledgerId: input.ledgerId,
    familyId: input.familyId,
    userId: input.userId,
    amountCents: input.amountCents,
    type,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
};

export const mockBankingAdapter = {
  registerWebhookHandler(handler: WebhookHandler) {
    webhookHandlers.push(handler);
  },

  async createFundingTransfer(input: CreateMockTransferInput) {
    const record = createTransferRecord('funding', input);
    transfers.set(record.id, record);
    scheduleAutoCompletion(record);
    return { id: record.id, status: record.status as const };
  },

  async createPayout(input: CreateMockTransferInput) {
    const record = createTransferRecord('payout', input);
    transfers.set(record.id, record);
    scheduleAutoCompletion(record);
    return { id: record.id, status: record.status as const };
  },

  async getTransfer(transferId: string) {
    return transfers.get(transferId) ?? null;
  },

  async simulateWebhook(transferId: string, status: Exclude<MockTransferStatus, 'pending'>) {
    const record = transfers.get(transferId);
    if (!record) {
      throw new Error(`Transfer ${transferId} not found`);
    }

    record.status = status;
    record.updatedAt = Date.now();
    transfers.set(record.id, record);

    await notifyHandlers({
      transferId: record.id,
      ledgerId: record.ledgerId,
      type: record.type,
      status,
    });

    return record;
  },
};

export type MockBankingAdapter = typeof mockBankingAdapter;
