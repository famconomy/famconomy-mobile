/**
 * Task Types
 */

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'approved' | 'rejected';
export type TaskCategory = 'chores' | 'homework' | 'shopping' | 'activities' | 'other';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';
export type RewardType = 'screentime' | 'points' | 'currency';

export interface Task {
  taskId: string;
  familyId: string;
  title: string;
  description?: string;
  category: TaskCategory;
  status: TaskStatus;
  priority: TaskPriority;
  
  // Assignment
  assignedToUserId?: string;
  createdByUserId: string;
  
  // Scheduling
  dueDate?: string;
  recurrence: RecurrenceType;
  
  // Rewards
  rewardType?: RewardType;
  rewardValue?: number;
  
  // Approval workflow
  requiresApproval: boolean;
  approvedByUserId?: string;
  approvedAt?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
}

export interface TaskCompletion {
  completionId: string;
  taskId: string;
  userId: string;
  completedAt: string;
  proofUrl?: string;
  notes?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
}

/**
 * Task completion event - triggers screen time grants
 */
export interface TaskCompletedEvent {
  taskId: string;
  userId: string;
  familyId: string;
  rewardType?: RewardType;
  rewardValue?: number;
  completedAt: string;
}
