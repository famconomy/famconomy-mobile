import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as tasksApi from '../api/tasks';
import type { Attachment, Task, TaskPriority } from '../types';
import type { CreateTaskRequest, UpdateTaskRequest } from '../api/tasks';

interface UseTasksOptions {
  familyId?: string;
  status?: string;
  category?: string;
  page?: number;
  limit?: number;
  assignedTo?: string;
}

interface UseTasksReturn {
  tasks: Task[];
  allTasks: Task[];
  total: number;
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  createTask: (data: CreateTaskRequest) => Promise<Task>;
  updateTask: (taskId: number, data: UpdateTaskRequest) => Promise<Task>;
  completeTask: (taskId: number) => Promise<Task>;
  deleteTask: (taskId: number) => Promise<void>;
  assignTask: (taskId: number, userId: string) => Promise<Task>;
  approveTask: (
    taskId: number,
    approvalStatusId: 1 | 2 | 3 | 4,
    approvedByUserId?: string
  ) => Promise<Task>;
  uploadAttachment: (
    taskId: number,
    file: { uri: string; name: string; type: string }
  ) => Promise<Attachment>;
  deleteAttachment: (taskId: number, attachmentId: number) => Promise<void>;
}

/**
 * Hook for managing family tasks with optimistic updates.
 * Handles fetching, creating, updating, deleting, and attachments.
 */
