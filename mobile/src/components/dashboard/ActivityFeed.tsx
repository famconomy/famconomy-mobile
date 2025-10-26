import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text } from '../ui/Text';
import { Card } from '../ui/Card';
import { spacing, lightTheme, darkTheme, fontSize } from '../../theme';
import type { ActivityItem } from '../../api/dashboard';
import type { Theme } from '../../theme';

interface ActivityFeedProps {
  activities: ActivityItem[];
  isDark?: boolean;
  onActivityPress?: (activity: ActivityItem) => void;
}

const getActivityIcon = (type: ActivityItem['type']): string => {
  const icons = {
    event: '📅',
    task: '✓',
    message: '💬',
    member_joined: '👤',
  };
  return icons[type] || '📌';
};

const getActivityColor = (theme: Theme, type: ActivityItem['type']): string => {
  const colors = {
    event: theme.primary,
    task: theme.success,
    message: theme.secondary,
    member_joined: theme.accent,
  };
  return colors[type] || theme.textSecondary;
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
  const icon = getActivityIcon(item.type);
  const color = getActivityColor(theme, item.type);
  const timeAgo = formatTimeAgo(item.timestamp);

  return (
    <Card
      isDark={isDark}
      style={styles.activityItem}
      onPress={() => onPress?.(item)}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={{ fontSize: 24, marginRight: spacing[2] }}>
            {icon}
          </Text>
          <View style={styles.titleContainer}>
            <Text variant="h4" isDark={isDark}>
              {item.title}
            </Text>
            {item.actor && (
              <Text variant="caption" color="textSecondary" isDark={isDark}>
                by {item.actor}
              </Text>
            )}
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
        <Text
          variant="caption"
          color="textTertiary"
          isDark={isDark}
          style={styles.timestamp}
        >
          {timeAgo}
        </Text>
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
  titleContainer: {
    flex: 1,
  },
  description: {
    marginLeft: spacing[8],
    marginBottom: spacing[1],
  },
  timestamp: {
    marginLeft: spacing[8],
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing[6],
  },
});
