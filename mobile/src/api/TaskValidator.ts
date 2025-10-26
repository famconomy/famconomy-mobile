// Task Validation Helpers

import {
  TaskPriority,
  TaskCategory,
  RecurrenceType,
  CreateTaskRequest,
  UpdateTaskRequest,
} from './TasksService';

export class TaskValidator {
  /**
   * Validate task title
   */
  static validateTitle(title: string): { valid: boolean; error?: string } {
    if (!title || title.trim().length === 0) {
      return { valid: false, error: 'Task title is required' };
    }
    if (title.length < 3) {
      return { valid: false, error: 'Task title must be at least 3 characters' };
    }
    if (title.length > 100) {
      return { valid: false, error: 'Task title must be less than 100 characters' };
    }
    return { valid: true };
  }

  /**
   * Validate task description
   */
  static validateDescription(description?: string): { valid: boolean; error?: string } {
    if (description && description.length > 500) {
      return { valid: false, error: 'Description must be less than 500 characters' };
    }
    return { valid: true };
  }

  /**
   * Validate due date
   */
  static validateDueDate(dueDate: string): { valid: boolean; error?: string } {
    if (!dueDate) {
      return { valid: false, error: 'Due date is required' };
    }

    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(due.getTime())) {
      return { valid: false, error: 'Invalid due date format' };
    }

