/**
 * useChildRequests.ts
 * React hook for child device request management
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  submitRequest as apiSubmitRequest,
  getPendingRequests,
  getAllRequests,
  getRequestStatus,
  cancelRequest as apiCancelRequest,
  ChildRequest,
} from '../services/requestService';

export interface UseChildRequestsReturn {
  requests: ChildRequest[];
  pendingRequests: ChildRequest[];
  loading: boolean;
  error: string | null;
  submitting: boolean;
  submitRequest: (
    type: 'screen_time' | 'app_access' | 'device_unlock',
    data: {
      durationMinutes?: number;
      appBundleId?: string;
      reason?: string;
    }
  ) => Promise<ChildRequest>;
  cancelRequest: (requestId: string) => Promise<void>;
  refreshRequests: () => Promise<void>;
}

export function useChildRequests(childId: string): UseChildRequestsReturn {
  const [requests, setRequests] = useState<ChildRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Load all requests
   */
  const refreshRequests = useCallback(async () => {
    if (!childId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getAllRequests(childId);
      setRequests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [childId]);

  /**
   * Submit a new request
   */
  const submitRequest = useCallback(
    async (
      type: 'screen_time' | 'app_access' | 'device_unlock',
      data: {
        durationMinutes?: number;
        appBundleId?: string;
        reason?: string;
      }
    ): Promise<ChildRequest> => {
      try {
        setSubmitting(true);
        setError(null);
        const newRequest = await apiSubmitRequest(childId, type, data);

        // Add to list
        setRequests((prev) => [newRequest, ...prev]);

        return newRequest;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to submit request';
        setError(message);
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [childId]
  );

  /**
   * Cancel a pending request
   */
  const cancelRequest = useCallback(async (requestId: string) => {
    try {
      await apiCancelRequest(requestId);

      // Remove from list
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel request';
      setError(message);
      throw err;
    }
  }, []);

  /**
   * Poll for status updates on pending requests
   */
  useEffect(() => {
    if (!childId) return;

    refreshRequests();

    // Check for updates every 15 seconds
    pollIntervalRef.current = setInterval(async () => {
      try {
        const pending = await getPendingRequests(childId);
        if (pending.length === 0 && requests.some((r) => r.status === 'pending')) {
          // New updates available, refresh all
          await refreshRequests();
        }
      } catch (err) {
        console.warn('Error polling for request updates:', err);
      }
    }, 15000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [childId, requests, refreshRequests]);

  const pendingRequests = requests.filter((r) => r.status === 'pending');

  return {
    requests,
    pendingRequests,
    loading,
    error,
    submitting,
    submitRequest,
    cancelRequest,
    refreshRequests,
  };
}
