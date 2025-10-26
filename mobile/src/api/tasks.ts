import { apiClient } from './client';
import type { Task, TaskUpdatePayload } from '../types';

export interface TasksListResponse {
  tasks: Task[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  dueDate?: string;
  assignedToUserId?: string;
  rewardType?: 'screentime' | 'points' | 'currency';
  rewardValue?: number;
  category: 'chores' | 'homework' | 'shopping' | 'activities' | 'other';
  recurring?: 'none' | 'daily' | 'weekly' | 'monthly';
}

export interface UpdateTaskRequest extends Partial<CreateTaskRequest> {
  status?: 'pending' | 'in_progress' | 'completed';
}

/**
 * Fetch tasks for a family with optional filtering
 */
export const getTasks = async (
  familyId: string,
  filters?: {
    status?: string;
    assignedTo?: string;
    category?: string;
    page?: number;
    limit?: number;
  }
): Promise<TasksListResponse> => {
  try {
    const params = new URLSearchParams({ familyId });
    if (filters?.status) params.append('status', filters.status);
    if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await apiClient.get<TasksListResponse>(`/tasks?${params}`);
    return response.data;
  } catch (error) {
    throw handleTaskError(error);
  }
};

/**
 * Get a single task by ID
 */
export const getTask = async (taskId: number): Promise<Task> => {
  try {
    const response = await apiClient.get<Task>(`/tasks/${taskId}`);
    return response.data;
  } catch (error) {
    throw handleTaskError(error);
  }
};

/**
 * Create a new task
 */
export const createTask = async (
  familyId: string,
  data: CreateTaskRequest
): Promise<Task> => {
  try {
    const response = await apiClient.post<Task>('/tasks', {
      ...data,
      familyId,
    });
    return response.data;
  } catch (error) {
    throw handleTaskError(error);
  }
};

/**
 * Update an existing task
 */
export const updateTask = async (
  taskId: number,
  data: UpdateTaskRequest
): Promise<Task> => {
  try {
    const response = await apiClient.put<Task>(`/tasks/${taskId}`, data);
    return response.data;
  } catch (error) {
    throw handleTaskError(error);
  }
};

/**
 * Update only task status
 */
export const updateTaskStatus = async (
  taskId: number,
  status: 'pending' | 'in_progress' | 'completed'
): Promise<Task> => {
  try {
    const response = await apiClient.patch<Task>(`/tasks/${taskId}/status`, {
      status,
    });
    return response.data;
  } catch (error) {
    throw handleTaskError(error);
  }
};

/**
 * Delete a task
 */
export const deleteTask = async (taskId: number): Promise<{ success: boolean }> => {
  try {
    const response = await apiClient.delete<{ success: boolean }>(`/tasks/${taskId}`);
    return response.data;
  } catch (error) {
    throw handleTaskError(error);
  }
};

/**
 * Complete a task
 */
export const completeTask = async (taskId: number): Promise<Task> => {
  return updateTaskStatus(taskId, 'completed');
};

/**
 * Assign task to a user
 */
export const assignTask = async (
  taskId: number,
  userId: string
): Promise<Task> => {
  try {
    const response = await apiClient.patch<Task>(`/tasks/${taskId}/assign`, {
      assignedToUserId: userId,
    });
    return response.data;
  } catch (error) {
    throw handleTaskError(error);
  }
};

/**
 * Get task statistics
 */
export const getTaskStats = async (familyId: string): Promise<{
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  completionRate: number;
}> => {
  try {
    const response = await apiClient.get(`/tasks/stats?familyId=${familyId}`);
    return response.data;
  } catch (error) {
    throw handleTaskError(error);
  }
};

function handleTaskError(error: any): Error {
  if (error.response?.data?.error) {
    return new Error(error.response.data.error);
  }
  if (error.response?.status === 404) {
    return new Error('Task not found');
  }
  if (error.response?.status === 400) {
    return new Error('Invalid task data');
  }
  if (error.message) {
    return new Error(error.message);
  }
  return new Error('Failed to perform task operation');
}
