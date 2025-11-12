import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  CompositeNavigationProp,
} from '@react-navigation/native';
// Navigation types are shimmed; use useNavigation with generic if needed
import { useAuth } from '../../hooks/useAuth';
import { useDashboard } from '../../hooks/useDashboard';
import type {
  DashboardEventPreview,
  DashboardTaskPreview,
  DashboardMessagePreview,
  DashboardMemberPreview,
} from '../../api/dashboard';
import { useFamily } from '../../hooks/useFamily';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Alert } from '../../components/ui/Alert';
import { Toast } from '../../components/ui/Toast';
import { Skeleton, SkeletonRow } from '../../components/ui/Skeleton';
import { StatsWidget } from '../../components/dashboard/StatsWidget';
import { ActivityFeed } from '../../components/dashboard/ActivityFeed';
import { Leaderboard } from '../../components/dashboard/Leaderboard';
import { spacing, lightTheme, darkTheme, fontSize, fontWeight, borderRadius } from '../../theme';
import { JoinByCodeModal } from '../../components/family/JoinByCodeModal';
import { CreateFamilyModal } from '../../components/family/CreateFamilyModal';
import { useDeepLinkStore } from '../../store/deepLinkStore';
import {
  CalendarDays,
  ListTodo,
  MessageCircle,
  Users,
} from 'lucide-react-native';
import type { MainStackParamList, TabParamList } from '../../types';



