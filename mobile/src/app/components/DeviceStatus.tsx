/**
 * DeviceStatus.tsx
 * Component displaying device information and status
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

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

interface DeviceStatusProps {
  device: DeviceInfo;
  onRefresh: () => void;
}

export const DeviceStatus: React.FC<DeviceStatusProps> = ({ device, onRefresh }) => {
  const screenTimePercentage = (device.screenTimeToday / device.screenTimeLimit) * 100;
  const timeRemaining = device.screenTimeLimit - device.screenTimeToday;
  const isOverLimit = timeRemaining < 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Device Status</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Text style={styles.syncIcon}>🔄</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.deviceInfo}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Device</Text>
          <Text style={styles.value}>{device.model}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>OS</Text>
          <Text style={styles.value}>{device.osVersion}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Status</Text>
          <View style={styles.statusBadge}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: device.isLocked ? '#ef4444' : '#10b981' },
              ]}
            />
            <Text style={styles.statusValue}>
              {device.isLocked ? 'Locked' : 'Unlocked'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.screenTime}>
        <View style={styles.screenTimeHeader}>
          <Text style={styles.screenTimeLabel}>Screen Time Today</Text>
          <Text style={styles.screenTimeValue}>
            {device.screenTimeToday}m / {device.screenTimeLimit}m
          </Text>
        </View>

        <View
          style={[
            styles.progressBar,
            isOverLimit && styles.progressBarOverLimit,
          ]}
        >
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(screenTimePercentage, 100)}%`,
                backgroundColor: isOverLimit ? '#ef4444' : '#3b82f6',
              },
            ]}
          />
        </View>

        <View style={styles.screenTimeFooter}>
          {isOverLimit ? (
            <Text style={styles.overLimitText}>
              ⚠️ Over limit by {Math.abs(timeRemaining)} minutes
            </Text>
          ) : (
            <Text style={styles.remainingText}>
              ✓ {timeRemaining} minutes remaining
            </Text>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.syncText}>
          Last synced {formatTimeAgo(device.lastSync)}
        </Text>
      </View>
    </View>
  );
};

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  syncIcon: {
    fontSize: 18,
  },
  deviceInfo: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
  },
  screenTime: {
    padding: 16,
  },
  screenTimeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  screenTimeLabel: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  screenTimeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarOverLimit: {
    backgroundColor: '#fee2e2',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  screenTimeFooter: {
    paddingTop: 4,
  },
  overLimitText: {
    fontSize: 12,
    color: '#991b1b',
    fontWeight: '500',
  },
  remainingText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  syncText: {
    fontSize: 12,
    color: '#9ca3af',
  },
});
