/**
 * requestService.ts
 * Service for handling child device requests to parents
 */

export interface ChildRequest {
  id: string;
  childId: string;
  type: 'screen_time' | 'app_access' | 'device_unlock';
  description: string;
  data: {
    durationMinutes?: number;
    appBundleId?: string;
    reason?: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  respondedAt?: number;
  expiresAt: number;
}

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
const REQUESTS_ENDPOINT = `${API_BASE}/family-controls/child-requests`;

/**
 * Submit a request from child to parent
 */
export async function submitRequest(
  childId: string,
  type: 'screen_time' | 'app_access' | 'device_unlock',
  data: {
    durationMinutes?: number;
    appBundleId?: string;
    reason?: string;
  }
): Promise<ChildRequest> {
  try {
    const response = await fetch(REQUESTS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
      },
      body: JSON.stringify({
        childId,
        type,
        data,
        createdAt: Date.now(),
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error('Failed to submit request:', err);
    throw err;
  }
}

/**
 * Get pending requests for current child
 */
export async function getPendingRequests(childId: string): Promise<ChildRequest[]> {
  try {
    const response = await fetch(
      `${REQUESTS_ENDPOINT}?childId=${childId}&status=pending`,
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
    console.error('Failed to fetch pending requests:', err);
    throw err;
  }
}

/**
 * Get all requests (pending + history) for a child
 */
export async function getAllRequests(childId: string): Promise<ChildRequest[]> {
  try {
    const response = await fetch(`${REQUESTS_ENDPOINT}?childId=${childId}`, {
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
    console.error('Failed to fetch requests:', err);
    throw err;
  }
}

/**
 * Get request status by ID
 */
export async function getRequestStatus(requestId: string): Promise<ChildRequest> {
  try {
    const response = await fetch(`${REQUESTS_ENDPOINT}/${requestId}`, {
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
    console.error('Failed to fetch request status:', err);
    throw err;
  }
}

/**
 * Cancel a pending request
 */
export async function cancelRequest(requestId: string): Promise<void> {
  try {
    const response = await fetch(`${REQUESTS_ENDPOINT}/${requestId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (err) {
    console.error('Failed to cancel request:', err);
    throw err;
  }
}
