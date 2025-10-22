// Basic tests for screen-time service and job queue
import { ScreenTimeService } from './screen-time.service';
import { screenTimeQueue } from './screen-time.jobs';
import { GrantCommand } from './screen-time.types';

describe('ScreenTimeService', () => {
  it('should enqueue and process a grant job', async () => {
    const service = new ScreenTimeService();
    const cmd: GrantCommand = {
      id: 'test-grant-1',
      childId: 'child-123',
      minutes: 30,
      source: { kind: 'manual', id: 'manual' },
      idempotencyKey: 'unique-key-1'
    };
    const { grantId } = await service.enqueueGrant(cmd);
    expect(grantId).toBe(cmd.id);
    // Optionally, check job in queue
    const jobs = await screenTimeQueue.getJobs(['waiting', 'active', 'completed']);
    expect(jobs.length).toBeGreaterThan(0);
  });
});
