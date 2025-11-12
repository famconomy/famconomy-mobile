/**
 * ParentDashboard.tsx
 * Parent-focused dashboard for managing children's devices and approvals
 * Mirrors web app DashboardPage logic
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
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useFamily } from '../../hooks/useFamily';
import { ChildCard } from '../components/ChildCard';
import { ScreenTimeSummary } from '../components/ScreenTimeSummary';
import { ApprovalQueue } from '../components/ApprovalQueue';
import { DashboardHeader } from '../components/DashboardHeader';

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

interface DashboardStats {
  totalChildren: number;
  activeDevices: number;
  pendingApprovals: number;
  screenTimeWarnings: number;
}

export const ParentDashboard: React.FC = () => {
  const { user } = useAuth();
  const { family } = useFamily();

  const quickActions = [
    { label: 'Add Child', icon: '➕', onPress: () => {} },
    { label: 'Lock Devices', icon: '🔒', onPress: () => {} },
    { label: 'Schedule Pause', icon: '🕒', onPress: () => {} },
  ];

  interface StatCardProps {
    label: string;
    value: number;
    highlight?: boolean;
  }

  const StatCard: React.FC<StatCardProps> = ({ label, value, highlight }) => (
    <View style={[styles.statCard, highlight && styles.statCardHighlight]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const [children, setChildren] = useState<ChildSummary[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalChildren: 0,
    activeDevices: 0,
    pendingApprovals: 0,
    screenTimeWarnings: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Load children data and current stats
   */
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Call API to fetch children and their current status
      // const response = await getParentDashboardData(familyId);
      // setChildren(response.children);
      // setStats(response.stats);

      // Mock data for now
      setChildren([
        {
          id: '1',
          name: 'Emma Johnson',
          role: 'child',
          deviceStatus: 'online',
          screenTimeToday: 45,
          screenTimeLimit: 120,
          pendingApprovals: 2,
          lastActive: Date.now() - 5 * 60 * 1000, // 5 min ago
        },
        {
          id: '2',
          name: 'Liam Johnson',
          role: 'child',
          deviceStatus: 'offline',
          screenTimeToday: 120,
          screenTimeLimit: 120,
          pendingApprovals: 0,
          lastActive: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
        },
      ]);

      setStats({
        totalChildren: 2,
        activeDevices: 1,
        pendingApprovals: 2,
        screenTimeWarnings: 1,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [family?.id]);

  /**
   * Handle pull-to-refresh
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, [loadDashboardData]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Check if parent role
  const isParent = user?.role === 'parent' || user?.role === 'guardian';

  if (!isParent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>
            This dashboard is only available for parents
          </Text>
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
          <DashboardHeader
            title="Parent Dashboard"
            subtitle={`Welcome back, ${user?.firstName || 'Parent'}`}
          />

          <View style={styles.heroCard}>
            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>Today’s snapshot</Text>
              <Text style={styles.heroSubtitle}>
                Monitor activity across your family devices at a glance.
              </Text>
            </View>

            <View style={styles.statGrid}>
              <StatCard label="Children" value={stats.totalChildren} />
              <StatCard label="Active" value={stats.activeDevices} />
              <StatCard
                label="Approvals"
                value={stats.pendingApprovals}
                highlight={stats.pendingApprovals > 0}
              />
              <StatCard
                label="Warnings"
                value={stats.screenTimeWarnings}
                highlight={stats.screenTimeWarnings > 0}
              />
            </View>

            <View style={styles.quickActions}>
              {quickActions.map((action) => (
                <QuickActionButton
                  key={action.label}
                  label={action.label}
                  icon={action.icon}
                  onPress={action.onPress}
                />
              ))}
            </View>
          </View>

          {/* Error State */}
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
              <TouchableOpacity
                onPress={loadDashboardData}
                style={styles.retryButton}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Approval Queue */}
          {stats.pendingApprovals > 0 && (
            <View style={styles.sectionCard}>
              <ApprovalQueue
                pendingCount={stats.pendingApprovals}
                onApprovalAction={loadDashboardData}
              />
            </View>
          )}

          {/* Screen Time Summary */}
          <View style={styles.sectionCard}>
            <ScreenTimeSummary children={children} />
          </View>

          {/* Children List */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Managed Devices</Text>
            {children.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  No children added yet
                </Text>
              </View>
            ) : (
              children.map((child) => (
                <ChildCard
                  key={child.id}
                  child={child}
                  onPress={() => {
                    // Navigate to child details
                    // navigate('ChildDevice', { childId: child.id });
                  }}
                />
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// StatCard already declared above; remove duplicate

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 36,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
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
  errorBannerText: {
    color: '#991b1b',
    fontSize: 14,
    flex: 1,
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#991b1b',
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  heroText: {
    marginBottom: 18,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  statCardHighlight: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 12,
    color: '#475569',
    letterSpacing: 0.3,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9ca3af',
  },
});

// Duplicate StatCard removed

interface QuickActionButtonProps {
  label: string;
  icon: string;
  onPress: () => void;
}

const QuickActionButton: React.FC<QuickActionButtonProps> = ({
  label,
  icon,
  onPress,
}) => (
  <TouchableOpacity
    style={quickActionStyles.button}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={quickActionStyles.icon}>{icon}</Text>
    <Text style={quickActionStyles.label}>{label}</Text>
  </TouchableOpacity>
);

const quickActionStyles = StyleSheet.create({
  button: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 110,
    backgroundColor: '#eef2ff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  icon: {
    fontSize: 18,
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3730a3',
  },
});
