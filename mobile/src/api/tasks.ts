import apiClient from './apiClient';
import type { Task, Attachment, TaskPriority } from '../types';

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
  priority?: TaskPriority;
  tags?: string[];
}

export interface UpdateTaskRequest extends Partial<CreateTaskRequest> {
  status?: 'pending' | 'in_progress' | 'completed';
}

const mapAttachments = (list?: any[]): Attachment[] | undefined => {
  if (!Array.isArray(list)) return undefined;
  return list.map((a) => ({
    attachmentId: a.AttachmentID ?? a.attachmentId ?? a.id,
    fileUrl: a.Url ?? a.fileUrl,
    fileName: a.FileName ?? a.fileName ?? 'attachment',
    fileType: a.FileType ?? a.fileType ?? 'application/octet-stream',
    fileSize: typeof a.FileSize === 'number' ? a.FileSize : 0,
    uploadedAt: a.CreatedAt ?? a.createdAt ?? new Date().toISOString(),
  }));
};

const mapStatus = (task: any): Task['status'] => {
  const statusName = task.TaskStatus?.StatusName?.toLowerCase();
  switch (statusName) {
    case 'in_progress':
    case 'in-progress':
      return 'in_progress';
    case 'completed':
      return 'completed';
    case 'pending':
      return 'pending';
    default:
      if (task.TaskStatusID === 2) return 'completed';
      if (task.TaskStatusID === 3) return 'in_progress';
      return 'pending';
  }
};

const derivePriority = (task: any): TaskPriority => {
  const raw = (task.Priority ?? task.priority ?? '').toString().toLowerCase();
  if (raw === 'urgent' || raw === 'high' || raw === 'medium' || raw === 'low') {
    return raw as TaskPriority;
  }

  const reward = Number(task.RewardValue ?? task.rewardValue ?? 0);
  const dueDate = task.DueDate ? new Date(task.DueDate).getTime() : null;
  const now = Date.now();

  if (dueDate && dueDate - now <= 24 * 60 * 60 * 1000) {
    return 'urgent';
  }
  if (reward >= 75) return 'urgent';
  if (reward >= 50) return 'high';
  if (reward >= 15) return 'medium';
  return 'low';
};

const mapApprovalStatus = (approvalStatusId?: number): Task['approvalStatus'] => {
  switch (approvalStatusId) {
    case 3:
    case 4: // Treat "No Approval Required" as approved
      return 'approved';
    case 2:
      return 'pending';
    case 1:
      return 'rejected';
    default:
      return undefined;
  }
};

const mapTaskRecord = (t: any): Task => ({
  taskId: Number(t.TaskID ?? t.taskId ?? t.id ?? 0),
  familyId: Number(t.FamilyID ?? t.familyId ?? 0),
  title: String(t.Title ?? t.title ?? 'Task'),
  description: t.Description ?? t.description ?? undefined,
  dueDate: t.DueDate ?? t.dueDate ?? undefined,
  assignedToUserId: t.AssignedToUserID ?? t.assignedToUserId ?? undefined,
  assignedToName:
    t.Users_Task_AssignedToUserIDToUsers?.fullName ??
    t.assignedToName ??
    (([
      t.Users_Task_AssignedToUserIDToUsers?.FirstName,
      t.Users_Task_AssignedToUserIDToUsers?.LastName,
    ]
      .filter(Boolean)
      .join(' ')) || undefined),
  createdByUserId: t.CreatedByUserID ?? t.createdByUserId ?? '',
  createdByName:
    t.Users_Task_CreatedByUserIDToUsers?.fullName ??
    (([
      t.Users_Task_CreatedByUserIDToUsers?.FirstName,
      t.Users_Task_CreatedByUserIDToUsers?.LastName,
    ]
      .filter(Boolean)
      .join(' ')) || undefined),
  status: mapStatus(t),
  rewardType: t.RewardType ?? t.rewardType ?? undefined,
  rewardValue:
    t.RewardValue !== undefined && t.RewardValue !== null
      ? Number(t.RewardValue)
      : t.rewardValue !== undefined
      ? Number(t.rewardValue)
      : undefined,
  category: (t.Category ?? t.category ?? 'other') as Task['category'],
  recurring: (t.Recurrence ?? t.recurring ?? 'none') as Task['recurring'],
  attachments: mapAttachments(t.attachments),
  createdAt: t.CreatedDate ?? t.createdAt ?? new Date().toISOString(),
  updatedAt: t.UpdatedDate ?? t.updatedAt ?? new Date().toISOString(),
  isCustom: Boolean(t.IsCustom ?? t.isCustom),
  approvalStatus: mapApprovalStatus(t.ApprovalStatusID ?? t.approvalStatusId),
  priority: derivePriority(t),
  tags: Array.isArray(t.tags)
    ? t.tags
    : typeof t.Tags === 'string'
    ? t.Tags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
    : undefined,
});

/**
 * Fetch tasks for a family with optional filtering
 */