const DashboardScreen: React.FC = () => {
  // ...existing code...

  // Helper functions (must be after hooks)
  const capitalize = (value?: string | null): string | undefined => {
    if (!value) return undefined;
    return value.charAt(0).toUpperCase() + value.slice(1);
  };
  const formatUpcomingDate = (iso?: string | null): string => {
    if (!iso) return 'Date pending';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return 'Date pending';
    }
    const isoHasTime = iso.includes('T');
    const now = new Date();
    const isSameDay = date.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    const dayFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
    const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
    const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
    if (!isoHasTime) {
      if (isSameDay) return 'Today';
      if (isTomorrow) return 'Tomorrow';
      return dayFormatter.format(date);
    }
    if (isSameDay) {
      return `Today 2 ${timeFormatter.format(date)}`;
    }
    if (isTomorrow) {
      return `Tomorrow 2 ${timeFormatter.format(date)}`;
    }
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays >= 0 && diffDays < 7) {
      return `${weekdayFormatter.format(date)} 2 ${timeFormatter.format(date)}`;
    }
    return `${dayFormatter.format(date)} 2 ${timeFormatter.format(date)}`;
  };
  const formatTimeAgoLabel = (iso?: string | null): string | undefined => {
    if (!iso) return undefined;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return undefined;
    const diffMs = Date.now() - date.getTime();
    if (diffMs < 60000) return 'just now';
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
  };


  // Using light theme by default - can add theme context later if needed
  const theme: string = 'light';
  const isDark = theme === 'dark';
  const themeColors = isDark ? darkTheme : lightTheme;
  const { user } = useAuth();
  const { family, refetchFamily } = useFamily();
  const [toast, setToast] = useState<string | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const consumeInviteToken = useDeepLinkStore((s) => s.consumeInviteToken);
  const [prefillToken, setPrefillToken] = useState<string | undefined>();
  // TODO: Replace with correct navigation type if needed
  const navigation = useNavigation<any>();
  const lastErrorMessageRef = useRef<string | null>(null);


  // Fetch dashboard data with auto-refresh every 60 seconds
  const dashboard = useDashboard({
    familyId: family?.id ? String(family.id) : undefined,
    autoRefresh: true,
    refreshInterval: 60000,
  });

  // Use a more permissive type for dashboard data
  const data = (dashboard.data || {}) as Record<string, any>;
  const activity = dashboard.activity || [];
  const leaderboard = dashboard.leaderboard || [];
  const eventPreviews = dashboard.eventPreviews || [];
  const taskPreviews = dashboard.taskPreviews || [];
  const messagePreviews = dashboard.messagePreviews || [];
  const memberPreviews = dashboard.memberPreviews || [];
  const isLoading = dashboard.isLoading;
  const error = dashboard.error;
  const isRefreshing = dashboard.isRefreshing;
  const refetch = dashboard.refetch;


  // Derived variables (must be after hooks)
  const isChild = user?.role === 'child';
  const firstName = user?.full_name?.split(' ')[0] || user?.firstName || 'Guest';
  const familyName = data?.familyName;
  const greeting = familyName ? `${familyName} Family` : 'FamConomy';
  const nextEvent = eventPreviews[0];
  const nextTask = taskPreviews[0];
  const topUnread = messagePreviews[0];
  // Family values carousel logic
  const familyValues: string[] = Array.isArray(data?.familyValues) ? data.familyValues : [];
  const [currentValueIndex, setCurrentValueIndex] = useState(0);
  const featuredValue = familyValues[currentValueIndex] || '';

  useEffect(() => {
    const token = consumeInviteToken();
    if (token) {
      setPrefillToken(token);
      setShowJoinModal(true);
    }
  }, [consumeInviteToken]);

  console.log('DashboardScreen rendering for user:', user?.email, 'role:', user?.role);


  // (Removed duplicate destructuring of dashboard data)

  // Refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch])
  );
  useEffect(() => {
    if (error?.message) {
      if (lastErrorMessageRef.current !== error.message) {
        setToast(error.message);
        lastErrorMessageRef.current = error.message;
      }
    } else if (!error && lastErrorMessageRef.current) {
      lastErrorMessageRef.current = null;
    }
  }, [error]);

  const handleRefresh = async () => {
    try {
      await refetch();
    } finally {
      // no-op: hook manages isRefreshing state
    }
  };

  if (isLoading && !data && family) {
    // Initial skeletons when we have a family context
    return (
      <View style={{ flex: 1, backgroundColor: themeColors.background }}>
        <ScrollView style={[styles.container]} showsVerticalScrollIndicator={false}>
          <View style={styles.headerSection}>
            <Skeleton width={200} height={28} isDark={isDark} />
            <Skeleton width={240} height={16} isDark={isDark} style={{ marginTop: spacing[2] }} />
          </View>
          <View style={{ paddingHorizontal: spacing[4] }}>
            <View style={{ flexDirection: 'row', gap: spacing[3], marginVertical: spacing[3] }}>
              <Skeleton height={84} style={{ flex: 1 }} isDark={isDark} />
              <Skeleton height={84} style={{ flex: 1 }} isDark={isDark} />
            </View>
            <View style={{ flexDirection: 'row', gap: spacing[3], marginBottom: spacing[4] }}>
              <Skeleton height={84} style={{ flex: 1 }} isDark={isDark} />
              <Skeleton height={84} style={{ flex: 1 }} isDark={isDark} />
            </View>
            <Skeleton width={'60%'} height={18} isDark={isDark} />
            <SkeletonRow count={3} itemHeight={12} isDark={isDark} />
          </View>
          <View style={styles.footer} />
        </ScrollView>
      </View>
    );
  }
  // ...existing code...
  const latestMember = useMemo(() => {
    if (!memberPreviews.length) return null;
    return [...memberPreviews].sort((a, b) => {
      const aTime = a.joinedAt ? new Date(a.joinedAt).getTime() : 0;
      const bTime = b.joinedAt ? new Date(b.joinedAt).getTime() : 0;
      return bTime - aTime;
    })[0];
  }, [memberPreviews]);

  const eventSubtitle = useMemo(() => {
    if (isLoading && !nextEvent) return 'Loading…';
    if (!nextEvent) return 'No events scheduled';
    const schedule = formatUpcomingDate(nextEvent.startTime);
    const location = nextEvent.location ? ` • ${nextEvent.location}` : '';
    return `${schedule}${location}`;
  }, [isLoading, nextEvent]);

  const taskSubtitle = useMemo(() => {
    if (isLoading && !nextTask) return 'Loading…';
    if (!nextTask) return 'No tasks pending';
    const due = nextTask.dueDate ? `Due ${formatUpcomingDate(nextTask.dueDate)}` : 'No due date';
    const assignee = nextTask.assignedToName ? ` • ${nextTask.assignedToName}` : '';
    return `${due}${assignee}`;
  }, [isLoading, nextTask]);

  const messageSubtitle = useMemo(() => {
    if (isLoading && !topUnread) return 'Loading…';
    if (!topUnread) return 'All caught up';
    const count = `${topUnread.unreadCount} unread`;
    const label = topUnread.chatName ? ` • ${topUnread.chatName}` : '';
    return `${count}${label}`;
  }, [isLoading, topUnread]);

  const memberSubtitle = useMemo(() => {
    if (isLoading && !latestMember) return 'Loading…';
    if (!latestMember) return 'Invite your family';
    const name = latestMember.fullName ?? 'Family member';
    const role = latestMember.role ? capitalize(latestMember.role) : undefined;
    const joined = formatTimeAgoLabel(latestMember.joinedAt);
    return [name, role, joined ? `Joined ${joined}` : undefined].filter(Boolean).join(' • ');
  }, [isLoading, latestMember]);

  const quickActions = useMemo(
    () => [
      {
        id: 'calendar',
        label: 'Calendar',
        description: 'Plan the week',
        onPress: () => navigation.navigate('Calendar'),
        icon: CalendarDays,
        accent: themeColors.primary,
        accentLight: themeColors.primaryLight,
      },
      {
        id: 'tasks',
        label: 'Tasks',
        description: isChild ? 'Check your list' : 'Manage chores',
        onPress: () => navigation.navigate('Tasks'),
        icon: ListTodo,
        accent: themeColors.success,
        accentLight: themeColors.successLight,
      },
      {
        id: 'messages',
        label: 'Messages',
        description: 'Catch up',
        onPress: () => navigation.navigate('Messages'),
        icon: MessageCircle,
        accent: themeColors.secondary,
        accentLight: themeColors.secondaryLight,
      },
      {
        id: 'more',
        label: 'Family Hub',
        description: 'Members & more',
        onPress: () => navigation.navigate('More'),
        icon: Users,
        accent: themeColors.accent,
        accentLight: themeColors.accentLight,
      },
    ],
    [
      isChild,
      navigation,
      themeColors.accent,
      themeColors.accentLight,
      themeColors.primary,
      themeColors.primaryLight,
      themeColors.secondary,
      themeColors.secondaryLight,
      themeColors.success,
      themeColors.successLight,
    ],
  );

  const renderPreviewCard = <T,>(
    sectionKey: string,
    title: string,
    items: T[],
    {
      emptyText,
      icon: IconComponent,
      accentColor,
      accentBackground,
      onViewAll,
      onItemPress,
      getId,
      getTitle,
      getLine1,
      getLine2,
    }: {
      emptyText: string;
      icon: React.ComponentType<{ size: number; color: string }>;
      accentColor: string;
      accentBackground: string;
      onViewAll: () => void;
      onItemPress?: (item: T) => void;
      getId: (item: T) => string;
      getTitle: (item: T) => string;
      getLine1?: (item: T) => string | undefined;
      getLine2?: (item: T) => string | undefined;
    },
  ) => (
    <Card key={sectionKey} isDark={isDark} style={styles.previewCard}>
      <View style={styles.previewHeader}>
        <Text variant="h3" isDark={isDark} weight="bold">
          {title}
        </Text>
        <TouchableOpacity onPress={onViewAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.previewLink, { color: accentColor }]}>
            View all
          </Text>
        </TouchableOpacity>
      </View>
      {isLoading && !items.length ? (
        <View style={styles.previewSkeleton}>
          <Skeleton width="75%" height={16} isDark={isDark} />
          <Skeleton width="45%" height={14} isDark={isDark} style={{ marginTop: spacing[1] }} />
        </View>
      ) : items.length ? (
        items.map((item) => {
          const id = getId(item);
          const titleText = getTitle(item);
          const line1 = getLine1?.(item);
          const line2 = getLine2?.(item);
          return (
            <TouchableOpacity
              key={id}
              style={styles.previewItem}
              onPress={() => (onItemPress ? onItemPress(item) : onViewAll())}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.previewIcon,
                  { backgroundColor: accentBackground },
                ]}
              >
                <IconComponent size={18} color={accentColor} />
              </View>
              <View style={styles.previewContent}>
                <Text
                  variant="h4"
                  isDark={isDark}
                  weight="semibold"
                  numberOfLines={1}
                >
                  {titleText}
                </Text>
                {line1 ? (
                  <Text
                    variant="caption"
                    color="textSecondary"
                    isDark={isDark}
                    numberOfLines={1}
                  >
                    {line1}
                  </Text>
                ) : null}
                {line2 ? (
                  <Text
                    variant="caption"
                    color="textTertiary"
                    isDark={isDark}
                    numberOfLines={1}
                  >
                    {line2}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })
      ) : (
        <Text
          variant="body"
          color="textSecondary"
          isDark={isDark}
          style={{ marginTop: spacing[2] }}
        >
          {emptyText}
        </Text>
      )}
    </Card>
  );

  const renderNoFamilyCta = () => (
    <Card isDark={isDark} style={[styles.mantraCard, { alignItems: 'flex-start' }]}>
      <Text variant="h3" isDark={isDark} weight="bold">Create your family</Text>
      <Text variant="body" color="textSecondary" isDark={isDark} style={{ marginTop: spacing[2] }}>
        You aren’t part of a family yet. Create one or accept an invite to get started.
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing[3], marginTop: spacing[3] }}>
        <TouchableOpacity
          onPress={() => setShowCreateModal(true)}
          style={{ backgroundColor: themeColors.primary, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 }}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Create Family</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowJoinModal(true)}
          style={{ borderColor: themeColors.primary, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 }}
        >
          <Text style={{ color: themeColors.primary, fontWeight: '600' }}>Join with Code</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={themeColors.primary}
        />
      }
    >
      {toast && <Toast message={toast} type="error" onHide={() => setToast(null)} />}
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
          type="error"
          message={error.message || 'An error occurred'}
          style={styles.errorAlert}
        />
      )}

      {/* Hero Snapshot */}
      <Card isDark={isDark} style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={{ flex: 1, paddingRight: spacing[4] }}>
            <Text variant="label" color="textSecondary" isDark={isDark}>
              Today’s Snapshot
            </Text>
            <Text variant="h3" isDark={isDark} weight="bold" style={{ marginTop: spacing[1] }}>
              Stay on top of your family hub
            </Text>
            <Text
              variant="body"
              color="textSecondary"
              isDark={isDark}
              style={{ marginTop: spacing[1] }}
            >
              Quick insights for everything happening right now.
            </Text>
          </View>
          {featuredValue && (
            <View
              style={[
                styles.featuredValuePill,
                {
                  backgroundColor: themeColors.primaryLight,
                  borderColor: themeColors.primary,
                },
              ]}
            >
              <Text variant="caption" color="primary" isDark={isDark} style={{ textTransform: 'uppercase' }}>
                Core Value
              </Text>
              <Text
                variant="h4"
                isDark={isDark}
                weight="semibold"
                style={{ color: themeColors.primary, marginTop: spacing[1] }}
              >
                {featuredValue}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.heroStatsGrid}>
          <StatsWidget
            title="Upcoming Events"
            value={data?.upcomingEvents || 0}
            icon="📅"
            color="primary"
            isDark={isDark}
            style={styles.heroStatWidget}
            subtitle={eventSubtitle}
          />
          <StatsWidget
            title="Pending Tasks"
            value={data?.pendingTasks || 0}
            icon="✓"
            color="success"
            isDark={isDark}
            style={styles.heroStatWidget}
            subtitle={taskSubtitle}
          />
          <StatsWidget
            title="Unread Messages"
            value={data?.unreadMessages || 0}
            icon="💬"
            color="secondary"
            isDark={isDark}
            style={styles.heroStatWidget}
            subtitle={messageSubtitle}
          />
          <StatsWidget
            title="Active Members"
            value={data?.activeMembers || 0}
            icon="👥"
            color="primary"
            isDark={isDark}
            style={styles.heroStatWidget}
            subtitle={memberSubtitle}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.heroActionsContent}
          style={{ marginTop: spacing[3] }}
        >
          {quickActions.map((action) => {
            const IconComponent = action.icon;
            return (
              <TouchableOpacity
                key={action.id}
                onPress={action.onPress}
                style={[
                  styles.quickActionButton,
                  {
                    backgroundColor: action.accentLight,
                    borderColor: action.accent,
                  },
                ]}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.quickActionIcon,
                    { backgroundColor: action.accent, shadowColor: action.accent },
                  ]}
                >
                  <IconComponent size={20} color="#fff" />
                </View>
                <Text variant="h4" isDark={isDark} weight="semibold" style={styles.quickActionTitle}>
                  {action.label}
                </Text>
                <Text variant="caption" color="textSecondary" isDark={isDark}>
                  {action.description}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Card>

      {family && (
        <View style={styles.previewSection}>
          {renderPreviewCard<DashboardEventPreview>(
          'events',
          'Upcoming Events',
          eventPreviews,
          {
            emptyText: 'Nothing scheduled yet. Tap view all to add an event.',
            icon: CalendarDays,
            accentColor: themeColors.primary,
            accentBackground: themeColors.primaryLight,
            onViewAll: () => navigation.navigate('Calendar'),
            getId: (event) => String(event.eventId),
            getTitle: (event) => event.title,
            getLine1: (event) => formatUpcomingDate(event.startTime),
            getLine2: (event) =>
              event.location ||
              (event.assignedToName ? `With ${event.assignedToName}` : undefined),
          },
        )}
          {renderPreviewCard<DashboardTaskPreview>(
          'tasks',
          'Pending Tasks',
          taskPreviews,
          {
            emptyText: 'All tasks are completed. Great job!',
            icon: ListTodo,
            accentColor: themeColors.success,
            accentBackground: themeColors.successLight,
            onViewAll: () => navigation.navigate('Tasks'),
            getId: (task) => String(task.taskId),
            getTitle: (task) => task.title,
            getLine1: (task) =>
              task.dueDate ? formatUpcomingDate(task.dueDate) : 'No due date',
            getLine2: (task) => {
              const details = [
                task.priority ? `${capitalize(task.priority)} priority` : undefined,
                task.assignedToName ? `Assigned to ${task.assignedToName}` : undefined,
              ].filter(Boolean);
              return details.join(' • ') || undefined;
            },
          },
        )}
          {renderPreviewCard<DashboardMessagePreview>(
          'messages',
          'Unread Messages',
          messagePreviews,
          {
            emptyText: 'All caught up on messages.',
            icon: MessageCircle,
            accentColor: themeColors.secondary,
            accentBackground: themeColors.secondaryLight,
            onViewAll: () => navigation.navigate('Messages'),
            getId: (message) => message.chatId,
            getTitle: (message) => message.chatName,
            getLine1: (message) => {
              const parts = [`${message.unreadCount} unread`];
              const recency = formatTimeAgoLabel(message.lastMessageAt);
              if (recency) {
                parts.push(recency);
              }
              return parts.join(' • ');
            },
            getLine2: (message) => message.lastMessageSnippet,
          },
        )}
          {renderPreviewCard<DashboardMemberPreview>(
          'members',
          'Active Members',
          memberPreviews.slice(0, 3),
          {
            emptyText: 'No members yet. Invite someone to join your family.',
            icon: Users,
            accentColor: themeColors.accent,
            accentBackground: themeColors.accentLight,
            onViewAll: () => navigation.navigate('Family'),
            getId: (member) => member.userId,
            getTitle: (member) => member.fullName ?? 'Family member',
            getLine1: (member) => {
              const details = [
                member.role ? capitalize(member.role) : undefined,
                member.lastActive ? `Active ${formatTimeAgoLabel(member.lastActive)}` : undefined,
              ].filter(Boolean);
              return details.join(' • ') || undefined;
            },
            getLine2: (member) =>
              member.joinedAt ? `Joined ${formatTimeAgoLabel(member.joinedAt)}` : undefined,
          },
        )}
        </View>
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

      {/* Family Values Carousel */}
      {familyValues.length > 0 && (
        <Card isDark={isDark} style={styles.valuesCard}>
          <View style={styles.valuesHeader}>
            <Text variant="label" color="textSecondary" isDark={isDark}>
              Family Values
            </Text>
            {familyValues.length > 1 && (
              <Text variant="caption" color="textSecondary" isDark={isDark}>
                {currentValueIndex + 1} of {familyValues.length}
              </Text>
            )}
          </View>
          {featuredValue && (
            <Text
              variant="h3"
              isDark={isDark}
              weight="semibold"
              style={[
                styles.featuredValueText,
                { color: themeColors.primary },
              ]}
            >
              “{featuredValue}”
            </Text>
          )}
          {familyValues.length > 1 && (
            <View style={styles.valuesList}>
              {familyValues.map((value, index) => {
                const isActive = index === currentValueIndex;
                return (
                  <View
                    key={value}
                    style={[
                      styles.valueBadge,
                      isActive ? {
                        backgroundColor: themeColors.primaryLight,
                        borderColor: themeColors.primary,
                      } : {},
                    ]}
                  >
                    <Text
                      variant="label"
                      isDark={isDark}
                      style={[
                        styles.valueBadgeText,
                        isActive ? { color: themeColors.primary, fontWeight: '600' } : {},
                      ]}
                    >
                      {value}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </Card>
      )}

      {/* Activity Feed Section */}
      {activity.length > 0 ? (
        <View style={styles.section}>
          <Text variant="h3" isDark={isDark} weight="bold" style={styles.sectionTitle}>
            Recent Activity
          </Text>
          <ActivityFeed activities={activity} isDark={isDark} />
        </View>
      ) : (
        <Card isDark={isDark} style={{ marginHorizontal: spacing[4], marginVertical: spacing[2], padding: spacing[3] }}>
          <Text variant="label" color="textSecondary" isDark={isDark}>No recent activity</Text>
          <Text variant="body" isDark={isDark} style={{ marginTop: spacing[1] }}>As you complete tasks and post messages, they’ll show up here.</Text>
        </Card>
      )}

      {/* Leaderboard Section */}
      {leaderboard.length > 0 ? (
        <View style={styles.section}>
          <Text variant="h3" isDark={isDark} weight="bold" style={styles.sectionTitle}>
            Family Leaderboard
          </Text>
          <Leaderboard entries={leaderboard} isDark={isDark} maxItems={10} />
        </View>
      ) : (
        <Card isDark={isDark} style={{ marginHorizontal: spacing[4], marginVertical: spacing[2], padding: spacing[3] }}>
          <Text variant="label" color="textSecondary" isDark={isDark}>No points yet</Text>
          <Text variant="body" isDark={isDark} style={{ marginTop: spacing[1] }}>Complete tasks to earn points and climb the leaderboard.</Text>
        </Card>
      )}

      {/* No Family CTA */}
      {!family && (
        <View style={{ paddingHorizontal: spacing[4], marginTop: spacing[2] }}>
          {typeof renderNoFamilyCta === 'function' ? renderNoFamilyCta() : null}
        </View>
      )}

      {/* Footer Spacing */}
      <View style={styles.footer} />
      <JoinByCodeModal
        visible={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        isDark={isDark}
        initialToken={prefillToken}
        onJoined={async () => {
          setToast('Joined family!');
          await refetchFamily();
          await refetch();
        }}
      />
      <CreateFamilyModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        isDark={isDark}
        onCreated={async () => {
          setToast('Family created!');
          await refetchFamily();
          await refetch();
        }}
      />
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
  heroCard: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[4],
    padding: spacing[4],
  },
  previewSection: {
    paddingHorizontal: spacing[4],
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  previewCard: {
    padding: spacing[3],
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  previewLink: {
    fontSize: fontSize.sm,
  fontWeight: '600',
  },
  previewSkeleton: {
    paddingVertical: spacing[2],
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    gap: spacing[3],
  },
  previewIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewContent: {
    flex: 1,
    gap: spacing[1],
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  heroStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  heroStatWidget: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  heroActionsContent: {
    gap: spacing[3],
    paddingRight: spacing[2],
  },
  quickActionButton: {
    width: 160,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  quickActionTitle: {
    marginBottom: spacing[1],
  },
  featuredValuePill: {
    minWidth: 140,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  valuesCard: {
    marginHorizontal: spacing[4],
    marginVertical: spacing[3],
  },
  valuesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing[2],
  },
  featuredValueText: {
    marginTop: spacing[3],
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
