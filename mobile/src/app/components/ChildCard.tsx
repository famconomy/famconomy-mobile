/**
 * ChildCard.tsx
 * Child device card component showing status and screen time
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';

export interface ChildSummary {
  id: string;
  name: string;
  avatar?: string;
  role: 'child' | 'guardian' | 'parent';
  deviceStatus: 'online' | 'offline' | 'locked';
  screenTimeToday: number;
  screenTimeLimit: number;
  pendingApprovals: number;
  lastActive?: number;
}

interface ChildCardProps {
  child: ChildSummary;
  onPress: () => void;
}

export const ChildCard: React.FC<ChildCardProps> = ({ child, onPress }) => {
  const screenTimePercentage = (child.screenTimeToday / child.screenTimeLimit) * 100;
  const isOverLimit = screenTimePercentage > 100;
  const statusColor = {
    online: '#10b981',
    offline: '#6b7280',
    locked: '#ef4444',
  }[child.deviceStatus];

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.childInfo}>
          {child.avatar && (
            <Image
              source={{ uri: child.avatar }}
              style={styles.avatar}
            />
          )}
          <View>
            <Text style={styles.childName}>{child.name}</Text>
            <View style={styles.statusBadge}>
              <View
                style={[
                  styles.statusIndicator,
                  { backgroundColor: statusColor },
                ]}
              />
              <Text style={styles.statusText}>
                {child.deviceStatus === 'locked'
                  ? 'Device Locked'
                  : child.deviceStatus === 'online'
                  ? 'Active'
                  : 'Offline'}
              </Text>
            </View>
          </View>
        </View>

        {child.pendingApprovals > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{child.pendingApprovals}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardBody}>
        <View style={styles.screenTimeContainer}>
          <View style={styles.screenTimeText}>
            <Text style={styles.screenTimeLabel}>Screen Time</Text>
            <Text style={styles.screenTimeValue}>
              {child.screenTimeToday}m / {child.screenTimeLimit}m
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
          <Text style={styles.progressText}>
            {screenTimePercentage > 100
              ? `${Math.round(screenTimePercentage - 100)}% over limit`
              : `${Math.round(100 - screenTimePercentage)}% remaining`}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.lastActiveText}>
          {child.lastActive
            ? `Last active ${formatTimeAgo(child.lastActive)}`
            : 'Never active'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  childInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: '#f3f4f6',
  },
  childName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#6b7280',
  },
  badge: {
    backgroundColor: '#fef08a',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7c2d12',
  },
  cardBody: {
    padding: 16,
  },
  screenTimeContainer: {
    gap: 8,
  },
  screenTimeText: {
    marginBottom: 8,
  },
  screenTimeLabel: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  screenTimeValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarOverLimit: {
    backgroundColor: '#fee2e2',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
  },
  cardFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  lastActiveText: {
    fontSize: 12,
    color: '#9ca3af',
  },
});
