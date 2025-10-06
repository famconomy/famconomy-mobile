// BullMQ job queue setup for screen-time grants
import { Queue, Worker, Job } from 'bullmq';
import { GrantCommand, GrantResult } from './screen-time.types';
import { AppleScreenTimeProvider, GoogleScreenTimeProvider } from './screen-time.providers';

const connection = { host: process.env.REDIS_HOST || 'localhost', port: Number(process.env.REDIS_PORT) || 6379 };
export const screenTimeQueue = new Queue<GrantCommand>('screen-time-grants', { connection });

export const screenTimeWorker = new Worker<GrantCommand>('screen-time-grants', async (job: Job<GrantCommand>) => {
  const cmd = job.data;
  const provider = cmd.source.kind === 'manual' ? AppleScreenTimeProvider : GoogleScreenTimeProvider;
  const result = await provider.applyAllowanceDelta(cmd.childId, cmd.minutes);
  // Write ScreenTimeGrant and update RewardLedger
  const { prisma } = await import('../../db');
  try {
    await prisma.ScreenTimeGrant.create({
      data: {
        id: cmd.id,
        childId: cmd.childId,
        type: 'GRANT',
        minutesDelta: cmd.minutes,
        status: result.success ? 'APPLIED' : 'FAILED',
        providerPayload: result.providerRef ? { ref: result.providerRef } : undefined,
        errorMessage: result.error,
        appliedAt: result.success ? new Date() : undefined,
        idempotencyKey: cmd.idempotencyKey || undefined
      }
    });
    if (result.success) {
      await prisma.RewardLedger.create({
        data: {
          userId: cmd.childId, // This assumes childId maps to userId; adjust if needed
          familyGigId: 0,      // Placeholder, update with real gig/task context
          rewardMode: 'screenTime',
          screenMinutes: cmd.minutes,
          awardedAt: new Date()
        }
      });
    }
  } finally {
    await prisma.$disconnect();
  }
  return result;
}, { connection });

// For testing: add a job
// screenTimeQueue.add('grant', { ... });
