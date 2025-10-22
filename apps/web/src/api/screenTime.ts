// API client for screen-time endpoints
import { GrantCommand } from '../../../api/src/modules/screen-time/screen-time.types';

const BASE_URL = '/api/screen-time';

export async function connectAccount(provider: 'APPLE' | 'GOOGLE') {
  const res = await fetch(`${BASE_URL}/connect/${provider}`, { method: 'POST' });
  return res.json();
}

export async function fetchChildren() {
  const res = await fetch(`${BASE_URL}/children`);
  return res.json();
}

export async function grantScreenTime(cmd: { childId: string; minutesDelta: number; idempotencyKey?: string }) {
  const res = await fetch(`${BASE_URL}/grants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd)
  });
  return res.json();
}

export async function fetchLedger(childId: string) {
  const res = await fetch(`${BASE_URL}/ledger?childId=${encodeURIComponent(childId)}`);
  return res.json();
}
