/**
 * PendingRequests.tsx
 * Component displaying pending requests from child to parent
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

interface Request {
  id: string;
  type: 'screen_time' | 'app_access' | 'device_unlock';
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  respondedAt?: number;
}

interface PendingRequestsProps {
  requests: Request[];
}

export const PendingRequests: React.FC<PendingRequestsProps> = ({ requests }) => {
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

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'approved':
        return '#d1fae5';
      case 'rejected':
        return '#fee2e2';
      case 'pending':
      default:
        return '#fef3c7';
    }
  };

  const getStatusBorder = (status: string): string => {
    switch (status) {
      case 'approved':
        return '#a7f3d0';
      case 'rejected':
        return '#fca5a5';
      case 'pending':
      default:
        return '#fcd34d';
    }
  };

  const getStatusTextColor = (status: string): string => {
    switch (status) {
      case 'approved':
        return '#065f46';
      case 'rejected':
        return '#7c2d12';
      case 'pending':
      default:
        return '#92400e';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'approved':
        return '✓ Approved';
      case 'rejected':
        return '✗ Rejected';
      case 'pending':
      default:
        return '⏳ Pending';
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const otherRequests = requests.filter((r) => r.status !== 'pending');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Requests</Text>

      {pendingRequests.length === 0 && otherRequests.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No requests yet</Text>
        </View>
      ) : (
        <>
          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pending</Text>
              {pendingRequests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </View>
          )}

          {/* Other Requests */}
          {otherRequests.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>History</Text>
              {otherRequests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
};

interface RequestCardProps {
  request: Request;
}

const RequestCard: React.FC<RequestCardProps> = ({ request }) => {
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

  const statusBgColor = {
    approved: '#d1fae5',
    rejected: '#fee2e2',
    pending: '#fef3c7',
  }[request.status];

  const statusBorderColor = {
    approved: '#a7f3d0',
    rejected: '#fca5a5',
    pending: '#fcd34d',
  }[request.status];

  const statusTextColor = {
    approved: '#065f46',
    rejected: '#7c2d12',
    pending: '#92400e',
  }[request.status];

  const statusLabel = {
    approved: '✓ Approved',
    rejected: '✗ Rejected',
    pending: '⏳ Pending',
  }[request.status];

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: statusBgColor, borderColor: statusBorderColor },
      ]}
    >
      <View style={styles.cardContent}>
        <Text style={styles.requestIcon}>{getRequestIcon(request.type)}</Text>
        <View style={styles.cardText}>
          <Text style={styles.requestType}>{getRequestLabel(request.type)}</Text>
          <Text style={styles.requestDesc}>{request.description}</Text>
          <Text style={styles.requestTime}>
            {formatTimeAgo(request.createdAt)}
          </Text>
        </View>
      </View>
      <Text style={[styles.statusLabel, { color: statusTextColor }]}>
        {statusLabel}
      </Text>
    </View>
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
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 13,
    color: '#9ca3af',
  },
  card: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 12,
  },
  requestIcon: {
    fontSize: 20,
    marginTop: 2,
  },
  cardText: {
    flex: 1,
  },
  requestType: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  requestDesc: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 4,
  },
  requestTime: {
    fontSize: 11,
    color: '#6b7280',
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 8,
  },
});