    return { valid: true };
  }

  /**
   * Validate priority
   */
  static validatePriority(priority: string): { valid: boolean; error?: string } {
    const validPriorities = Object.values(TaskPriority);
    if (!validPriorities.includes(priority as TaskPriority)) {
      return { valid: false, error: 'Invalid task priority' };
    }
    return { valid: true };
  }

  /**
   * Validate category
   */
  static validateCategory(category: string): { valid: boolean; error?: string } {
    const validCategories = Object.values(TaskCategory);
    if (!validCategories.includes(category as TaskCategory)) {
      return { valid: false, error: 'Invalid task category' };
    }
    return { valid: true };
  }

  /**
   * Validate assigned users
   */
  static validateAssignedTo(assignedTo: string[]): { valid: boolean; error?: string } {
    if (!Array.isArray(assignedTo)) {
      return { valid: false, error: 'Assigned to must be an array' };
    }
    if (assignedTo.length === 0) {
      return { valid: false, error: 'At least one user must be assigned' };
    }
    if (assignedTo.some(id => !id || typeof id !== 'string')) {
      return { valid: false, error: 'Invalid user ID in assigned list' };
    }
    return { valid: true };
  }

  /**
   * Validate reward points
   */
  static validateRewardPoints(points?: number): { valid: boolean; error?: string } {
    if (points !== undefined) {
      if (typeof points !== 'number' || points < 0) {
        return { valid: false, error: 'Reward points must be a non-negative number' };
      }
      if (points > 10000) {
        return { valid: false, error: 'Reward points cannot exceed 10000' };
      }
    }
    return { valid: true };
  }

  /**
   * Validate estimated time
   */
  static validateEstimatedTime(time?: number): { valid: boolean; error?: string } {
    if (time !== undefined) {
      if (typeof time !== 'number' || time < 1) {
        return { valid: false, error: 'Estimated time must be at least 1 minute' };
      }
      if (time > 1440) {
        // 24 hours in minutes
        return { valid: false, error: 'Estimated time cannot exceed 24 hours' };
      }
    }
    return { valid: true };
  }

  /**
   * Validate recurrence settings
   */
  static validateRecurrence(
    recurrence?: string,
    recurrenceEndDate?: string
  ): { valid: boolean; error?: string } {
    if (recurrence) {
      const validRecurrences = Object.values(RecurrenceType);
      if (!validRecurrences.includes(recurrence as RecurrenceType)) {
        return { valid: false, error: 'Invalid recurrence type' };
      }

      if (recurrence !== RecurrenceType.NONE && recurrenceEndDate) {
        const endDate = new Date(recurrenceEndDate);
        if (isNaN(endDate.getTime())) {
          return { valid: false, error: 'Invalid recurrence end date' };
        }
      }
    }
    return { valid: true };
  }

  /**
   * Validate tags
   */
  static validateTags(tags?: string[]): { valid: boolean; error?: string } {
    if (tags) {
      if (!Array.isArray(tags)) {
        return { valid: false, error: 'Tags must be an array' };
      }
      if (tags.length > 10) {
        return { valid: false, error: 'Maximum 10 tags allowed' };
      }
      if (tags.some(tag => tag.length > 20)) {
        return { valid: false, error: 'Each tag must be less than 20 characters' };
      }
    }
    return { valid: true };
  }

  /**
   * Validate create task request
   */
  static validateCreateTaskRequest(request: CreateTaskRequest): { valid: boolean; error?: string } {
    // Validate title
    const titleValidation = this.validateTitle(request.title);
    if (!titleValidation.valid) return titleValidation;

    // Validate description
    const descValidation = this.validateDescription(request.description);
    if (!descValidation.valid) return descValidation;

    // Validate due date
    const dueDateValidation = this.validateDueDate(request.dueDate);
    if (!dueDateValidation.valid) return dueDateValidation;

    // Validate priority
    const priorityValidation = this.validatePriority(request.priority);
    if (!priorityValidation.valid) return priorityValidation;

    // Validate category
    const categoryValidation = this.validateCategory(request.category);
    if (!categoryValidation.valid) return categoryValidation;

    // Validate assigned to
    const assignedValidation = this.validateAssignedTo(request.assignedTo);
    if (!assignedValidation.valid) return assignedValidation;

    // Validate reward points
    const rewardValidation = this.validateRewardPoints(request.rewardPoints);
    if (!rewardValidation.valid) return rewardValidation;

    // Validate estimated time
    const timeValidation = this.validateEstimatedTime(request.estimatedTime);
    if (!timeValidation.valid) return timeValidation;

    // Validate recurrence
    const recurrenceValidation = this.validateRecurrence(
      request.recurrence,
      request.recurrenceEndDate
    );
    if (!recurrenceValidation.valid) return recurrenceValidation;

    // Validate tags
    const tagsValidation = this.validateTags(request.tags);
    if (!tagsValidation.valid) return tagsValidation;

    return { valid: true };
  }

  /**
   * Validate update task request
   */
  static validateUpdateTaskRequest(request: UpdateTaskRequest): { valid: boolean; error?: string } {
    if (request.title) {
      const titleValidation = this.validateTitle(request.title);
      if (!titleValidation.valid) return titleValidation;
    }

    if (request.description) {
      const descValidation = this.validateDescription(request.description);
      if (!descValidation.valid) return descValidation;
    }

    if (request.dueDate) {
      const dueDateValidation = this.validateDueDate(request.dueDate);
      if (!dueDateValidation.valid) return dueDateValidation;
    }

    if (request.priority) {
      const priorityValidation = this.validatePriority(request.priority);
      if (!priorityValidation.valid) return priorityValidation;
    }

    if (request.category) {
      const categoryValidation = this.validateCategory(request.category);
      if (!categoryValidation.valid) return categoryValidation;
    }

    if (request.assignedTo) {
      const assignedValidation = this.validateAssignedTo(request.assignedTo);
      if (!assignedValidation.valid) return assignedValidation;
    }

    if (request.rewardPoints !== undefined) {
      const rewardValidation = this.validateRewardPoints(request.rewardPoints);
      if (!rewardValidation.valid) return rewardValidation;
    }

    if (request.estimatedTime !== undefined) {
      const timeValidation = this.validateEstimatedTime(request.estimatedTime);
      if (!timeValidation.valid) return timeValidation;
    }

    if (request.recurrence) {
      const recurrenceValidation = this.validateRecurrence(
        request.recurrence,
        request.recurrenceEndDate
      );
      if (!recurrenceValidation.valid) return recurrenceValidation;
    }

    if (request.tags) {
      const tagsValidation = this.validateTags(request.tags);
      if (!tagsValidation.valid) return tagsValidation;
    }

    return { valid: true };
  }

  /**
   * Validate comment content
   */
  static validateCommentContent(content: string): { valid: boolean; error?: string } {
    if (!content || content.trim().length === 0) {
      return { valid: false, error: 'Comment cannot be empty' };
    }
    if (content.length > 1000) {
      return { valid: false, error: 'Comment must be less than 1000 characters' };
    }
    return { valid: true };
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format time in minutes to human-readable format
 */
export function formatEstimatedTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

/**
 * Check if task is overdue
 */
export function isTaskOverdue(dueDate: string, taskStatus: string): boolean {
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today && taskStatus !== 'completed' && taskStatus !== 'cancelled';
}

/**
 * Check if task is due today
 */
export function isTaskDueToday(dueDate: string): boolean {
  const due = new Date(dueDate);
  const today = new Date();
  return due.toDateString() === today.toDateString();
}

/**
 * Get priority badge color
 */
export function getPriorityColor(priority: TaskPriority): string {
  switch (priority) {
    case TaskPriority.LOW:
      return '#10b981';
    case TaskPriority.MEDIUM:
      return '#f59e0b';
    case TaskPriority.HIGH:
      return '#ef4444';
    case TaskPriority.URGENT:
      return '#dc2626';
    default:
      return '#6b7280';
  }
}

/**
 * Get category icon
 */
export function getCategoryIcon(category: TaskCategory): string {
  switch (category) {
    case TaskCategory.CHORES:
      return '🧹';
    case TaskCategory.HOMEWORK:
      return '📚';
    case TaskCategory.ERRANDS:
      return '🛒';
    case TaskCategory.PERSONAL:
      return '👤';
    case TaskCategory.FAMILY:
      return '👨‍👩‍👧‍👦';
    case TaskCategory.HEALTH:
      return '💪';
    case TaskCategory.OTHER:
      return '📋';
    default:
      return '📝';
  }
}

/**
 * Calculate task completion percentage
 */
export function calculateCompletionPercentage(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}
