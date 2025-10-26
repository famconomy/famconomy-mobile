import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Text } from '../ui/Text';
import { Card } from '../ui/Card';
import { spacing, lightTheme, darkTheme, borderRadius, fontSize } from '../../theme';
import type { Task } from '../../types';
import type { Theme } from '../../theme';

interface TaskCardProps {
  task: Task;
  isDark?: boolean;
  onPress?: () => void;
  onStatusChange?: (status: 'pending' | 'in_progress' | 'completed') => void;
  onDelete?: () => void;
}

const getStatusColor = (theme: Theme, status: string): string => {
  switch (status) {
    case 'completed':
      return theme.success;
    case 'in_progress':
      return theme.warning;
    case 'pending':
      return theme.textTertiary;
    default:
      return theme.textSecondary;
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'in_progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    default:
      return 'Pending';
  }
};

const getCategoryColor = (theme: Theme, category: string): string => {
  switch (category) {
    case 'chores':
      return theme.primary;
    case 'homework':
      return theme.secondary;
    case 'shopping':
      return theme.accent;
    case 'activities':
      return theme.success;
    default:
      return theme.textSecondary;
  }
};

const getCategoryEmoji = (category: string): string => {
  switch (category) {
    case 'chores':
      return '🧹';
    case 'homework':
      return '📚';
    case 'shopping':
      return '🛒';
    case 'activities':
      return '🎮';
    default:
      return '📌';
  }
};

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  isDark = false,
  onPress,
  onStatusChange,
  onDelete,
}) => {
  const theme = isDark ? darkTheme : lightTheme;
  const statusColor = getStatusColor(theme, task.status);
  const statusLabel = getStatusLabel(task.status);
  const categoryEmoji = getCategoryEmoji(task.category);
  const isCompleted = task.status === 'completed';

  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDate && dueDate < new Date() && !isCompleted;
  const dueDateText = dueDate
    ? dueDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <Card
      isDark={isDark}
      style={[
        styles.card,
        isCompleted && { opacity: 0.7 },
      ]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={[
            styles.checkbox,
            {
              borderColor: statusColor,
              backgroundColor: isCompleted ? statusColor : 'transparent',
            },
          ]}
          onPress={() => {
            if (isCompleted) {
              onStatusChange?.('pending');
            } else {
              onStatusChange?.('completed');
            }
          }}
        >
          {isCompleted && (
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
              ✓
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text
            variant="h4"
            isDark={isDark}
            weight="semibold"
            style={isCompleted ? { textDecorationLine: 'line-through' } : {}}
          >
            {task.title}
          </Text>
          {task.description && (
            <Text
              variant="caption"
              color="textSecondary"
              isDark={isDark}
              numberOfLines={1}
              style={styles.description}
            >
              {task.description}
            </Text>
          )}
        </View>

        <TouchableOpacity onPress={onDelete}>
          <Text style={{ fontSize: 18, color: theme.error }}>×</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <View style={styles.categoryBadge}>
          <Text style={{ marginRight: spacing[1] }}>{categoryEmoji}</Text>
          <Text variant="caption" isDark={isDark}>
            {task.category}
          </Text>
        </View>

        {dueDateText && (
          <Text
            variant="caption"
            color={isOverdue ? 'error' : 'textSecondary'}
            isDark={isDark}
          >
            {isOverdue ? '⚠️ ' : '📅 '}
            {dueDateText}
          </Text>
        )}

        {task.rewardValue && (
          <View
            style={[
              styles.rewardBadge,
              { backgroundColor: theme.primaryLight },
            ]}
          >
            <Text variant="caption" color="primary" isDark={isDark}>
              +{task.rewardValue} pts
            </Text>
          </View>
        )}

        <Text
          variant="caption"
          isDark={isDark}
          style={{ color: statusColor, fontWeight: '600' }}
        >
          {statusLabel}
        </Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
    gap: spacing[3],
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing[1],
  },
  titleContainer: {
    flex: 1,
  },
  description: {
    marginTop: spacing[1],
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing[2],
  },
  rewardBadge: {
    borderRadius: borderRadius.base,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
});
