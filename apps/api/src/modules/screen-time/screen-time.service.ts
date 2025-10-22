// ScreenTimeService: enqueue grant jobs, track statuses, reconcile, write to RewardLedger.screenMinutes
import { GrantCommand, GrantResult } from './screen-time.types';
import { AppleScreenTimeProvider, GoogleScreenTimeProvider } from './screen-time.providers';

export class ScreenTimeService {
  async enqueueGrant(cmd: GrantCommand): Promise<{ grantId: string }> {
    // Enqueue job to BullMQ queue
    const { screenTimeQueue } = await import('./screen-time.jobs');
    await screenTimeQueue.add('grant', cmd, { jobId: cmd.id });
    return { grantId: cmd.id };
  }

  // Additional methods for job processing, status reconciliation, etc. will be added in next steps
}
