import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { useDashboard } from '../../hooks/useDashboard';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Alert } from '../../components/ui/Alert';
import { StatsWidget } from '../../components/dashboard/StatsWidget';
import { ActivityFeed } from '../../components/dashboard/ActivityFeed';
import { Leaderboard } from '../../components/dashboard/Leaderboard';
import { spacing, lightTheme, darkTheme, fontSize, fontWeight } from '../../theme';

const DashboardScreen: React.FC = () => {
  // Using light theme by default - can add theme context later if needed
  const theme = 'light';
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const isDark = theme === 'dark';
  const themeColors = isDark ? darkTheme : lightTheme;

  console.log('DashboardScreen rendering for user:', user?.email, 'role:', user?.role);

  // Fetch dashboard data with auto-refresh every 60 seconds
  const {
    data,
    stats,
    activity,
    leaderboard,
    isLoading,
    error,
    refetch,
  } = useDashboard({
    familyId: undefined, // Will be fetched from API based on authenticated user
    autoRefresh: true,
    refreshInterval: 60000,
  });

  // Refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  if (isLoading && !data) {
    return <LoadingSpinner isDark={isDark} message="Loading dashboard..." />;
  }

  const firstName = user?.full_name?.split(' ')[0] || user?.firstName || 'Guest';
  const familyName = data?.familyName;
  const greeting = familyName ? `${familyName} Family` : 'FamConomy';
  const isChild = user?.role === 'child';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={themeColors.primary}
        />
      }
    >
      {/* Header Section */}
      <View style={styles.headerSection}>
        <Text variant="h1" isDark={isDark} weight="bold">
          {isChild ? `Hi, ${firstName}! 👋` : `Welcome, ${firstName}`}
        </Text>
        <Text
          variant="body"
          color="textSecondary"
          isDark={isDark}
          style={styles.headerSubtitle}
        >
          {isChild 
            ? "Let's check your tasks and have a great day!"
            : greeting
          }
        </Text>
      </View>

      {/* Error Alert */}
      {error && (
        <Alert
          type="warning"
          title="Unable to Load Some Data"
          message={error.message}
          isDark={isDark}
          style={styles.errorAlert}
        />
      )}

      {/* Family Mantra Section */}
      {data?.familyMantra && (
        <Card isDark={isDark} style={styles.mantraCard}>
          <Text variant="label" color="textSecondary" isDark={isDark}>
            Family Mantra
          </Text>
          <Text
            variant="h4"
            isDark={isDark}
            weight="semibold"
            style={styles.mantraText}
          >
            "{data.familyMantra}"
          </Text>
        </Card>
      )}

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <StatsWidget
            title="Upcoming Events"
            value={data?.upcomingEvents || 0}
            icon="📅"
            color="primary"
            isDark={isDark}
            style={styles.statWidget}
          />
          <StatsWidget
            title="Pending Tasks"
            value={data?.pendingTasks || 0}
            icon="✓"
            color="success"
            isDark={isDark}
            style={styles.statWidget}
          />
        </View>

        <View style={styles.statsRow}>
          <StatsWidget
            title="Messages"
            value={data?.unreadMessages || 0}
            icon="💬"
            color="secondary"
            isDark={isDark}
            style={styles.statWidget}
          />
          <StatsWidget
            title="Active Members"
            value={data?.activeMembers || 0}
            icon="👥"
            color="primary"
            isDark={isDark}
            style={styles.statWidget}
          />
        </View>
      </View>

      {/* Family Values Carousel */}
      {data?.familyValues && data.familyValues.length > 0 && (
        <Card isDark={isDark} style={styles.valuesCard}>
          <Text variant="label" color="textSecondary" isDark={isDark}>
            Family Values
          </Text>
          <View style={styles.valuesList}>
            {data.familyValues.map((value, index) => (
              <View
                key={index}
                style={[
                  styles.valueBadge,
                  {
                    backgroundColor: themeColors.primaryLight,
                    borderColor: themeColors.primary,
                  },
                ]}
              >
                <Text
                  variant="label"
                  color="primary"
                  isDark={isDark}
                  style={styles.valueBadgeText}
                >
                  {value}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {/* Activity Feed Section */}
      {activity.length > 0 && (
        <View style={styles.section}>
          <Text variant="h3" isDark={isDark} weight="bold" style={styles.sectionTitle}>
            Recent Activity
          </Text>
          <ActivityFeed activities={activity} isDark={isDark} />
        </View>
      )}

      {/* Leaderboard Section */}
      {leaderboard.length > 0 && (
        <View style={styles.section}>
          <Text variant="h3" isDark={isDark} weight="bold" style={styles.sectionTitle}>
            Family Leaderboard
          </Text>
          <Leaderboard entries={leaderboard} isDark={isDark} maxItems={10} />
        </View>
      )}

      {/* Footer Spacing */}
      <View style={styles.footer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSection: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },
  headerSubtitle: {
    marginTop: spacing[1],
  },
  errorAlert: {
    marginHorizontal: spacing[4],
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  mantraCard: {
    marginHorizontal: spacing[4],
    marginVertical: spacing[3],
    paddingVertical: spacing[3],
  },
  mantraText: {
    marginTop: spacing[2],
    fontStyle: 'italic',
  },
  statsGrid: {
    paddingHorizontal: spacing[4],
    marginVertical: spacing[3],
    gap: spacing[3],
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  statWidget: {
    flex: 1,
  },
  valuesCard: {
    marginHorizontal: spacing[4],
    marginVertical: spacing[3],
  },
  valuesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing[3],
    gap: spacing[2],
  },
  valueBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  valueBadgeText: {
    fontSize: fontSize.sm,
  },
  section: {
    paddingHorizontal: spacing[4],
    marginVertical: spacing[4],
  },
  sectionTitle: {
    marginBottom: spacing[3],
  },
  footer: {
    height: spacing[8],
  },
});

export default DashboardScreen;
