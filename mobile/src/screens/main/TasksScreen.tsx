import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAppStore } from '../../store/appStore';
import { useTasks } from '../../hooks/useTasks';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Alert } from '../../components/ui/Alert';
import { TaskCard } from '../../components/tasks/TaskCard';
import { TaskModal } from '../../components/tasks/TaskModal';
import { spacing, lightTheme, darkTheme } from '../../theme';
import type { Task } from '../../types';
import type { CreateTaskRequest, UpdateTaskRequest } from '../../api/tasks';

type TaskStatus = 'pending' | 'in_progress' | 'completed';

const TASK_FILTERS = ['all', 'pending', 'in_progress', 'completed'] as const;

const TasksScreen: React.FC = () => {
  const { theme, family } = useAppStore();
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | undefined>();
  const isDark = theme === 'dark';
  const themeColors = isDark ? darkTheme : lightTheme;

  // Fetch tasks with current filter
  const {
    tasks,
    isLoading,
    error,
    refetch,
    createTask,
    updateTask,
    completeTask,
    deleteTask,
  } = useTasks({
    familyId: family?.familyId.toString(),
    status: activeFilter === 'all' ? undefined : activeFilter,
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

  const handleCreateTask = async (data: CreateTaskRequest | UpdateTaskRequest) => {
    try {
      if (selectedTask) {
        await updateTask(selectedTask.taskId, data as UpdateTaskRequest);
      } else {
        await createTask(data as CreateTaskRequest);
      }
      setSelectedTask(undefined);
      await refetch();
    } catch (error) {
      console.error('Failed to save task:', error);
    }
  };

  const handleCompleteTask = async (task: Task) => {
    try {
      await completeTask(task.taskId);
      await refetch();
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await deleteTask(taskId);
      await refetch();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleTaskPress = (task: Task) => {
    setSelectedTask(task);
    setModalVisible(true);
  };

  const handleAddTask = () => {
    setSelectedTask(undefined);
    setModalVisible(true);
  };

  // Calculate stats
  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };

  if (isLoading && tasks.length === 0) {
    return <LoadingSpinner isDark={isDark} message="Loading tasks..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={themeColors.primary}
          />
        }
      >
        {/* Header */}
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

        {/* Error Alert */}
        {error && (
          <Alert
            type="warning"
            title="Failed to Load Tasks"
            message={error.message}
            isDark={isDark}
            style={styles.errorAlert}
          />
        )}

        {/* Stats Bar */}
        <View style={styles.statsBar}>
          <StatsBadge
            label="All"
            count={stats.total}
            active={activeFilter === 'all'}
            onPress={() => setActiveFilter('all')}
            isDark={isDark}
          />
          <StatsBadge
            label="Pending"
            count={stats.pending}
            active={activeFilter === 'pending'}
            onPress={() => setActiveFilter('pending')}
            isDark={isDark}
            color="warning"
          />
          <StatsBadge
            label="In Progress"
            count={stats.inProgress}
            active={activeFilter === 'in_progress'}
            onPress={() => setActiveFilter('in_progress')}
            isDark={isDark}
            color="secondary"
          />
          <StatsBadge
            label="Done"
            count={stats.completed}
            active={activeFilter === 'completed'}
            onPress={() => setActiveFilter('completed')}
            isDark={isDark}
            color="success"
          />
        </View>

        {/* Tasks List */}
        <View style={styles.tasksContainer}>
          {tasks.length === 0 ? (
            <View style={styles.emptyState}>
              <Text variant="h3" isDark={isDark} style={styles.emptyIcon}>
                📋
              </Text>
              <Text variant="h4" isDark={isDark} weight="semibold">
                No {activeFilter !== 'all' ? activeFilter : ''} tasks
              </Text>
              <Text
                variant="body"
                color="textSecondary"
                isDark={isDark}
                style={styles.emptyMessage}
              >
                {activeFilter === 'completed'
                  ? 'Completed tasks will appear here'
                  : 'Create a task to get started'}
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
              data={tasks}
              renderItem={({ item }) => (
                <TaskCard
                  task={item}
                  isDark={isDark}
                  onPress={() => handleTaskPress(item)}
                  onStatusChange={(status) => {
                    updateTask(item.taskId, { status });
                  }}
                  onDelete={() => handleDeleteTask(item.taskId)}
                />
              )}
              keyExtractor={(item) => item.taskId.toString()}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: spacing[1] }} />}
            />
          )}
        </View>
      </ScrollView>

      {/* Task Modal */}
      <TaskModal
        visible={modalVisible}
        task={selectedTask}
        isDark={isDark}
        onClose={() => {
          setModalVisible(false);
          setSelectedTask(undefined);
        }}
        onSave={handleCreateTask}
        familyMembers={family?.members.map(m => ({
          userId: m.userId,
          fullName: 'Family Member', // TODO: Get from user data
        })) || []}
      />

      {/* Footer Spacing */}
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
