/**
 * useFamilyControls.ts
 * Custom React hooks for Family Controls module
 * 
 * Provides convenient hooks for screen time, device status, authorization, etc.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import FamilyControlsBridge, {
  ScreenTimeData,
  DeviceStatus,
  AuthStatus,
  Subscription,
  FamilyControlsResponse,
} from '../api/FamilyControlsBridge';

// MARK: - useScreenTime Hook

export function useScreenTime(userId: string | null) {
  const [data, setData] = useState<ScreenTimeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const loadScreenTime = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await FamilyControlsBridge.getScreenTimeInfo(userId);
        if (response.success && response.data) {
          setData(response.data);
        } else {
          setError(response.error || 'Failed to load screen time');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadScreenTime();
  }, [userId]);

  const refreshScreenTime = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const response = await FamilyControlsBridge.getScreenTimeInfo(userId);
      if (response.success && response.data) {
        setData(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return { data, loading, error, refreshScreenTime };
}

// MARK: - useDeviceStatus Hook

export function useDeviceStatus(deviceId: string | null) {
  const [status, setStatus] = useState<DeviceStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<Subscription | null>(null);

  useEffect(() => {
    if (!deviceId) return;

    // Initial fetch
    const fetchStatus = async () => {
      setLoading(true);
      try {
        const response = await FamilyControlsBridge.getDeviceStatus(deviceId);
        if (response.success && response.data) {
          setStatus(response.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();

    // Listen for status changes
    subscriptionRef.current = FamilyControlsBridge.onDeviceStatusChanged(
      (newStatus) => {
        if (newStatus.deviceId === deviceId) {
          setStatus(newStatus);
        }
      }
    );

    return () => {
      subscriptionRef.current?.remove();
    };
  }, [deviceId]);

  return { status, loading, error };
}

// MARK: - useFamilyControls Hook

export function useFamilyControls(familyId: string | null) {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<Subscription | null>(null);

  useEffect(() => {
    if (!familyId) return;

    const loadStatus = async () => {
      setLoading(true);
      try {
        const status = await FamilyControlsBridge.checkAuthorizationStatus(familyId);
        setAuthStatus(status);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadStatus();

    // Listen for authorization changes
    subscriptionRef.current = FamilyControlsBridge.onAuthorizationChanged(
      (data) => {
        if (data.familyId === familyId) {
          setAuthStatus({
            authorized: data.authorized,
            familyId: data.familyId,
            userRole: data.userRole as any,
            canControlOtherDevices: false, // TODO: determine from response
            timestamp: data.timestamp,
          });
        }
      }
    );

    return () => {
      subscriptionRef.current?.remove();
    };
  }, [familyId]);

  const canControl = authStatus
    ? authStatus.userRole === 'parent' || authStatus.userRole === 'admin'
    : false;

  return {
    authorized: authStatus?.authorized ?? false,
    userRole: authStatus?.userRole,
    canControl,
    loading,
    error,
  };
}

// MARK: - useScreenTimeWarnings Hook

export function useScreenTimeWarnings(userId: string | null) {
  const [warnings, setWarnings] = useState<any[]>([]);
  const subscriptionRef = useRef<Subscription | null>(null);

  useEffect(() => {
    if (!userId) return;

    subscriptionRef.current = FamilyControlsBridge.onScreenTimeWarning((data) => {
      if (data.userId === userId) {
        setWarnings((prev) => [...prev, data]);
      }
    });

    return () => {
      subscriptionRef.current?.remove();
    };
  }, [userId]);

  const clearWarnings = useCallback(() => {
    setWarnings([]);
  }, []);

  return { warnings, clearWarnings };
}

// MARK: - useBlockedApps Hook

export function useBlockedApps() {
  const [blockedApps, setBlockedApps] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<Subscription | null>(null);

  useEffect(() => {
    // Initial fetch
    const fetchBlocked = async () => {
      setLoading(true);
      try {
        const response = await FamilyControlsBridge.getBlockedApplications();
        if (response.success && response.data) {
          setBlockedApps(response.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchBlocked();

    // Listen for app block/unblock events
    const blockSub = FamilyControlsBridge.onAppBlocked((data) => {
      setBlockedApps((prev) => {
        if (!prev.includes(data.bundleId)) {
          return [...prev, data.bundleId];
        }
        return prev;
      });
    });

    const unblockSub = FamilyControlsBridge.addListener('APP_UNBLOCKED', (data) => {
      setBlockedApps((prev) => prev.filter((id) => id !== data.bundleId));
    });

    return () => {
      blockSub.remove();
      unblockSub.remove();
    };
  }, []);

  const blockApp = useCallback(async (bundleId: string) => {
    try {
      const response = await FamilyControlsBridge.blockApplication(bundleId);
      return response.success;
    } catch (err) {
      return false;
    }
  }, []);

  const unblockApp = useCallback(async (bundleId: string) => {
    try {
      const response = await FamilyControlsBridge.unblockApplication(bundleId);
      return response.success;
    } catch (err) {
      return false;
    }
  }, []);

  return { blockedApps, loading, error, blockApp, unblockApp };
}

// MARK: - useScreenTimeControl Hook

export function useScreenTimeControl() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setScreenTimeLimit = useCallback(
    async (userId: string, minutes: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await FamilyControlsBridge.setScreenTimeLimit({
          userId,
          minutes,
        });
        return response.success;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const approveAdditionalTime = useCallback(
    async (userId: string, minutes: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await FamilyControlsBridge.approveAdditionalTime({
          userId,
          minutes,
        });
        return response.success;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    setScreenTimeLimit,
    approveAdditionalTime,
    isLoading,
    error,
  };
}

// MARK: - useFamilyControlsErrors Hook

export function useFamilyControlsErrors() {
  const [errors, setErrors] = useState<any[]>([]);
  const subscriptionRef = useRef<Subscription | null>(null);

  useEffect(() => {
    subscriptionRef.current = FamilyControlsBridge.onError((data) => {
      setErrors((prev) => [...prev, data]);
    });

    return () => {
      subscriptionRef.current?.remove();
    };
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const clearError = useCallback((index: number) => {
    setErrors((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return { errors, clearErrors, clearError };
}
