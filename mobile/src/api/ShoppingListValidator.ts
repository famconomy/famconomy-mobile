// Shopping List Validation Helpers and Utilities

import {
  ItemCategory,
  ListVisibility,
  ShoppingListStatus,
  CreateShoppingListRequest,
  UpdateShoppingListRequest,
  AddItemRequest,
  UpdateItemRequest,
} from './ShoppingListService';

export class ShoppingListValidator {
  /**
   * Validate list title
   */
  static validateTitle(title: string): { valid: boolean; error?: string } {
    if (!title || title.trim().length === 0) {
      return { valid: false, error: 'List title is required' };
    }
    if (title.length < 2) {
      return { valid: false, error: 'List title must be at least 2 characters' };
    }
    if (title.length > 100) {
      return { valid: false, error: 'List title must be less than 100 characters' };
    }
    return { valid: true };
  }

  /**
   * Validate list description
   */
  static validateDescription(description?: string): { valid: boolean; error?: string } {
    if (description && description.length > 500) {
      return { valid: false, error: 'Description must be less than 500 characters' };
    }
    return { valid: true };
  }

  /**
   * Validate visibility
   */
  static validateVisibility(visibility?: string): { valid: boolean; error?: string } {
    if (!visibility) return { valid: true };

    const validVisibilities = Object.values(ListVisibility);
    if (!validVisibilities.includes(visibility as ListVisibility)) {
      return { valid: false, error: 'Invalid visibility setting' };
    }
    return { valid: true };
  }

  /**
   * Validate budget
   */
  static validateBudget(budget?: number): { valid: boolean; error?: string } {
    if (budget !== undefined) {
      if (typeof budget !== 'number' || budget < 0) {
        return { valid: false, error: 'Budget must be a non-negative number' };
      }
      if (budget > 999999) {
        return { valid: false, error: 'Budget is too large' };
      }
    }
    return { valid: true };
  }

  /**
   * Validate due date
   */
  static validateDueDate(dueDate?: string): { valid: boolean; error?: string } {
    if (!dueDate) return { valid: true };

    const date = new Date(dueDate);
    if (isNaN(date.getTime())) {
      return { valid: false, error: 'Invalid due date format' };
    }
    return { valid: true };
  }

  /**
   * Validate tags
   */
  static validateTags(tags?: string[]): { valid: boolean; error?: string } {
    if (!tags) return { valid: true };

    if (!Array.isArray(tags)) {
      return { valid: false, error: 'Tags must be an array' };
    }
    if (tags.length > 10) {
      return { valid: false, error: 'Maximum 10 tags allowed' };
    }
    if (tags.some(tag => tag.length > 20)) {
      return { valid: false, error: 'Each tag must be less than 20 characters' };
    }
    return { valid: true };
  }

