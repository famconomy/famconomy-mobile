// Types for screen-time grant commands and results

export type GrantCommand = {
  id: string;            // cuid
  childId: string;       // ScreenTimeChild.id
  minutes: number;       // +/-
  source: { kind: 'task' | 'gig' | 'manual'; id: string };
  idempotencyKey?: string;
  ttlSec?: number;
};

export type GrantResult = {
  id: string;
  status: 'APPLIED' | 'FAILED' | 'EXPIRED';
  providerRef?: string;
  error?: string;
  appliedAt?: string;
};
