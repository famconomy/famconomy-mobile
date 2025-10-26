// Task Service - Comprehensive Task Management API

import { apiClient } from './client';

// ============================================
// ENUMS
// ============================================

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum TaskCategory {
  CHORES = 'chores',
  HOMEWORK = 'homework',
  ERRANDS = 'errands',
  PERSONAL = 'personal',
  FAMILY = 'family',
  HEALTH = 'health',
  OTHER = 'other'
}

export enum RecurrenceType {
  NONE = 'none',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly'
}

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface TaskAttachment {
  id: string;
  url: string;
  type: 'image' | 'document' | 'video';
  name: string;
  uploadedAt: string;
}

export interface TaskComment {
  id: string;
  userId: string;
  userName: string;
  userImage?: string;
  content: string;
  createdAt: string;
}

export interface TaskResponse {
  id: string;
  familyId: string;
  createdBy: string;
  assignedTo: string[];
  title: string;
  description?: string;
  category: TaskCategory;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  completedAt?: string;
  completedBy?: string;
  rewardPoints?: number;
  estimatedTime?: number;
  recurrence: RecurrenceType;
  recurrenceEndDate?: string;
  tags: string[];
  attachments: TaskAttachment[];
  comments: TaskComment[];
  createdAt: string;
  updatedAt: string;
}

export interface TasksListResponse {
  tasks: TaskResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  dueDate: string;
  assignedTo: string[];
  priority: TaskPriority;
  category: TaskCategory;
  rewardPoints?: number;
  estimatedTime?: number;
  recurrence?: RecurrenceType;
  recurrenceEndDate?: string;
  tags?: string[];
}

export interface UpdateTaskRequest extends Partial<CreateTaskRequest> {
  status?: TaskStatus;
}

export interface CompleteTaskRequest {
  notes?: string;
  proofUrl?: string;
}

export interface AddTaskCommentRequest {
  content: string;
}

export interface TaskFilter {
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: TaskCategory;
  assignedTo?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  createdBy?: string;
  tags?: string[];
  page?: number;
  limit?: number;
}

export interface TaskStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  totalRewardsEarned: number;
  totalTimeSpent: number;
  completionRate: number;
}

// ============================================
// TASK API SERVICE
// ============================================

class TaskApiService {
  private baseUrl = '/api/tasks';
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  // ==================== TASK CRUD ====================