  /**
   * Validate color
   */
  static validateColor(color?: string): { valid: boolean; error?: string } {
    if (!color) return { valid: true };

    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexRegex.test(color)) {
      return { valid: false, error: 'Invalid color format. Use hex color (#RRGGBB)' };
    }
    return { valid: true };
  }

  /**
   * Validate create list request
   */
  static validateCreateListRequest(request: CreateShoppingListRequest): { valid: boolean; error?: string } {
    const titleValidation = this.validateTitle(request.title);
    if (!titleValidation.valid) return titleValidation;

    const descValidation = this.validateDescription(request.description);
    if (!descValidation.valid) return descValidation;

    const visibilityValidation = this.validateVisibility(request.visibility);
    if (!visibilityValidation.valid) return visibilityValidation;

    const budgetValidation = this.validateBudget(request.estimatedBudget);
    if (!budgetValidation.valid) return budgetValidation;

    const dueDateValidation = this.validateDueDate(request.dueDate);
    if (!dueDateValidation.valid) return dueDateValidation;

    const tagsValidation = this.validateTags(request.tags);
    if (!tagsValidation.valid) return tagsValidation;

    const colorValidation = this.validateColor(request.color);
    if (!colorValidation.valid) return colorValidation;

    return { valid: true };
  }

  /**
   * Validate update list request
   */
  static validateUpdateListRequest(request: UpdateShoppingListRequest): { valid: boolean; error?: string } {
    if (request.title) {
      const titleValidation = this.validateTitle(request.title);
      if (!titleValidation.valid) return titleValidation;
    }

    if (request.description) {
      const descValidation = this.validateDescription(request.description);
      if (!descValidation.valid) return descValidation;
    }

    if (request.visibility) {
      const visibilityValidation = this.validateVisibility(request.visibility);
      if (!visibilityValidation.valid) return visibilityValidation;
    }

    if (request.estimatedBudget !== undefined) {
      const budgetValidation = this.validateBudget(request.estimatedBudget);
      if (!budgetValidation.valid) return budgetValidation;
    }

    if (request.dueDate) {
      const dueDateValidation = this.validateDueDate(request.dueDate);
      if (!dueDateValidation.valid) return dueDateValidation;
    }

    if (request.tags) {
      const tagsValidation = this.validateTags(request.tags);
      if (!tagsValidation.valid) return tagsValidation;
    }

    if (request.color) {
      const colorValidation = this.validateColor(request.color);
      if (!colorValidation.valid) return colorValidation;
    }

    return { valid: true };
  }

  /**
   * Validate item name
   */
  static validateItemName(name: string): { valid: boolean; error?: string } {
    if (!name || name.trim().length === 0) {
      return { valid: false, error: 'Item name is required' };
    }
    if (name.length < 1) {
      return { valid: false, error: 'Item name is too short' };
    }
    if (name.length > 100) {
      return { valid: false, error: 'Item name is too long' };
    }
    return { valid: true };
  }

  /**
   * Validate item category
   */
  static validateItemCategory(category: string): { valid: boolean; error?: string } {
    const validCategories = Object.values(ItemCategory);
    if (!validCategories.includes(category as ItemCategory)) {
      return { valid: false, error: 'Invalid item category' };
    }
    return { valid: true };
  }

  /**
   * Validate quantity
   */
  static validateQuantity(quantity: number): { valid: boolean; error?: string } {
    if (typeof quantity !== 'number' || quantity <= 0) {
      return { valid: false, error: 'Quantity must be a positive number' };
    }
    if (quantity > 10000) {
      return { valid: false, error: 'Quantity is too large' };
    }
    return { valid: true };
  }

  /**
   * Validate unit
   */
  static validateUnit(unit: string): { valid: boolean; error?: string } {
    if (!unit || unit.trim().length === 0) {
      return { valid: false, error: 'Unit is required' };
    }
    if (unit.length > 20) {
      return { valid: false, error: 'Unit is too long' };
    }
    return { valid: true };
  }

  /**
   * Validate price
   */
  static validatePrice(price?: number): { valid: boolean; error?: string } {
    if (price !== undefined) {
      if (typeof price !== 'number' || price < 0) {
        return { valid: false, error: 'Price must be a non-negative number' };
      }
      if (price > 999999) {
        return { valid: false, error: 'Price is too large' };
      }
    }
    return { valid: true };
  }

  /**
   * Validate add item request
   */
  static validateAddItemRequest(request: AddItemRequest): { valid: boolean; error?: string } {
    const nameValidation = this.validateItemName(request.name);
    if (!nameValidation.valid) return nameValidation;

    const categoryValidation = this.validateItemCategory(request.category);
    if (!categoryValidation.valid) return categoryValidation;

    const quantityValidation = this.validateQuantity(request.quantity);
    if (!quantityValidation.valid) return quantityValidation;

    const unitValidation = this.validateUnit(request.unit);
    if (!unitValidation.valid) return unitValidation;

    const priceValidation = this.validatePrice(request.estimatedPrice);
    if (!priceValidation.valid) return priceValidation;

    const dueDateValidation = this.validateDueDate(request.dueDate);
    if (!dueDateValidation.valid) return dueDateValidation;

    return { valid: true };
  }

  /**
   * Validate update item request
   */
  static validateUpdateItemRequest(request: UpdateItemRequest): { valid: boolean; error?: string } {
    if (request.name) {
      const nameValidation = this.validateItemName(request.name);
      if (!nameValidation.valid) return nameValidation;
    }

    if (request.category) {
      const categoryValidation = this.validateItemCategory(request.category);
      if (!categoryValidation.valid) return categoryValidation;
    }

    if (request.quantity !== undefined) {
      const quantityValidation = this.validateQuantity(request.quantity);
      if (!quantityValidation.valid) return quantityValidation;
    }

    if (request.unit) {
      const unitValidation = this.validateUnit(request.unit);
      if (!unitValidation.valid) return unitValidation;
    }

    if (request.estimatedPrice !== undefined) {
      const priceValidation = this.validatePrice(request.estimatedPrice);
      if (!priceValidation.valid) return priceValidation;
    }

    if (request.actualPrice !== undefined) {
      const priceValidation = this.validatePrice(request.actualPrice);
      if (!priceValidation.valid) return priceValidation;
    }

    if (request.dueDate) {
      const dueDateValidation = this.validateDueDate(request.dueDate);
      if (!dueDateValidation.valid) return dueDateValidation;
    }

    return { valid: true };
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get item category icon/emoji
 */
export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    groceries: '🛒',
    household: '🏠',
    clothing: '👕',
    electronics: '📱',
    health: '💊',
    beauty: '💄',
    toys: '🧸',
    books: '📚',
    other: '📝',
  };

  return icons[category] || '📝';
}

