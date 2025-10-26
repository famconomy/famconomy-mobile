// Shopping Lists Service - Create Lists, Add Items, Collaborate in Real-time

// ============================================
// ENUMS
// ============================================

export enum ShoppingListStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
  CANCELLED = 'cancelled'
}

export enum ItemStatus {
  PENDING = 'pending',
  PURCHASED = 'purchased',
  UNAVAILABLE = 'unavailable'
}

export enum ItemCategory {
  GROCERIES = 'groceries',
  HOUSEHOLD = 'household',
  CLOTHING = 'clothing',
  ELECTRONICS = 'electronics',
  HEALTH = 'health',
  BEAUTY = 'beauty',
  TOYS = 'toys',
  BOOKS = 'books',
  OTHER = 'other'
}

export enum ListVisibility {
  PRIVATE = 'private',
  FAMILY = 'family'
}

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface ShoppingListItem {
  id: string;
  listId: string;
  name: string;
  description?: string;
  category: ItemCategory;
  quantity: number;
  unit: string; // kg, lbs, pieces, etc.
  estimatedPrice?: number;
  actualPrice?: number;
  status: ItemStatus;
  assignedTo?: string;
  assignedName?: string;
  dueDate?: string;
  notes?: string;
  image?: string;
  barcode?: string;
  createdAt: string;
  updatedAt: string;
  purchasedAt?: string;
  purchasedBy?: string;
}

export interface ShoppingListCollaborator {
  userId: string;
  name: string;
  email: string;
  image?: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: string;
}

