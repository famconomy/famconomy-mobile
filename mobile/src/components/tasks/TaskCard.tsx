import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text } from '../ui/Text';
import { Card } from '../ui/Card';
import { spacing, lightTheme, darkTheme, borderRadius, fontSize } from '../../theme';
import type { Task, TaskPriority } from '../../types';
import type { Theme } from '../../theme';

interface TaskCardProps {
  task: Task;
  isDark?: boolean;
  onPress?: () => void;
  onStatusChange?: (status: 'pending' | 'in_progress' | 'completed') => void;
  onDelete?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onUploadAttachment?: () => void;
  onDeleteAttachment?: (attachmentId: number) => void;
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

const getPriorityLabel = (priority?: TaskPriority): string | null => {
  switch (priority) {
    case 'urgent':
      return 'Urgent';
    case 'high':
      return 'High';
    case 'medium':
      return 'Medium';
    case 'low':
      return 'Low';
    default:
      return null;
  }
};

const getPriorityColors = (theme: Theme, priority?: TaskPriority) => {
  switch (priority) {
    case 'urgent':
      return { background: theme.errorLight, text: theme.error };
    case 'high':
      return { background: theme.warningLight, text: theme.warning };
    case 'medium':
      return { background: theme.secondaryLight, text: theme.secondary };
    case 'low':
      return { background: theme.surfaceVariant, text: theme.textSecondary };
    default:
      return { background: theme.surfaceVariant, text: theme.textSecondary };
  }
};

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  isDark = false,
  onPress,
  onStatusChange,
  onDelete,
  onApprove,
  onReject,
  onUploadAttachment,
  onDeleteAttachment,
}) => {
  const theme = isDark ? darkTheme : lightTheme;
  const statusColor = getStatusColor(theme, task.status);
  const statusLabel = getStatusLabel(task.status);
  const categoryEmoji = getCategoryEmoji(task.category);
  const isCompleted = task.status === 'completed';
  const priorityLabel = getPriorityLabel(task.priority);
  const priorityColors = getPriorityColors(theme, task.priority);

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

        {priorityLabel && (
          <View
            style={[
              styles.priorityBadge,
              {
                backgroundColor: priorityColors.background,
              },
            ]}
          >
            <Text variant="caption" style={{ color: priorityColors.text }}>
              {priorityLabel}
            </Text>
          </View>
        )}

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

        {task.assignedToName && (
          <Text variant="caption" color="textSecondary" isDark={isDark}>
            👤 {task.assignedToName}
          </Text>
        )}

        <Text
          variant="caption"
          isDark={isDark}
          style={{ color: statusColor, fontWeight: '600' }}
        >
          {statusLabel}
        </Text>
      </View>

      {/* Attachments Preview */}
      {!!task.attachments?.length && (
        <View style={[styles.attachmentsRow, { marginTop: spacing[2] }]}>
          {task.attachments.slice(0, 4).map((att) => (
            <View key={att.attachmentId} style={styles.attachmentItem}>
              <Image source={{ uri: att.fileUrl }} style={styles.attachmentThumb} />
              {onDeleteAttachment && (
                <TouchableOpacity onPress={() => onDeleteAttachment(att.attachmentId)} style={styles.attachmentDeleteBtn}>
                  <Text style={{ color: '#fff' }}>×</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Actions Row: Approvals + Upload */}
      <View style={[styles.actionsRow, { marginTop: spacing[2] }]}>
        {onUploadAttachment && (
          <TouchableOpacity onPress={onUploadAttachment} style={[styles.actionChip, { borderColor: theme.primary }]}> 
            <Text style={{ color: theme.primary }}>+ Attachment</Text>
          </TouchableOpacity>
        )}
        {task.status === 'completed' && task.approvalStatus !== 'approved' && (
          <View style={{ flexDirection: 'row', gap: spacing[2], marginLeft: 'auto' }}>
            {onReject && (
              <TouchableOpacity onPress={onReject} style={[styles.actionChip, { borderColor: theme.error }]}>
                <Text style={{ color: theme.error }}>Reject</Text>
              </TouchableOpacity>
            )}
            {onApprove && (
              <TouchableOpacity onPress={onApprove} style={[styles.actionChip, { borderColor: theme.success }]}>
                <Text style={{ color: theme.success }}>Approve</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
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
  priorityBadge: {
    borderRadius: borderRadius.base,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1] / 2,
  },
  attachmentsRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  attachmentItem: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
  },
  attachmentThumb: {
    width: '100%',
    height: '100%',
  },
  attachmentDeleteBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  actionChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
});
