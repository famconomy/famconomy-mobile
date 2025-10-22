// React hook for screen-time API integration
import { useState, useCallback } from 'react';
import { connectAccount, fetchChildren, grantScreenTime, fetchLedger } from '../api/screenTime';

export function useScreenTime() {
  const [children, setChildren] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadChildren = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchChildren();
      setChildren(data);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch children');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLedger = useCallback(async (childId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLedger(childId);
      setLedger(data);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch ledger');
    } finally {
      setLoading(false);
    }
  }, []);

  const grant = useCallback(async (childId: string, minutesDelta: number, idempotencyKey?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await grantScreenTime({ childId, minutesDelta, idempotencyKey });
      await loadLedger(childId);
      return result;
    } catch (e: any) {
      setError(e.message || 'Failed to grant screen time');
      throw e;
    } finally {
      setLoading(false);
    }
  }, [loadLedger]);

  const connect = useCallback(async (provider: 'APPLE' | 'GOOGLE') => {
    setLoading(true);
    setError(null);
    try {
      const result = await connectAccount(provider);
      await loadChildren();
      return result;
    } catch (e: any) {
      setError(e.message || 'Failed to connect account');
      throw e;
    } finally {
      setLoading(false);
    }
  }, [loadChildren]);

  return {
    children,
    ledger,
    loading,
    error,
    loadChildren,
    loadLedger,
    grant,
    connect
  };
}