export const getTasks = async (
  familyId: string,
  _filters?: {
    status?: string;
    assignedTo?: string;
    category?: string;
    page?: number;
    limit?: number;
  }
): Promise<TasksListResponse> => {
  try {
    // Backend provides GET /tasks/family/:familyId
    const response = await apiClient.get(`/tasks/family/${familyId}`);
    const raw = Array.isArray(response.data) ? response.data : [];
    const tasks: Task[] = raw.map(mapTaskRecord);
    return { tasks, total: tasks.length, page: 1, limit: tasks.length };
  } catch (error) {
    throw handleTaskError(error);
  }
};

/**
 * Get a single task by ID
 */
export const getTask = async (taskId: number): Promise<Task> => {
  try {
    const response = await apiClient.get(`/tasks/${taskId}`);
    return mapTaskRecord(response.data);
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
    // Backend expects Title/Description/DueDate/AssignedToUserID/RewardType/RewardValue and FamilyID
    const payload: any = {
      FamilyID: Number(familyId),
      Title: data.title,
      ...(data.description ? { Description: data.description } : {}),
      ...(data.dueDate ? { DueDate: data.dueDate } : {}),
      ...(data.assignedToUserId ? { AssignedToUserID: data.assignedToUserId } : {}),
      ...(data.rewardType ? { RewardType: data.rewardType } : {}),
      ...(data.rewardValue !== undefined ? { RewardValue: data.rewardValue } : {}),
      // Priority/tags are not yet persisted by backend; omit from payload to avoid errors.
    };
    const response = await apiClient.post('/tasks', payload);
    const task = mapTaskRecord(response.data);
    if (data.priority) {
      task.priority = data.priority;
    }
    if (data.tags) {
      task.tags = data.tags;
    }
    return task;
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
    const payload: any = {};
    if (data.title !== undefined) payload.Title = data.title;
    if (data.description !== undefined) payload.Description = data.description;
    if (data.dueDate !== undefined) payload.DueDate = data.dueDate;
    if (data.assignedToUserId !== undefined) payload.AssignedToUserID = data.assignedToUserId;
    if (data.rewardType !== undefined) payload.RewardType = data.rewardType;
    if (data.rewardValue !== undefined) payload.RewardValue = data.rewardValue;
    if (data.status !== undefined) {
      if (data.status === 'completed') {
        payload.TaskStatusID = 2;
      } else if (data.status === 'in_progress') {
        payload.TaskStatusID = 3;
      } else {
        payload.TaskStatusID = 1;
      }
    }
    // Priority/tags currently managed client-side only to avoid breaking API.
    const response = await apiClient.put(`/tasks/${taskId}`, payload);
    const task = mapTaskRecord(response.data);
    if (data.priority) {
      task.priority = data.priority;
    }
    if (data.tags) {
      task.tags = data.tags;
    }
    return task;
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
  // Map to PUT /tasks/:id with TaskStatusID
  return updateTask(taskId, { status });
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
  return updateTask(taskId, { assignedToUserId: userId });
};

/**
 * Approve/reject a task (by parent/guardian)
 */
export const approveTask = async (
  taskId: number,
  approvalStatusId: 1 | 2 | 3 | 4,
  approvedByUserId?: string
): Promise<Task> => {
  const payload: any = { ApprovalStatusID: approvalStatusId };
  if (approvedByUserId) payload.ApprovedByUserID = approvedByUserId;
  const response = await apiClient.put(`/tasks/${taskId}`, payload);
  const task = mapTaskRecord(response.data);
  return task;
};

/**
 * Upload a task attachment (image/file)
 */
export const uploadTaskAttachment = async (
  taskId: number,
  file: { uri: string; name: string; type: string }
): Promise<Attachment> => {
  const form = new FormData() as any;
  // React Native FormData file shape
  form.append(
    'attachment',
    // Cast to any because React Native's file object isn't typed as Blob in TS
    ({ uri: file.uri, name: file.name, type: file.type } as any)
  );

  const response = await apiClient.post(`/tasks/${taskId}/attachments`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  const a = response.data;
  return {
    attachmentId: a.AttachmentID ?? a.attachmentId ?? a.id,
    fileUrl: a.Url ?? a.fileUrl,
    fileName: a.FileName ?? a.fileName ?? 'attachment',
    fileType: a.FileType ?? a.fileType ?? 'application/octet-stream',
    fileSize: typeof a.FileSize === 'number' ? a.FileSize : 0,
    uploadedAt: a.CreatedAt ?? a.createdAt ?? new Date().toISOString(),
  };
};

/** Delete a task attachment */
export const deleteTaskAttachment = async (
  taskId: number,
  attachmentId: number
): Promise<void> => {
  await apiClient.delete(`/tasks/${taskId}/attachments/${attachmentId}`);
};

/**
 * Get task statistics
 */
// Optional: not supported on backend currently
export const getTaskStats = async (_familyId: string): Promise<{
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  completionRate: number;
}> => {
  return { total: 0, pending: 0, inProgress: 0, completed: 0, completionRate: 0 };
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