export const useTasks = (options: UseTasksOptions = {}): UseTasksReturn => {
  const { familyId, status, category, page = 1, limit = 50, assignedTo } = options;

  const [rawTasks, setRawTasks] = useState<Task[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const hasLoadedRef = useRef(false);
  const priorityOverridesRef = useRef<Record<number, TaskPriority>>({});

  const applyPriorityOverride = useCallback((task: Task): Task => {
    const override = priorityOverridesRef.current[task.taskId];
    if (!override || task.priority === override) {
      return task;
    }
    return { ...task, priority: override };
  }, []);

  const applyOverridesToList = useCallback(
    (source: Task[]): Task[] => source.map(applyPriorityOverride),
    [applyPriorityOverride]
  );

  const applyFilters = useCallback(
    (sourceTasks: Task[]): Task[] => {
      let filtered = sourceTasks;
      if (status && status !== 'all') {
        filtered = filtered.filter((task) => task.status === status);
      }
      if (category && category !== 'all') {
        filtered = filtered.filter((task) => task.category === category);
      }
      if (assignedTo) {
        filtered = filtered.filter((task) => task.assignedToUserId === assignedTo);
      }
      return filtered;
    },
    [assignedTo, category, status]
  );

  const allTasks = useMemo(
    () => applyOverridesToList(rawTasks),
    [applyOverridesToList, rawTasks]
  );

  useEffect(() => {
    const filtered = applyFilters(allTasks);
    setTasks(filtered);
    setTotal(allTasks.length);
  }, [allTasks, applyFilters]);

  useEffect(() => {
    priorityOverridesRef.current = {};
    hasLoadedRef.current = false;
  }, [familyId]);

  const fetchTasks = useCallback(
    async (opts: { source?: 'initial' | 'refresh' } = {}) => {
      if (!familyId) {
        setRawTasks([]);
        setTasks([]);
        setTotal(0);
        setIsLoading(false);
        setIsRefreshing(false);
        setError(null);
        hasLoadedRef.current = false;
        return;
      }

      const source = opts.source ?? 'initial';
      const shouldShowInitial = !hasLoadedRef.current && source === 'initial';

      try {
        if (shouldShowInitial) {
          setIsLoading(true);
        }
        if (source === 'refresh') {
          setIsRefreshing(true);
        }
        setError(null);

        const response = await tasksApi.getTasks(familyId, {
          page,
          limit,
        });

        setRawTasks(response.tasks);
        hasLoadedRef.current = true;
      } catch (err) {
        const fetchError = err instanceof Error ? err : new Error('Unknown error');
        setError(fetchError);
        console.warn('Failed to fetch tasks:', fetchError);
      } finally {
        if (shouldShowInitial) {
          setIsLoading(false);
        }
        setIsRefreshing(false);
      }
    },
    [familyId, limit, page]
  );

  useEffect(() => {
    fetchTasks({ source: 'initial' });
  }, [fetchTasks]);

  const refetch = useCallback(async () => {
    await fetchTasks({ source: 'refresh' });
  }, [fetchTasks]);

  const handleCreateTask = useCallback(
    async (data: CreateTaskRequest): Promise<Task> => {
      if (!familyId) {
        throw new Error('Family ID is required');
      }

      try {
        const newTask = await tasksApi.createTask(familyId, data);
        if (data.priority) {
          priorityOverridesRef.current[newTask.taskId] = data.priority;
        }

        setRawTasks((prev) => {
          const filteredPrev = prev.filter((t) => t.taskId !== newTask.taskId);
          return [newTask, ...filteredPrev];
        });

        return applyPriorityOverride(newTask);
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to create task');
      }
    },
    [applyPriorityOverride, familyId]
  );

  const handleUpdateTask = useCallback(
    async (taskId: number, data: UpdateTaskRequest): Promise<Task> => {
      try {
        const updatedTask = await tasksApi.updateTask(taskId, data);
        if (data.priority) {
          priorityOverridesRef.current[taskId] = data.priority;
        }

        setRawTasks((prev) =>
          prev.map((task) => (task.taskId === taskId ? updatedTask : task))
        );

        return applyPriorityOverride(updatedTask);
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to update task');
      }
    },
    [applyPriorityOverride]
  );

  const handleCompleteTask = useCallback(
    async (taskId: number): Promise<Task> => {
      try {
        const completedTask = await tasksApi.completeTask(taskId);
        setRawTasks((prev) =>
          prev.map((task) => (task.taskId === taskId ? completedTask : task))
        );
        return applyPriorityOverride(completedTask);
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to complete task');
      }
    },
    [applyPriorityOverride]
  );

  const handleDeleteTask = useCallback(async (taskId: number): Promise<void> => {
    try {
      await tasksApi.deleteTask(taskId);
      delete priorityOverridesRef.current[taskId];
      setRawTasks((prev) => prev.filter((task) => task.taskId !== taskId));
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to delete task');
    }
  }, []);

  const handleAssignTask = useCallback(
    async (taskId: number, userId: string): Promise<Task> => {
      try {
        const assignedTask = await tasksApi.assignTask(taskId, userId);
        setRawTasks((prev) =>
          prev.map((task) => (task.taskId === taskId ? assignedTask : task))
        );
        return applyPriorityOverride(assignedTask);
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to assign task');
      }
    },
    [applyPriorityOverride]
  );

  const handleApproveTask = useCallback(
    async (
      taskId: number,
      approvalStatusId: 1 | 2 | 3 | 4,
      approvedByUserId?: string
    ): Promise<Task> => {
      try {
        const updated = await tasksApi.approveTask(
          taskId,
          approvalStatusId,
          approvedByUserId
        );
        setRawTasks((prev) =>
          prev.map((task) => (task.taskId === taskId ? updated : task))
        );
        return applyPriorityOverride(updated);
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to update approval');
      }
    },
    [applyPriorityOverride]
  );

  const handleUploadAttachment = useCallback(
    async (
      taskId: number,
      file: { uri: string; name: string; type: string }
    ): Promise<Attachment> => {
      try {
        const attachment = await tasksApi.uploadTaskAttachment(taskId, file);
        setRawTasks((prev) =>
          prev.map((task) =>
            task.taskId === taskId
              ? {
                  ...task,
                  attachments: [...(task.attachments || []), attachment],
                }
              : task
          )
        );
        return attachment;
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to upload attachment');
      }
    },
    []
  );

  const handleDeleteAttachment = useCallback(
    async (taskId: number, attachmentId: number): Promise<void> => {
      try {
        await tasksApi.deleteTaskAttachment(taskId, attachmentId);
        setRawTasks((prev) =>
          prev.map((task) =>
            task.taskId === taskId
              ? {
                  ...task,
                  attachments: (task.attachments || []).filter(
                    (attachment) => attachment.attachmentId !== attachmentId
                  ),
                }
              : task
          )
        );
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to delete attachment');
      }
    },
    []
  );

  return {
    tasks,
    allTasks,
    total,
    isLoading,
    isRefreshing,
    error,
    refetch,
    createTask: handleCreateTask,
    updateTask: handleUpdateTask,
    completeTask: handleCompleteTask,
    deleteTask: handleDeleteTask,
    assignTask: handleAssignTask,
    approveTask: handleApproveTask,
    uploadAttachment: handleUploadAttachment,
    deleteAttachment: handleDeleteAttachment,
  };
};
