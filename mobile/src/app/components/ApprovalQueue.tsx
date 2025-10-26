/**
 * ApprovalQueue.tsx
 * Component for viewing and managing pending child approvals
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';

interface PendingApproval {
  id: string;
  childName: string;
  requestType: 'screen_time' | 'app_access' | 'device_unlock';
  description: string;
  timestamp: number;
}

interface ApprovalQueueProps {
  pendingCount: number;
  onApprovalAction?: () => void;
}

export const ApprovalQueue: React.FC<ApprovalQueueProps> = ({
  pendingCount,
  onApprovalAction,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [approvals, setApprovals] = useState<PendingApproval[]>([
    {
      id: '1',
      childName: 'Emma',
      requestType: 'screen_time',
      description: 'Requesting 30 additional minutes of screen time',
      timestamp: Date.now() - 10 * 60 * 1000,
    },
    {
      id: '2',
      childName: 'Liam',
      requestType: 'app_access',
      description: 'Requesting access to Instagram',
      timestamp: Date.now() - 30 * 60 * 1000,
    },
  ]);
  const [approving, setApproving] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    try {
      setApproving(id);
      // TODO: Call approval API
      // await approveRequest(id);
      await new Promise((resolve) => setTimeout(resolve, 500));
      setApprovals((prev) => prev.filter((a) => a.id !== id));
      onApprovalAction?.();
    } catch (err) {
      Alert.alert('Error', 'Failed to approve request');
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (id: string) => {
    try {
      setApproving(id);
      // TODO: Call rejection API
      // await rejectRequest(id);
      await new Promise((resolve) => setTimeout(resolve, 500));
      setApprovals((prev) => prev.filter((a) => a.id !== id));
      onApprovalAction?.();
    } catch (err) {
      Alert.alert('Error', 'Failed to reject request');
    } finally {
      setApproving(null);
    }
  };

  const getRequestIcon = (type: string): string => {
    switch (type) {
      case 'screen_time':
        return '⏱️';
      case 'app_access':
        return '📱';
      case 'device_unlock':
        return '🔓';
      default:
        return '❓';
    }
  };

  const getRequestLabel = (type: string): string => {
    switch (type) {
      case 'screen_time':
        return 'Screen Time Request';
      case 'app_access':
        return 'App Access Request';
      case 'device_unlock':
        return 'Device Unlock Request';
      default:
        return 'Request';
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerContent}>
          <Text style={styles.icon}>📋</Text>
          <View style={styles.headerText}>
            <Text style={styles.title}>Approval Queue</Text>
            <Text style={styles.subtitle}>
              {pendingCount} pending request{pendingCount !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        <Text style={styles.expandIcon}>{expanded ? '−' : '+'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.content}>
          {approvals.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>All approvals are up to date!</Text>
            </View>
          ) : (
            approvals.map((approval) => (
              <View key={approval.id} style={styles.approvalItem}>
                <View style={styles.approvalHeader}>
                  <View style={styles.approvalTitle}>
                    <Text style={styles.approvalIcon}>
                      {getRequestIcon(approval.requestType)}
                    </Text>
                    <View style={styles.approvalTitleText}>
                      <Text style={styles.approvalType}>
                        {getRequestLabel(approval.requestType)}
                      </Text>
                      <Text style={styles.approvalChild}>from {approval.childName}</Text>
                    </View>
                  </View>
                  <Text style={styles.approvalTime}>
                    {formatTimeAgo(approval.timestamp)}
                  </Text>
                </View>

                <Text style={styles.approvalDescription}>
                  {approval.description}
                </Text>

                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.button, styles.rejectButton]}
                    onPress={() => handleReject(approval.id)}
                    disabled={approving === approval.id}
                  >
                    {approving === approval.id ? (
                      <ActivityIndicator size="small" color="#991b1b" />
                    ) : (
                      <Text style={styles.rejectButtonText}>Reject</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.approveButton]}
                    onPress={() => handleApprove(approval.id)}
                    disabled={approving === approval.id}
                  >
                    {approving === approval.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.approveButtonText}>Approve</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );
};

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(diff / 86400000)}d`;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde047',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: 20,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  expandIcon: {
    fontSize: 20,
    color: '#6b7280',
    fontWeight: '600',
  },
  content: {
    borderTopWidth: 1,
    borderTopColor: '#fde047',
    paddingBottom: 0,
  },
  empty: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
  },
  approvalItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#fde047',
  },
  approvalHeader: {
    marginBottom: 12,
  },
  approvalTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  approvalIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  approvalTitleText: {
    flex: 1,
  },
  approvalType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  approvalChild: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  approvalTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  approvalDescription: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 12,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  rejectButtonText: {
    color: '#991b1b',
    fontWeight: '600',
    fontSize: 13,
  },
  approveButton: {
    backgroundColor: '#3b82f6',
  },
  approveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
});
