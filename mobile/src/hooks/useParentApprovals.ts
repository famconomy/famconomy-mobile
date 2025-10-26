/**
 * useParentApprovals.ts
 * React hook for managing parent approval workflows
 * Handles fetching, approving, and rejecting child requests
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  getPendingApprovals,
  approveRequest as apiApproveRequest,
  rejectRequest as apiRejectRequest,
  getApprovalHistory,
  ApprovalRequest,
  ApprovalResponse,
} from '../services/approvalService';

export interface UseParentApprovalsReturn {
  pendingApprovals: ApprovalRequest[];
  history: ApprovalResponse[];
  loading: boolean;
  error: string | null;
  approvingId: string | null;
  rejectingId: string | null;
  approveRequest: (requestId: string, effectiveUntil?: number) => Promise<void>;
  rejectRequest: (requestId: string, reason?: string) => Promise<void>;
  refreshPending: () => Promise<void>;
  refreshHistory: () => Promise<void>;
}

export function useParentApprovals(familyId: string): UseParentApprovalsReturn {
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);
  const [history, setHistory] = useState<ApprovalResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch pending approvals
   */
  const refreshPending = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const approvals = await getPendingApprovals(familyId);
      setPendingApprovals(approvals);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  }, [familyId]);

  /**
   * Fetch approval history for all children
   */
  const refreshHistory = useCallback(async () => {
    try {
      // TODO: Get list of children first, then fetch history for each
      // For now, fetch a generic history
      // const hist = await getApprovalHistory('all');
      // setHistory(hist);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  }, []);

  /**
   * Approve a request
   */
  const approveRequest = useCallback(
    async (requestId: string, effectiveUntil?: number) => {
      try {
        setApprovingId(requestId);
        const approval = await apiApproveRequest(requestId, {
          approved: true,
          approvedBy: 'current-user', // TODO: Get from auth context
          approvedAt: Date.now(),
          effectiveUntil,
        });

        // Remove from pending
        setPendingApprovals((prev) => prev.filter((a) => a.id !== requestId));

        // Add to history
        setHistory((prev) => [approval, ...prev]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to approve request');
        throw err;
      } finally {
        setApprovingId(null);
      }
    },
    []
  );

  /**
   * Reject a request
   */
  const rejectRequest = useCallback(async (requestId: string, reason?: string) => {
    try {
      setRejectingId(requestId);
      await apiRejectRequest(requestId, reason);

      // Remove from pending
      setPendingApprovals((prev) => prev.filter((a) => a.id !== requestId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject request');
      throw err;
    } finally {
      setRejectingId(null);
    }
  }, []);

  /**
   * Initial load and polling setup
   */
  useEffect(() => {
    if (!familyId) return;

    refreshPending();
    refreshHistory();

    // Set up polling - check for new approvals every 30 seconds
    pollIntervalRef.current = setInterval(() => {
      refreshPending();
    }, 30000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [familyId, refreshPending, refreshHistory]);

  return {
    pendingApprovals,
    history,
    loading,
    error,
    approvingId,
    rejectingId,
    approveRequest,
    rejectRequest,
    refreshPending,
    refreshHistory,
  };
}
