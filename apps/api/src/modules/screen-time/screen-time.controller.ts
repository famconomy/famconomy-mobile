// Express controller for screen-time routes
import { Router } from 'express';
import { ScreenTimeService } from './screen-time.service';

const router = Router();
const service = new ScreenTimeService();

// POST /screen-time/connect/:provider (stub)
router.post('/connect/:provider', async (req, res) => {
  // TODO: Store account row with placeholder token
  res.json({ success: true });
});

// GET /screen-time/children (stub)
router.get('/children', async (req, res) => {
  // Return mock children for now
  res.json([
    { id: 'child-1', name: 'Alice' },
    { id: 'child-2', name: 'Bob' }
  ]);
});

// POST /screen-time/grants (manual grant/revoke)
router.post('/grants', async (req, res) => {
  // Accepts {childId, minutesDelta, idempotencyKey}
  const { childId, minutesDelta, idempotencyKey } = req.body;
  const cmd = {
    id: idempotencyKey || Date.now().toString(),
    childId,
    minutes: minutesDelta,
    source: { kind: 'manual' as 'manual', id: 'manual' },
    idempotencyKey
  };
  const result = await service.enqueueGrant(cmd);
  res.json({ grantId: result.grantId, status: 'QUEUED' });
});

// GET /screen-time/ledger?childId=...
router.get('/ledger', async (req, res) => {
  // TODO: Read ledger/history
  res.json([]);
});

export default router;
