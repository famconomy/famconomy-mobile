import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  FlatList,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAppStore } from '../../store/appStore';
import { useFamily } from '../../hooks/useFamily';
import { useTasks } from '../../hooks/useTasks';
import { useAuth } from '../../hooks/useAuth';
import { useTaskFiltersStore } from '../../store/taskFiltersStore';
import type { TaskSortOption } from '../../store/taskFiltersStore';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Alert } from '../../components/ui/Alert';
import { TaskCard } from '../../components/tasks/TaskCard';
import { TaskModal } from '../../components/tasks/TaskModal';
import { Toast } from '../../components/ui/Toast';
import { spacing, lightTheme, darkTheme } from '../../theme';
import type { Task, TaskPriority, TaskStatus } from '../../types';
import type { CreateTaskRequest, UpdateTaskRequest } from '../../api/tasks';

const SORT_OPTIONS: Array<{ id: TaskSortOption; label: string }> = [
  { id: 'priority', label: 'Priority' },
  { id: 'dueDate', label: 'Due date' },
  { id: 'reward', label: 'Reward' },
];

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const TasksScreen: React.FC = () => {
  const { theme } = useAppStore();
  const { user } = useAuth();
  const { family } = useFamily();
  const activeFilter = useTaskFiltersStore((state) => state.filter);
  const sortBy = useTaskFiltersStore((state) => state.sortBy);
  const setFilter = useTaskFiltersStore((state) => state.setFilter);
  const setSortBy = useTaskFiltersStore((state) => state.setSortBy);
  const assignedToFilter = useTaskFiltersStore((state) => state.assignedTo);
  const setAssignedTo = useTaskFiltersStore((state) => state.setAssignedTo);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | undefined>();
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);
  const isDark = theme === 'dark';
  const themeColors = isDark ? darkTheme : lightTheme;
  const userId = user?.id;

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'info') => {
      setToast({ message, type });
    },
    []
  );

  useEffect(() => {
    if (activeFilter === 'mine' && userId) {
      setAssignedTo(userId);
    } else if (activeFilter !== 'mine' && assignedToFilter) {
      setAssignedTo(undefined);
    }
  }, [activeFilter, assignedToFilter, setAssignedTo, userId]);

  const statusFilter =
    activeFilter === 'all' || activeFilter === 'mine' ? undefined : activeFilter;
  const assignedTo =
    activeFilter === 'mine' ? assignedToFilter ?? userId : undefined;

  const {
    tasks,
    allTasks,
    isLoading,
    isRefreshing,
    error,
    refetch,
    createTask,
    updateTask,
    deleteTask,
    approveTask,
    uploadAttachment,
    deleteAttachment,
  } = useTasks({
    familyId: family?.id,
    status: statusFilter,
    assignedTo,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const stats = useMemo(() => {
    const mine = userId ? allTasks.filter((t) => t.assignedToUserId === userId).length : 0;
    return {
      total: allTasks.length,
      pending: allTasks.filter((t) => t.status === 'pending').length,
      inProgress: allTasks.filter((t) => t.status === 'in_progress').length,
      completed: allTasks.filter((t) => t.status === 'completed').length,
      mine,
    };
  }, [allTasks, userId]);

  const visibleTasks = useMemo(() => {
    if (activeFilter === 'mine' && !userId) {
      return [];
    }
    return tasks;
  }, [activeFilter, tasks, userId]);

  const getDueTimestamp = useCallback((task: Task): number => {
    if (!task.dueDate) return Number.POSITIVE_INFINITY;
    const ts = new Date(task.dueDate).getTime();
    return Number.isNaN(ts) ? Number.POSITIVE_INFINITY : ts;
  }, []);

  const getPriorityScore = useCallback(
    (task: Task): number => {
      const priorityRank: Record<TaskPriority, number> = {
        urgent: 3,
        high: 2,
        medium: 1,
        low: 0,
      };
      const base = priorityRank[task.priority ?? 'medium'];
      const dueTs = getDueTimestamp(task);
      if (dueTs === Number.POSITIVE_INFINITY) return base * 10;
      const hoursUntilDue = (dueTs - Date.now()) / (60 * 60 * 1000);
      const urgencyBoost =
        hoursUntilDue <= 0 ? 5 : hoursUntilDue <= 12 ? 4 : hoursUntilDue <= 24 ? 3 : hoursUntilDue <= 48 ? 2 : 0;
      const rewardBoost = (task.rewardValue ?? 0) >= 75 ? 2 : (task.rewardValue ?? 0) >= 30 ? 1 : 0;
      return base * 10 + urgencyBoost + rewardBoost;
    },
    [getDueTimestamp]
  );

  const sortedTasks = useMemo(() => {
    const sortComparators: Record<TaskSortOption, (a: Task, b: Task) => number> = {
      priority: (a, b) => {
        const diff = getPriorityScore(b) - getPriorityScore(a);
        if (diff !== 0) return diff;
        return getDueTimestamp(a) - getDueTimestamp(b);
      },
      dueDate: (a, b) => {
        const diff = getDueTimestamp(a) - getDueTimestamp(b);
        if (diff !== 0) return diff;
        return getPriorityScore(b) - getPriorityScore(a);
      },
      reward: (a, b) => {
        const diff = (b.rewardValue ?? 0) - (a.rewardValue ?? 0);
        if (diff !== 0) return diff;
        return getPriorityScore(b) - getPriorityScore(a);
      },
    };
    const sorted = [...visibleTasks];
    sorted.sort(sortComparators[sortBy]);
    return sorted;
  }, [getDueTimestamp, getPriorityScore, sortBy, visibleTasks]);

  const handleSaveTask = useCallback(
    async (data: CreateTaskRequest | UpdateTaskRequest) => {
      try {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        if (selectedTask) {
          await updateTask(selectedTask.taskId, data as UpdateTaskRequest);
          showToast('Task updated', 'success');
        } else {
          await createTask(data as CreateTaskRequest);
          showToast('Task created', 'success');
        }
        setSelectedTask(undefined);
        setModalVisible(false);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save task';
        showToast(message, 'error');
      }
    },
    [createTask, selectedTask, showToast, updateTask]
  );

  const handleStatusToggle = useCallback(
    (task: Task, nextStatus: TaskStatus) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      updateTask(task.taskId, { status: nextStatus })
        .then(() => showToast('Task updated', 'success'))
        .catch((err) => {
          const message = err instanceof Error ? err.message : 'Failed to update task';
          showToast(message, 'error');
        });
    },
    [showToast, updateTask]
  );

  const handleDeleteTask = useCallback(
    async (taskId: number) => {
      try {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        await deleteTask(taskId);
        showToast('Task deleted', 'success');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete task';
        showToast(message, 'error');
      }
    },
    [deleteTask, showToast]
  );

  const handleApprove = useCallback(
    async (taskId: number) => {
      try {
        await approveTask(taskId, 3);
        showToast('Task approved', 'success');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to approve task';
        showToast(message, 'error');
      }
    },
    [approveTask, showToast]
  );

  const handleReject = useCallback(
    async (taskId: number) => {
      try {
        await approveTask(taskId, 1);
        showToast('Task rejected', 'info');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update approval';
        showToast(message, 'error');
      }
    },
    [approveTask, showToast]
  );

  const handleAttachmentUpload = useCallback(
    (taskId: number) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const ImagePicker = require('react-native-image-picker');
        const { launchImageLibrary } = ImagePicker;
        launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 }, async (resp: any) => {
          const asset = resp?.assets?.[0];
          if (!asset?.uri) {
            if (resp?.didCancel) return;
            showToast('No image selected', 'info');
            return;
          }
          try {
            await uploadAttachment(taskId, {
              uri: asset.uri,
              name: asset.fileName || 'photo.jpg',
              type: asset.type || 'image/jpeg',
            });
            showToast('Attachment uploaded', 'success');
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to upload attachment';
            showToast(message, 'error');
          }
        });
      } catch (err) {
        console.warn('Image picker not available. Please install react-native-image-picker.');
        showToast('Image picker not available. Install react-native-image-picker.', 'error');
      }
    },
    [showToast, uploadAttachment]
  );

  const handleDeleteAttachment = useCallback(
    async (taskId: number, attachmentId: number) => {
      try {
        await deleteAttachment(taskId, attachmentId);
        showToast('Attachment removed', 'success');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove attachment';
        showToast(message, 'error');
      }
    },
    [deleteAttachment, showToast]
  );

  const handleTaskPress = useCallback((task: Task) => {
    setSelectedTask(task);
    setModalVisible(true);
  }, []);

  const handleAddTask = useCallback(() => {
    setSelectedTask(undefined);
    setModalVisible(true);
  }, []);

  if (isLoading && tasks.length === 0) {
    return <LoadingSpinner isDark={isDark} message="Loading tasks..." />;
  }

  const emptyTitle =
    activeFilter === 'mine'
      ? 'No personal tasks yet'
      : activeFilter === 'completed'
      ? 'No completed tasks yet'
      : 'No tasks yet';
  const emptySubtitle =
    activeFilter === 'completed'
      ? 'Completed tasks will show up here.'
      : activeFilter === 'mine'
      ? 'Tasks assigned to you will appear here.'
      : 'Create a task to get started.';

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onHide={() => setToast(null)}
        />
      )}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={themeColors.primary}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text variant="h2" isDark={isDark} weight="bold">
              Tasks
            </Text>
            <Text
              variant="body"
              color="textSecondary"
              isDark={isDark}
              style={styles.subtitle}
            >
              {stats.total} total • {stats.completed} completed
            </Text>
          </View>
          <Button
            title="+ Add"
            onPress={handleAddTask}
            size="small"
            isDark={isDark}
          />
        </View>

        {error && (
          <Alert
            type="warning"
            title="Failed to Load Tasks"
            message={error.message}
            isDark={isDark}
            style={styles.errorAlert}
          />
        )}

        <View style={styles.statsBar}>
          <StatsBadge
            label="All"
            count={stats.total}
            active={activeFilter === 'all'}
            onPress={() => setFilter('all')}
            isDark={isDark}
          />
          <StatsBadge
            label="Mine"
            count={stats.mine}
            active={activeFilter === 'mine'}
            onPress={() => setFilter('mine')}
            isDark={isDark}
            color="secondary"
          />
          <StatsBadge
            label="Pending"
            count={stats.pending}
            active={activeFilter === 'pending'}
            onPress={() => setFilter('pending')}
            isDark={isDark}
            color="warning"
          />
          <StatsBadge
            label="In Progress"
            count={stats.inProgress}
            active={activeFilter === 'in_progress'}
            onPress={() => setFilter('in_progress')}
            isDark={isDark}
            color="secondary"
          />
          <StatsBadge
            label="Done"
            count={stats.completed}
            active={activeFilter === 'completed'}
            onPress={() => setFilter('completed')}
            isDark={isDark}
            color="success"
          />
        </View>

        <View style={styles.sortRow}>
          <Text variant="caption" color="textSecondary" isDark={isDark} style={styles.sortLabel}>
            Sort by
          </Text>
          <View style={styles.sortChips}>
            {SORT_OPTIONS.map((option) => {
              const active = sortBy === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  onPress={() => setSortBy(option.id)}
                  style={[
                    styles.sortChip,
                    {
                      backgroundColor: active ? themeColors.primary : themeColors.surfaceVariant,
                      borderColor: active ? themeColors.primary : themeColors.border,
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    style={{ color: active ? '#fff' : themeColors.textSecondary }}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.tasksContainer}>
          {sortedTasks.length === 0 ? (
            <View style={styles.emptyState}>
              <Text variant="h3" isDark={isDark} style={styles.emptyIcon}>
                📋
              </Text>
              <Text variant="h4" isDark={isDark} weight="semibold">
                {emptyTitle}
              </Text>
              <Text
                variant="body"
                color="textSecondary"
                isDark={isDark}
                style={styles.emptyMessage}
              >
                {emptySubtitle}
              </Text>
              {activeFilter === 'all' && (
                <Button
                  title="Create First Task"
                  onPress={handleAddTask}
                  isDark={isDark}
                  style={styles.emptyButton}
                />
              )}
            </View>
          ) : (
            <FlatList
              data={sortedTasks}
              renderItem={({ item }) => (
                <TaskCard
                  task={item}
                  isDark={isDark}
                  onPress={() => handleTaskPress(item)}
                  onStatusChange={(status) => handleStatusToggle(item, status)}
                  onDelete={() => handleDeleteTask(item.taskId)}
                  onApprove={user?.role !== 'child' ? () => handleApprove(item.taskId) : undefined}
                  onReject={user?.role !== 'child' ? () => handleReject(item.taskId) : undefined}
                  onUploadAttachment={() => handleAttachmentUpload(item.taskId)}
                  onDeleteAttachment={(attachmentId) => handleDeleteAttachment(item.taskId, attachmentId)}
                />
              )}
              keyExtractor={(item) => item.taskId.toString()}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: spacing[1] }} />}
            />
          )}
        </View>
      </ScrollView>

      <TaskModal
        visible={modalVisible}
        task={selectedTask}
        isDark={isDark}
        onClose={() => {
          setModalVisible(false);
          setSelectedTask(undefined);
        }}
        onSave={handleSaveTask}
        familyMembers={
          family?.members.map((m) => ({
            userId: m.id,
            fullName:
              (m.firstName || m.lastName)
                ? `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim()
                : m.email || 'Member',
          })) || []
        }
      />

      <View style={{ height: spacing[4] }} />
    </View>
  );
};

interface StatsBadgeProps {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
  isDark?: boolean;
  color?: 'primary' | 'secondary' | 'success' | 'warning';
}

const StatsBadge: React.FC<StatsBadgeProps> = ({
  label,
  count,
  active,
  onPress,
  isDark = false,
  color = 'primary',
}) => {
  const theme = isDark ? darkTheme : lightTheme;
  const colorMap = {
    primary: theme.primary,
    secondary: theme.secondary,
    success: theme.success,
    warning: theme.warning,
  };
  const badgeColor = colorMap[color];

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.statsBadge,
        {
          backgroundColor: active ? badgeColor : theme.surfaceVariant,
          borderColor: active ? badgeColor : theme.border,
        },
      ]}
    >
      <Text
        variant="caption"
        isDark={isDark}
        weight="semibold"
        style={{
          color: active ? '#fff' : undefined,
        }}
      >
        {label}
      </Text>
      <Text
        variant="h4"
        isDark={isDark}
        weight="bold"
        style={{
          color: active ? '#fff' : badgeColor,
          marginTop: spacing[1],
        }}
      >
        {count}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
  },
  titleContainer: {
    flex: 1,
  },
  subtitle: {
    marginTop: spacing[1],
  },
  errorAlert: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[3],
  },
  statsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing[4],
    marginBottom: spacing[4],
    gap: spacing[2],
  },
  statsBadge: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    marginBottom: spacing[3],
    gap: spacing[2],
  },
  sortLabel: {
    flexShrink: 0,
  },
  sortChips: {
    flexDirection: 'row',
    flexShrink: 1,
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  sortChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  tasksContainer: {
    paddingHorizontal: spacing[4],
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing[12],
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing[3],
  },
  emptyMessage: {
    marginTop: spacing[2],
    marginBottom: spacing[4],
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: spacing[2],
  },
});

export default TasksScreen;
