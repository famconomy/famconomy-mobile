import { useEffect, useState, useCallback } from 'react';
import * as tasksApi from '../api/tasks';
import type { Task } from '../types';
import type { TasksListResponse, CreateTaskRequest, UpdateTaskRequest } from '../api/tasks';

interface UseTasksOptions {
  familyId?: string;
  status?: string;
  category?: string;
  page?: number;
  limit?: number;
}

interface UseTasksReturn {
  tasks: Task[];
  total: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  createTask: (data: CreateTaskRequest) => Promise<Task>;
  updateTask: (taskId: number, data: UpdateTaskRequest) => Promise<Task>;
  completeTask: (taskId: number) => Promise<Task>;
  deleteTask: (taskId: number) => Promise<void>;
  assignTask: (taskId: number, userId: string) => Promise<Task>;
}

/**
 * Hook for managing family tasks
 * Handles fetching, creating, updating, and deleting tasks
 */
export const useTasks = (options: UseTasksOptions = {}): UseTasksReturn => {
  const {
    familyId,
    status,
    category,
    page = 1,
    limit = 50,
  } = options;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!familyId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await tasksApi.getTasks(familyId, {
        status,
        category,
        page,
        limit,
      });
      setTasks(response.tasks);
      setTotal(response.total);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.warn('Failed to fetch tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [familyId, status, category, page, limit]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleCreateTask = useCallback(async (data: CreateTaskRequest): Promise<Task> => {
    if (!familyId) throw new Error('Family ID is required');
    
    try {
      const newTask = await tasksApi.createTask(familyId, data);
      setTasks(prev => [newTask, ...prev]);
      return newTask;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to create task');
    }
  }, [familyId]);

  const handleUpdateTask = useCallback(async (taskId: number, data: UpdateTaskRequest): Promise<Task> => {
    try {
      const updatedTask = await tasksApi.updateTask(taskId, data);
      setTasks(prev =>
        prev.map(t => t.taskId === taskId ? updatedTask : t)
      );
      return updatedTask;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update task');
    }
  }, []);

  const handleCompleteTask = useCallback(async (taskId: number): Promise<Task> => {
    try {
      const completedTask = await tasksApi.completeTask(taskId);
      setTasks(prev =>
        prev.map(t => t.taskId === taskId ? completedTask : t)
      );
      return completedTask;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to complete task');
    }
  }, []);

  const handleDeleteTask = useCallback(async (taskId: number): Promise<void> => {
    try {
      await tasksApi.deleteTask(taskId);
      setTasks(prev => prev.filter(t => t.taskId !== taskId));
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to delete task');
    }
  }, []);

  const handleAssignTask = useCallback(async (taskId: number, userId: string): Promise<Task> => {
    try {
      const assignedTask = await tasksApi.assignTask(taskId, userId);
      setTasks(prev =>
        prev.map(t => t.taskId === taskId ? assignedTask : t)
      );
      return assignedTask;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to assign task');
    }
  }, []);

  return {
    tasks,
    total,
    isLoading,
    error,
    refetch: fetchTasks,
    createTask: handleCreateTask,
    updateTask: handleUpdateTask,
    completeTask: handleCompleteTask,
    deleteTask: handleDeleteTask,
    assignTask: handleAssignTask,
  };
};