/**
 * Get item category color
 */
export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    groceries: '#10b981',
    household: '#8b5cf6',
    clothing: '#ec4899',
    electronics: '#3b82f6',
    health: '#ef4444',
    beauty: '#f59e0b',
    toys: '#06b6d4',
    books: '#6366f1',
    other: '#6b7280',
  };

  return colors[category] || '#6b7280';
}

/**
 * Calculate list completion percentage
 */
export function calculateCompletionPercentage(
  purchasedItems: number,
  totalItems: number
): number {
  if (totalItems === 0) return 0;
  return Math.round((purchasedItems / totalItems) * 100);
}

/**
 * Calculate budget remaining
 */
export function calculateBudgetRemaining(
  estimatedBudget: number,
  actualSpent: number
): number {
  return Math.max(0, estimatedBudget - actualSpent);
}

/**
 * Check if over budget
 */
export function isOverBudget(estimatedBudget: number, actualSpent: number): boolean {
  return actualSpent > estimatedBudget;
}

/**
 * Format price for display
 */
export function formatPrice(price: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(price);
}

/**
 * Get days until due
 */
export function getDaysUntilDue(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();

  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Check if list is overdue
 */
export function isListOverdue(dueDate?: string, status?: string): boolean {
  if (!dueDate || status === 'completed' || status === 'archived') return false;

  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return due < today;
}

/**
 * Check if list is due soon (within 3 days)
 */
export function isListDueSoon(dueDate?: string): boolean {
  if (!dueDate) return false;

  const days = getDaysUntilDue(dueDate);
  return days > 0 && days <= 3;
}

/**
 * Get list progress status text
 */
export function getListProgressText(
  purchasedItems: number,
  totalItems: number
): string {
  if (totalItems === 0) return 'No items';
  const percentage = calculateCompletionPercentage(purchasedItems, totalItems);
  return `${purchasedItems}/${totalItems} items (${percentage}%)`;
}

/**
 * Sort items by category
 */
export function sortItemsByCategory(items: any[]): Record<string, any[]> {
  return items.reduce((acc, item) => {
    const category = item.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});
}

/**
 * Get total cost of items
 */
export function getTotalCost(items: any[], useActual: boolean = false): number {
  return items.reduce((total, item) => {
    if (useActual) {
      return total + (item.actualPrice || item.estimatedPrice || 0) * item.quantity;
    }
    return total + (item.estimatedPrice || 0) * item.quantity;
  }, 0);
}

/**
 * Filter items by status
 */
export function filterItemsByStatus(
  items: any[],
  status: 'pending' | 'purchased' | 'unavailable'
): any[] {
  return items.filter(item => item.status === status);
}

/**
 * Get unpurchased items
 */
export function getUnpurchasedItems(items: any[]): any[] {
  return filterItemsByStatus(items, 'pending');
}

/**
 * Get purchased items
 */
export function getPurchasedItems(items: any[]): any[] {
  return filterItemsByStatus(items, 'purchased');
}

/**
 * Generate list summary
 */
export function generateListSummary(list: any): string {
  const completion = calculateCompletionPercentage(list.purchasedItems, list.totalItems);
  const cost = list.actualSpent || 0;

  return `${list.title} - ${completion}% complete, $${cost.toFixed(2)} spent`;
}
