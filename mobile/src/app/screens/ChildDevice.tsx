/**
 * ChildDevice.tsx
 * Child-focused screen showing device status, screen time, and request functionality
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  SafeAreaView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { DeviceStatus } from '../components/DeviceStatus';
import { PendingRequests } from '../components/PendingRequests';

interface DeviceInfo {
  id: string;
  name: string;
  model: string;
  osVersion: string;
  isLocked: boolean;
  screenTimeToday: number;
  screenTimeLimit: number;
  lastSync: number;
}

interface Request {
  id: string;
  type: 'screen_time' | 'app_access' | 'device_unlock';
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  respondedAt?: number;
}

interface ChildDeviceProps {
  childId?: string;
}

export const ChildDevice: React.FC<ChildDeviceProps> = ({ childId }) => {
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState<string | null>(null);

  const loadDeviceData = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      // TODO: Call API to fetch device data
      // const response = await getChildDevice(childId);
      // setDevice(response.device);
      // setRequests(response.requests);

      // Mock data for now
      setDevice({
        id: 'device-1',
        name: 'Emma\'s iPhone',
        model: 'iPhone 14',
        osVersion: '17.0.1',
        isLocked: false,
        screenTimeToday: 45,
        screenTimeLimit: 120,
        lastSync: Date.now() - 2 * 60 * 1000,
      });

      setRequests([
        {
          id: '1',
          type: 'screen_time',
          description: 'Requesting 30 additional minutes',
          status: 'pending',
          createdAt: Date.now() - 10 * 60 * 1000,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load device');
    } finally {
      setLoading(false);
    }
  }, [childId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDeviceData();
    setRefreshing(false);
  }, [loadDeviceData]);

  const handleSubmitRequest = useCallback(
    async (type: 'screen_time' | 'app_access' | 'device_unlock', description: string) => {
      try {
        setSubmittingRequest(type);
        // TODO: Call API to submit request
        // await submitRequest(childId, type, description);
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Add to requests list
        const newRequest: Request = {
          id: Math.random().toString(36),
          type,
          description,
          status: 'pending',
          createdAt: Date.now(),
        };
        setRequests((prev) => [newRequest, ...prev]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to submit request');
      } finally {
        setSubmittingRequest(null);
      }
    },
    [childId]
  );

  useEffect(() => {
    loadDeviceData();
  }, [loadDeviceData]);

  if (loading && !device) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading device info...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>My Device</Text>
            <Text style={styles.subtitle}>
              {device?.name || 'Unknown Device'}
            </Text>
          </View>

          {/* Error Banner */}
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={loadDeviceData}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Device Status */}
          {device && (
            <View style={styles.section}>
              <DeviceStatus device={device} onRefresh={loadDeviceData} />
            </View>
          )}

          {/* Request Screen Time Button */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() =>
                handleSubmitRequest(
                  'screen_time',
                  'Requesting 30 additional minutes'
                )
              }
              disabled={submittingRequest === 'screen_time'}
            >
              {submittingRequest === 'screen_time' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.actionButtonIcon}>⏱️</Text>
                  <View style={styles.actionButtonText}>
                    <Text style={styles.actionButtonTitle}>
                      Request Screen Time
                    </Text>
                    <Text style={styles.actionButtonDesc}>
                      Ask for more time before limit
                    </Text>
                  </View>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Request App Access Button */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() =>
                handleSubmitRequest('app_access', 'Requesting app access')
              }
              disabled={submittingRequest === 'app_access'}
            >
              {submittingRequest === 'app_access' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.actionButtonIcon}>📱</Text>
                  <View style={styles.actionButtonText}>
                    <Text style={styles.actionButtonTitle}>
                      Request App Access
                    </Text>
                    <Text style={styles.actionButtonDesc}>
                      Ask to unlock a blocked app
                    </Text>
                  </View>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Pending Requests */}
          {requests.length > 0 && (
            <View style={styles.section}>
              <PendingRequests requests={requests} />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#991b1b',
    fontSize: 13,
    flex: 1,
  },
  retryText: {
    color: '#991b1b',
    fontWeight: '600',
    marginLeft: 12,
  },
  section: {
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButtonIcon: {
    fontSize: 24,
  },
  actionButtonText: {
    flex: 1,
  },
  actionButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  actionButtonDesc: {
    fontSize: 12,
    color: '#dbeafe',
  },
});
