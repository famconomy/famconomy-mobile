/**
 * approvalService.ts
 * Service for handling parent approvals of child requests
 * Integrates with FamilyControlsClient and REST API
 */

import FamilyControlsBridge from '../api/FamilyControlsBridge';
import { FamilyControlsClient } from '../api/FamilyControlsClient';

export interface ApprovalRequest {
  id: string;
  childId: string;
  requestType: 'screen_time' | 'app_access' | 'device_unlock';
  data: {
    durationMinutes?: number;
    appBundleId?: string;
    reason?: string;
  };
  createdAt: number;
  expiresAt: number;
}

export interface ApprovalResponse {
  id: string;
  approved: boolean;
  approvedBy: string;
  approvedAt: number;
  effectiveUntil?: number;
}

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
const APPROVALS_ENDPOINT = `${API_BASE}/family-controls/approvals`;

/**
 * Fetch pending approvals for current parent
 */
export async function getPendingApprovals(familyId: string): Promise<ApprovalRequest[]> {
  try {
    const response = await fetch(`${APPROVALS_ENDPOINT}?status=pending&familyId=${familyId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error('Failed to fetch pending approvals:', err);
    throw err;
  }
}

/**
 * Approve a child request
 * Syncs approval with native Family Controls and backend ledger
 */
export async function approveRequest(
  requestId: string,
  approval: Omit<ApprovalResponse, 'id'>
): Promise<ApprovalResponse> {
  try {
    // 1. Call backend API to record approval
    const response = await fetch(`${APPROVALS_ENDPOINT}/${requestId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
      },
      body: JSON.stringify(approval),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result: ApprovalResponse = await response.json();

    // 2. Sync with native Family Controls
    try {
      // TODO: Call native module to apply changes
      // await FamilyControlsBridge.applyApproval(requestId);
    } catch (err) {
      console.warn('Failed to sync with native module:', err);
    }

    return result;
  } catch (err) {
    console.error('Failed to approve request:', err);
    throw err;
  }
}

/**
 * Reject a child request
 */
export async function rejectRequest(
  requestId: string,
  reason?: string
): Promise<void> {
  try {
    const response = await fetch(`${APPROVALS_ENDPOINT}/${requestId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
      },
      body: JSON.stringify({ reason }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (err) {
    console.error('Failed to reject request:', err);
    throw err;
  }
}

/**
 * Get approval history for a child
 */
export async function getApprovalHistory(
  childId: string,
  limit: number = 50
): Promise<ApprovalResponse[]> {
  try {
    const response = await fetch(
      `${APPROVALS_ENDPOINT}/history?childId=${childId}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error('Failed to fetch approval history:', err);
    throw err;
  }
}

/**
 * Update screen time schedule for child via Family Controls
 */
export async function updateScreenTimeSchedule(
  childId: string,
  schedule: {
    dailyLimit: number;
    startTime: string;
    endTime: string;
    categories?: string[];
  }
): Promise<void> {
  try {
    // 1. Update via native Family Controls
    try {
      // TODO: Call native module
      // await FamilyControlsBridge.setScreenTimeSchedule({
      //   userId: childId,
      //   dailyLimitMinutes: schedule.dailyLimit,
      //   startTime: schedule.startTime,
      //   endTime: schedule.endTime,
      // });
    } catch (err) {
      console.warn('Failed to update via native module:', err);
    }

    // 2. Persist to backend
    const response = await fetch(`${API_BASE}/family-controls/schedules/${childId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
      },
      body: JSON.stringify(schedule),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (err) {
    console.error('Failed to update screen time schedule:', err);
    throw err;
  }
}

/**
 * Block app on child device via Family Controls
 */
export async function blockAppOnDevice(
  childId: string,
  bundleId: string,
  reason?: string
): Promise<void> {
  try {
    // 1. Call native Family Controls
    try {
      // TODO: Call native module
      // await FamilyControlsBridge.blockApplication({
      //   bundleId,
      //   reason,
      // });
    } catch (err) {
      console.warn('Failed to block app via native module:', err);
    }

    // 2. Log to backend
    const response = await fetch(`${API_BASE}/family-controls/device-policies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
      },
      body: JSON.stringify({
        childId,
        policyType: 'app_block',
        bundleId,
        reason,
        appliedAt: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (err) {
    console.error('Failed to block app:', err);
    throw err;
  }
}

/**
 * Unlock device for child via Family Controls
 */
export async function unlockDeviceTemporarily(
  childId: string,
  durationMinutes: number
): Promise<void> {
  try {
    // 1. Call native Family Controls
    try {
      // TODO: Call native module
      // await FamilyControlsBridge.unlockDeviceTemporarily({
      //   durationMinutes,
      // });
    } catch (err) {
      console.warn('Failed to unlock device via native module:', err);
    }

    // 2. Log to backend
    const response = await fetch(`${API_BASE}/family-controls/device-unlock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
      },
      body: JSON.stringify({
        childId,
        durationMinutes,
        unlockedAt: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (err) {
    console.error('Failed to unlock device:', err);
    throw err;
  }
}