  /**
   * Create a new task
   */
  async createTask(familyId: string, request: CreateTaskRequest): Promise<TaskResponse> {
    try {
      const response = await apiClient.post<TaskResponse>(`${this.baseUrl}`, {
        ...request,
        familyId,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get all tasks for a family with optional filtering
   */
  async getTasks(familyId: string, filters?: TaskFilter): Promise<TasksListResponse> {
    try {
      const params = new URLSearchParams({ familyId });
      if (filters?.status) params.append('status', filters.status);
      if (filters?.priority) params.append('priority', filters.priority);
      if (filters?.category) params.append('category', filters.category);
      if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo);
      if (filters?.dueDateFrom) params.append('dueDateFrom', filters.dueDateFrom);
      if (filters?.dueDateTo) params.append('dueDateTo', filters.dueDateTo);
      if (filters?.createdBy) params.append('createdBy', filters.createdBy);
      if (filters?.tags?.length) params.append('tags', filters.tags.join(','));
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const response = await apiClient.get<TasksListResponse>(
        `${this.baseUrl}?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get a single task by ID
   */
  async getTask(taskId: string): Promise<TaskResponse> {
    try {
      const response = await apiClient.get<TaskResponse>(`${this.baseUrl}/${taskId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update a task
   */
  async updateTask(taskId: string, request: UpdateTaskRequest): Promise<TaskResponse> {
    try {
      const response = await apiClient.put<TaskResponse>(`${this.baseUrl}/${taskId}`, request);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: string): Promise<{ success: boolean }> {
    try {
      const response = await apiClient.delete<{ success: boolean }>(
        `${this.baseUrl}/${taskId}`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ==================== TASK STATUS & COMPLETION ====================

  /**
   * Update task status
   */
  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<TaskResponse> {
    try {
      const response = await apiClient.patch<TaskResponse>(`${this.baseUrl}/${taskId}/status`, {
        status,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Complete a task
   */
  async completeTask(taskId: string, request?: CompleteTaskRequest): Promise<TaskResponse> {
    try {
      const response = await apiClient.post<TaskResponse>(
        `${this.baseUrl}/${taskId}/complete`,
        request || {}
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Mark task as in progress
   */
  async startTask(taskId: string): Promise<TaskResponse> {
    return this.updateTaskStatus(taskId, TaskStatus.IN_PROGRESS);
  }

  /**
   * Cancel a task
   */
  async cancelTask(taskId: string, reason?: string): Promise<TaskResponse> {
    try {
      const response = await apiClient.post<TaskResponse>(
        `${this.baseUrl}/${taskId}/cancel`,
        { reason }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ==================== TASK ASSIGNMENTS ====================

  /**
   * Assign task to users
   */
  async assignTask(taskId: string, userIds: string[]): Promise<TaskResponse> {
    try {
      const response = await apiClient.patch<TaskResponse>(
        `${this.baseUrl}/${taskId}/assign`,
        { assignedTo: userIds }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Unassign task from a user
   */
  async unassignTask(taskId: string, userId: string): Promise<TaskResponse> {
    try {
      const response = await apiClient.patch<TaskResponse>(
        `${this.baseUrl}/${taskId}/unassign`,
        { userId }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ==================== TASK COMMENTS ====================

  /**
   * Add a comment to a task
   */
  async addComment(taskId: string, request: AddTaskCommentRequest): Promise<TaskComment> {
    try {
      const response = await apiClient.post<TaskComment>(
        `${this.baseUrl}/${taskId}/comments`,
        request
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get task comments
   */
  async getComments(taskId: string): Promise<TaskComment[]> {
    try {
      const response = await apiClient.get<TaskComment[]>(
        `${this.baseUrl}/${taskId}/comments`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Delete a comment
   */
  async deleteComment(taskId: string, commentId: string): Promise<{ success: boolean }> {
    try {
      const response = await apiClient.delete<{ success: boolean }>(
        `${this.baseUrl}/${taskId}/comments/${commentId}`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ==================== TASK ATTACHMENTS ====================

  /**
   * Add attachment to task
   */
  async addAttachment(
    taskId: string,
    file: File,
    type: 'image' | 'document' | 'video'
  ): Promise<TaskAttachment> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const response = await fetch(`${this.baseUrl}/${taskId}/attachments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload attachment');
      return response.json();
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Remove attachment from task
   */
  async removeAttachment(taskId: string, attachmentId: string): Promise<{ success: boolean }> {
    try {
      const response = await apiClient.delete<{ success: boolean }>(
        `${this.baseUrl}/${taskId}/attachments/${attachmentId}`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ==================== TASK STATISTICS ====================

  /**
   * Get task statistics for a family member
   */
  async getTaskStats(familyId: string, userId?: string): Promise<TaskStats> {
    try {
      const params = new URLSearchParams({ familyId });
      if (userId) params.append('userId', userId);

      const response = await apiClient.get<TaskStats>(
        `${this.baseUrl}/stats?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get tasks due today
   */
  async getTasksDueToday(familyId: string): Promise<TaskResponse[]> {
    try {
      const response = await apiClient.get<TaskResponse[]>(
        `${this.baseUrl}/due-today?familyId=${familyId}`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get overdue tasks
   */
  async getOverdueTasks(familyId: string): Promise<TaskResponse[]> {
    try {
      const response = await apiClient.get<TaskResponse[]>(
        `${this.baseUrl}/overdue?familyId=${familyId}`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ==================== BULK OPERATIONS ====================

  /**
   * Bulk update tasks
   */
  async bulkUpdateTasks(
    taskIds: string[],
    updates: Partial<UpdateTaskRequest>
  ): Promise<TaskResponse[]> {
    try {
      const response = await apiClient.post<TaskResponse[]>(`${this.baseUrl}/bulk/update`, {
        taskIds,
        updates,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Bulk delete tasks
   */
  async bulkDeleteTasks(taskIds: string[]): Promise<{ success: boolean; deleted: number }> {
    try {
      const response = await apiClient.post<{ success: boolean; deleted: number }>(
        `${this.baseUrl}/bulk/delete`,
        { taskIds }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ==================== ERROR HANDLING ====================

  private handleError(error: any): Error {
    if (error instanceof Error) {
      return error;
    }
    return new Error('An unknown error occurred');
  }
}

export default new TaskApiService();