export interface ShoppingList {
  id: string;
  familyId: string;
  createdBy: string;
  title: string;
  description?: string;
  status: ShoppingListStatus;
  visibility: ListVisibility;
  items: ShoppingListItem[];
  collaborators: ShoppingListCollaborator[];
  totalItems: number;
  purchasedItems: number;
  estimatedBudget?: number;
  actualSpent?: number;
  dueDate?: string;
  tags: string[];
  color?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface CreateShoppingListRequest {
  title: string;
  description?: string;
  visibility?: ListVisibility;
  dueDate?: string;
  estimatedBudget?: number;
  tags?: string[];
  color?: string;
  icon?: string;
}

export interface UpdateShoppingListRequest extends Partial<CreateShoppingListRequest> {
  status?: ShoppingListStatus;
}

export interface AddItemRequest {
  name: string;
  description?: string;
  category: ItemCategory;
  quantity: number;
  unit: string;
  estimatedPrice?: number;
  dueDate?: string;
  notes?: string;
  barcode?: string;
}

export interface UpdateItemRequest extends Partial<AddItemRequest> {
  status?: ItemStatus;
  assignedTo?: string;
  actualPrice?: number;
}

export interface ShoppingListsResponse {
  lists: ShoppingList[];
  total: number;
  page: number;
  limit: number;
}

export interface ShoppingListFilter {
  familyId: string;
  status?: ShoppingListStatus;
  visibility?: ListVisibility;
  createdBy?: string;
  tags?: string[];
  dueDate?: string;
  page?: number;
  limit?: number;
}

export interface ShoppingListStats {
  totalLists: number;
  activeLists: number;
  completedLists: number;
  totalSpent: number;
  totalBudgeted: number;
  averageItemsPerList: number;
}

export interface ItemSuggestion {
  id: string;
  name: string;
  category: ItemCategory;
  averagePrice?: number;
  frequency: number; // How often this item is purchased
}

// ============================================
// SHOPPING LIST API SERVICE
// ============================================

class ShoppingListApiService {
  private baseUrl = '/api/shopping-lists';
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
    };
  }

  // ==================== LIST CRUD ====================

  /**
   * Create a new shopping list
   */
  async createList(familyId: string, request: CreateShoppingListRequest): Promise<ShoppingList> {
    const response = await fetch(`${this.baseUrl}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ ...request, familyId }),
    });

    if (!response.ok) throw new Error('Failed to create shopping list');
    return response.json();
  }

  /**
   * Get all shopping lists for a family
   */
  async getLists(filter: ShoppingListFilter): Promise<ShoppingListsResponse> {
    const params = new URLSearchParams();
    params.append('familyId', filter.familyId);
    if (filter.status) params.append('status', filter.status);
    if (filter.visibility) params.append('visibility', filter.visibility);
    if (filter.createdBy) params.append('createdBy', filter.createdBy);
    if (filter.tags?.length) params.append('tags', filter.tags.join(','));
    if (filter.dueDate) params.append('dueDate', filter.dueDate);
    if (filter.page) params.append('page', filter.page.toString());
    if (filter.limit) params.append('limit', filter.limit.toString());

    const response = await fetch(`${this.baseUrl}?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch shopping lists');
    return response.json();
  }

  /**
   * Get a single shopping list
   */
  async getList(listId: string): Promise<ShoppingList> {
    const response = await fetch(`${this.baseUrl}/${listId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch shopping list');
    return response.json();
  }

  /**
   * Update a shopping list
   */
  async updateList(
    listId: string,
    request: UpdateShoppingListRequest
  ): Promise<ShoppingList> {
    const response = await fetch(`${this.baseUrl}/${listId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Failed to update shopping list');
    return response.json();
  }

  /**
   * Delete a shopping list
   */
  async deleteList(listId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/${listId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to delete shopping list');
    return response.json();
  }

  /**
   * Complete a shopping list
   */
  async completeList(listId: string): Promise<ShoppingList> {
    const response = await fetch(`${this.baseUrl}/${listId}/complete`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to complete shopping list');
    return response.json();
  }

  /**
   * Archive a shopping list
   */
  async archiveList(listId: string): Promise<ShoppingList> {
    const response = await fetch(`${this.baseUrl}/${listId}/archive`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to archive shopping list');
    return response.json();
  }

  // ==================== LIST COLLABORATION ====================

  /**
   * Add collaborator to list
   */
  async addCollaborator(
    listId: string,
    userId: string,
    role: 'editor' | 'viewer' = 'editor'
  ): Promise<ShoppingList> {
    const response = await fetch(`${this.baseUrl}/${listId}/collaborators`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ userId, role }),
    });

    if (!response.ok) throw new Error('Failed to add collaborator');
    return response.json();
  }

  /**
   * Remove collaborator from list
   */
  async removeCollaborator(listId: string, userId: string): Promise<ShoppingList> {
    const response = await fetch(`${this.baseUrl}/${listId}/collaborators/${userId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to remove collaborator');
    return response.json();
  }

  /**
   * Update collaborator role
   */
  async updateCollaboratorRole(
    listId: string,
    userId: string,
    role: 'editor' | 'viewer'
  ): Promise<ShoppingList> {
    const response = await fetch(`${this.baseUrl}/${listId}/collaborators/${userId}/role`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ role }),
    });

    if (!response.ok) throw new Error('Failed to update collaborator role');
    return response.json();
  }

  // ==================== ITEM MANAGEMENT ====================

  /**
   * Add item to list
   */
  async addItem(listId: string, request: AddItemRequest): Promise<ShoppingListItem> {
    const response = await fetch(`${this.baseUrl}/${listId}/items`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Failed to add item');
    return response.json();
  }

  /**
   * Update item
   */
  async updateItem(
    listId: string,
    itemId: string,
    request: UpdateItemRequest
  ): Promise<ShoppingListItem> {
    const response = await fetch(`${this.baseUrl}/${listId}/items/${itemId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Failed to update item');
    return response.json();
  }

  /**
   * Delete item from list
   */
  async deleteItem(listId: string, itemId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/${listId}/items/${itemId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to delete item');
    return response.json();
  }

  /**
   * Mark item as purchased
   */
  async markItemPurchased(
    listId: string,
    itemId: string,
    actualPrice?: number
  ): Promise<ShoppingListItem> {
    const response = await fetch(`${this.baseUrl}/${listId}/items/${itemId}/purchase`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ actualPrice }),
    });

    if (!response.ok) throw new Error('Failed to mark item as purchased');
    return response.json();
  }

  /**
   * Assign item to user
   */
  async assignItem(listId: string, itemId: string, userId: string): Promise<ShoppingListItem> {
    const response = await fetch(`${this.baseUrl}/${listId}/items/${itemId}/assign`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) throw new Error('Failed to assign item');
    return response.json();
  }

  /**
   * Unassign item
   */
  async unassignItem(listId: string, itemId: string): Promise<ShoppingListItem> {
    const response = await fetch(`${this.baseUrl}/${listId}/items/${itemId}/unassign`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to unassign item');
    return response.json();
  }

  // ==================== BULK OPERATIONS ====================

  /**
   * Add multiple items to list
   */
  async addMultipleItems(listId: string, items: AddItemRequest[]): Promise<ShoppingListItem[]> {
    const response = await fetch(`${this.baseUrl}/${listId}/items/bulk`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ items }),
    });

    if (!response.ok) throw new Error('Failed to add multiple items');
    return response.json();
  }

  /**
   * Mark multiple items as purchased
   */
  async markMultiplePurchased(
    listId: string,
    itemIds: string[]
  ): Promise<{ updated: number }> {
    const response = await fetch(`${this.baseUrl}/${listId}/items/bulk/purchase`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ itemIds }),
    });

    if (!response.ok) throw new Error('Failed to mark items as purchased');
    return response.json();
  }

  /**
   * Delete multiple items
   */
  async deleteMultipleItems(listId: string, itemIds: string[]): Promise<{ deleted: number }> {
    const response = await fetch(`${this.baseUrl}/${listId}/items/bulk`, {
      method: 'DELETE',
      headers: this.getHeaders(),
      body: JSON.stringify({ itemIds }),
    });

    if (!response.ok) throw new Error('Failed to delete items');
    return response.json();
  }

  // ==================== STATISTICS & ANALYTICS ====================

  /**
   * Get shopping lists statistics
   */
  async getStats(familyId: string): Promise<ShoppingListStats> {
    const params = new URLSearchParams({ familyId });

    const response = await fetch(`${this.baseUrl}/stats?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  }

  /**
   * Get spending by category
   */
  async getSpendingByCategory(familyId: string): Promise<Record<string, number>> {
    const params = new URLSearchParams({ familyId });

    const response = await fetch(`${this.baseUrl}/analytics/spending-by-category?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch spending by category');
    return response.json();
  }

  /**
   * Get item suggestions based on history
   */
  async getItemSuggestions(familyId: string): Promise<ItemSuggestion[]> {
    const params = new URLSearchParams({ familyId });

    const response = await fetch(`${this.baseUrl}/suggestions?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch item suggestions');
    return response.json();
  }

  // ==================== TEMPLATES ====================

  /**
   * Create list from template
   */
  async createFromTemplate(
    familyId: string,
    templateId: string
  ): Promise<ShoppingList> {
    const response = await fetch(`${this.baseUrl}/from-template`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ familyId, templateId }),
    });

    if (!response.ok) throw new Error('Failed to create list from template');
    return response.json();
  }

  /**
   * Create template from list
   */
  async createTemplate(
    listId: string,
    templateName: string
  ): Promise<{ templateId: string; success: boolean }> {
    const response = await fetch(`${this.baseUrl}/${listId}/template`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ templateName }),
    });

    if (!response.ok) throw new Error('Failed to create template');
    return response.json();
  }

  // ==================== SHARING ====================

  /**
   * Generate shareable link
   */
  async generateShareLink(listId: string): Promise<{ shareUrl: string; expiresAt: string }> {
    const response = await fetch(`${this.baseUrl}/${listId}/share`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to generate share link');
    return response.json();
  }

  /**
   * Export list as CSV
   */
  async exportAsCSV(listId: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/${listId}/export/csv`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to export list');
    return response.blob();
  }

  /**
   * Export list as PDF
   */
  async exportAsPDF(listId: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/${listId}/export/pdf`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to export list');
    return response.blob();
  }
}

export default new ShoppingListApiService();
