import React, { useMemo } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text } from '../ui/Text';
import { Card } from '../ui/Card';
import { spacing, lightTheme, darkTheme, fontSize, borderRadius } from '../../theme';
import type { ActivityItem } from '../../api/dashboard';
import type { Theme } from '../../theme';
import {
  CalendarDays,
  CheckSquare,
  MessageCircle,
  UserPlus,
} from 'lucide-react-native';

interface ActivityFeedProps {
  activities: ActivityItem[];
  isDark?: boolean;
  onActivityPress?: (activity: ActivityItem) => void;
}

const getActivityMeta = (theme: Theme, type: ActivityItem['type']) => {
  const icons = {
    event: {
      Icon: CalendarDays,
      color: theme.primary,
      background: theme.primaryLight,
      label: 'Event updated',
    },
    task: {
      Icon: CheckSquare,
      color: theme.success,
      background: theme.successLight,
      label: 'Task update',
    },
    message: {
      Icon: MessageCircle,
      color: theme.secondary,
      background: theme.secondaryLight,
      label: 'New message',
    },
    member_joined: {
      Icon: UserPlus,
      color: theme.accent,
      background: theme.accentLight,
      label: 'New member',
    },
  };
  const fallback = {
    Icon: MessageCircle,
    color: theme.textSecondary,
    background: theme.surfaceVariant,
    label: 'Update',
  };
  return icons[type] ?? fallback;
};

const formatTimeAgo = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const ActivityItemComponent: React.FC<{
  item: ActivityItem;
  isDark?: boolean;
  onPress?: (activity: ActivityItem) => void;
}> = ({ item, isDark = false, onPress }) => {
  const theme = isDark ? darkTheme : lightTheme;
  const meta = useMemo(() => getActivityMeta(theme, item.type), [item.type, theme]);
  const timeAgo = formatTimeAgo(item.timestamp);
  const { Icon, color, background, label } = meta;

  return (
    <Card
      isDark={isDark}
      style={styles.activityItem}
      onPress={() => onPress?.(item)}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View
            style={[
              styles.iconPill,
              {
                backgroundColor: background,
              },
            ]}
          >
            <Icon size={18} color={color} />
          </View>
          <View style={styles.titleContainer}>
            <View style={styles.titleRow}>
              <Text variant="h4" isDark={isDark} weight="semibold">
                {item.title}
              </Text>
              <Text variant="caption" color="textTertiary" isDark={isDark}>
                {timeAgo}
              </Text>
            </View>
            <Text variant="caption" color="textSecondary" isDark={isDark}>
              {item.actor ? `${label} · ${item.actor}` : label}
            </Text>
          </View>
        </View>
        {item.description && (
          <Text
            variant="body"
            color="textSecondary"
            isDark={isDark}
            style={styles.description}
          >
            {item.description}
          </Text>
        )}
      </View>
    </Card>
  );
};

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  isDark = false,
  onActivityPress,
}) => {
  if (activities.length === 0) {
    return (
      <Card isDark={isDark} style={styles.emptyContainer}>
        <Text variant="body" color="textSecondary" isDark={isDark}>
          No recent activity
        </Text>
      </Card>
    );
  }

  return (
    <FlatList
      data={activities}
      renderItem={({ item }) => (
        <ActivityItemComponent
          item={item}
          isDark={isDark}
          onPress={onActivityPress}
        />
      )}
      keyExtractor={(item) => item.id}
      scrollEnabled={false}
      ItemSeparatorComponent={() => <View style={{ height: spacing[2] }} />}
    />
  );
};

const styles = StyleSheet.create({
  activityItem: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  content: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing[2],
  },
  iconPill: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  titleContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1],
    gap: spacing[2],
  },
  description: {
    marginLeft: spacing[8],
    marginBottom: spacing[1],
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing[6],
  },
});
