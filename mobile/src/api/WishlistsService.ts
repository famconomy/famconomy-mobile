// Wishlists Service - Personal Wishlists, Sharing, Claiming Items

// ============================================
// ENUMS
// ============================================

export enum WishlistVisibility {
  PRIVATE = 'private',
  FAMILY = 'family',
  SPECIFIC_MEMBERS = 'specific_members'
}

export enum WishItemStatus {
  UNCLAIMED = 'unclaimed',
  CLAIMED = 'claimed',
  PURCHASED = 'purchased',
  RECEIVED = 'received'
}

export enum WishItemPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum WishlistCategory {
  BIRTHDAY = 'birthday',
  HOLIDAY = 'holiday',
  ANNIVERSARY = 'anniversary',
  GRADUATION = 'graduation',
  WEDDING = 'wedding',
  VACATION = 'vacation',
  GENERAL = 'general'
}

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface WishItem {
  id: string;
  wishlistId: string;
  name: string;
  description?: string;
  category?: string;
  price?: number;
  currency?: string;
  image?: string;
  url?: string;
  priority: WishItemPriority;
  status: WishItemStatus;
  notes?: string;
  claimedBy?: {
    userId: string;
    userName: string;
    claimedAt: string;
  };
  addedAt: string;
  completedAt?: string;
}

export interface WishlistCollaborator {
  userId: string;
  name: string;
  email: string;
  image?: string;
  canEdit: boolean;
  canView: boolean;
  addedAt: string;
}

export interface Wishlist {
  id: string;
  familyId: string;
  ownerId: string;
  ownerName: string;
  ownerImage?: string;
  title: string;
  description?: string;
  category: WishlistCategory;
  visibility: WishlistVisibility;
  sharedWith?: string[]; // User IDs if visibility is SPECIFIC_MEMBERS
  items: WishItem[];
  collaborators: WishlistCollaborator[];
  totalItems: number;
  claimedItems: number;
  purchasedItems: number;
  eventDate?: string;
  budget?: number;
  spentAmount?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

export interface CreateWishlistRequest {
  title: string;
  description?: string;
  category: WishlistCategory;
  visibility?: WishlistVisibility;
  sharedWith?: string[];
  eventDate?: string;
  budget?: number;
}

export interface UpdateWishlistRequest extends Partial<CreateWishlistRequest> {}

export interface AddWishItemRequest {
  name: string;
  description?: string;
  category?: string;
  price?: number;
  currency?: string;
  image?: string;
  url?: string;
  priority?: WishItemPriority;
  notes?: string;
}

export interface UpdateWishItemRequest extends Partial<AddWishItemRequest> {
  status?: WishItemStatus;
}

export interface WishlistsResponse {
  wishlists: Wishlist[];
  total: number;
  page: number;
  limit: number;
}

export interface WishlistFilter {
  familyId: string;
  ownerId?: string;
  visibility?: WishlistVisibility;
  category?: WishlistCategory;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface ClaimItemRequest {
  quantity?: number;
  notes?: string;
}

export interface WishlistStats {
  totalWishlists: number;
  activeWishlists: number;
  totalItems: number;
  claimedItems: number;
  purchasedItems: number;
  totalBudget: number;
  totalSpent: number;
}

// ============================================
// WISHLISTS API SERVICE
// ============================================

class WishlistsApiService {
  private baseUrl = '/api/wishlists';
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

  // ==================== WISHLIST CRUD ====================

  /**
   * Create a new wishlist
   */
  async createWishlist(familyId: string, request: CreateWishlistRequest): Promise<Wishlist> {
    const response = await fetch(`${this.baseUrl}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ ...request, familyId }),
    });

    if (!response.ok) throw new Error('Failed to create wishlist');
    return response.json();
  }

  /**
   * Get wishlists with filtering
   */
  async getWishlists(filter: WishlistFilter): Promise<WishlistsResponse> {
    const params = new URLSearchParams();
    params.append('familyId', filter.familyId);
    if (filter.ownerId) params.append('ownerId', filter.ownerId);
    if (filter.visibility) params.append('visibility', filter.visibility);
    if (filter.category) params.append('category', filter.category);
    if (filter.isActive !== undefined) params.append('isActive', filter.isActive.toString());
    if (filter.page) params.append('page', filter.page.toString());
    if (filter.limit) params.append('limit', filter.limit.toString());

    const response = await fetch(`${this.baseUrl}?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch wishlists');
    return response.json();
  }

  /**
   * Get a single wishlist
   */
  async getWishlist(wishlistId: string): Promise<Wishlist> {
    const response = await fetch(`${this.baseUrl}/${wishlistId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch wishlist');
    return response.json();
  }

  /**
   * Update a wishlist
   */
  async updateWishlist(wishlistId: string, request: UpdateWishlistRequest): Promise<Wishlist> {
    const response = await fetch(`${this.baseUrl}/${wishlistId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Failed to update wishlist');
    return response.json();
  }

  /**
   * Delete a wishlist
   */
  async deleteWishlist(wishlistId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/${wishlistId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to delete wishlist');
    return response.json();
  }

  /**
   * Archive a wishlist
   */
  async archiveWishlist(wishlistId: string): Promise<Wishlist> {
    const response = await fetch(`${this.baseUrl}/${wishlistId}/archive`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to archive wishlist');
    return response.json();
  }

  /**
   * Restore archived wishlist
   */
  async restoreWishlist(wishlistId: string): Promise<Wishlist> {
    const response = await fetch(`${this.baseUrl}/${wishlistId}/restore`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to restore wishlist');
    return response.json();
  }

  // ==================== WISHLIST ITEMS ====================

  /**
   * Add item to wishlist
   */
  async addItem(wishlistId: string, request: AddWishItemRequest): Promise<WishItem> {
    const response = await fetch(`${this.baseUrl}/${wishlistId}/items`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Failed to add item');
    return response.json();
  }

  /**
   * Update wishlist item
   */
  async updateItem(wishlistId: string, itemId: string, request: UpdateWishItemRequest): Promise<WishItem> {
    const response = await fetch(`${this.baseUrl}/${wishlistId}/items/${itemId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Failed to update item');
    return response.json();
  }

  /**
   * Delete item from wishlist
   */
  async deleteItem(wishlistId: string, itemId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/${wishlistId}/items/${itemId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to delete item');
    return response.json();
  }

  /**
   * Bulk add items to wishlist
   */
  async addMultipleItems(wishlistId: string, items: AddWishItemRequest[]): Promise<WishItem[]> {
    const response = await fetch(`${this.baseUrl}/${wishlistId}/items/bulk`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ items }),
    });

    if (!response.ok) throw new Error('Failed to add multiple items');
    return response.json();
  }

  // ==================== ITEM CLAIMING ====================

  /**
   * Claim a wishlist item
   */
  async claimItem(wishlistId: string, itemId: string, request?: ClaimItemRequest): Promise<WishItem> {
    const response = await fetch(`${this.baseUrl}/${wishlistId}/items/${itemId}/claim`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request || {}),
    });

    if (!response.ok) throw new Error('Failed to claim item');
    return response.json();
  }

  /**
   * Unclaim a wishlist item
   */
  async unclaimItem(wishlistId: string, itemId: string): Promise<WishItem> {
    const response = await fetch(`${this.baseUrl}/${wishlistId}/items/${itemId}/unclaim`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to unclaim item');
    return response.json();
  }

  /**
   * Mark item as purchased
   */
  async markPurchased(wishlistId: string, itemId: string, amount?: number): Promise<WishItem> {
    const response = await fetch(`${this.baseUrl}/${wishlistId}/items/${itemId}/purchased`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ amount }),
    });

    if (!response.ok) throw new Error('Failed to mark item as purchased');
    return response.json();
  }

  /**
   * Mark item as received
   */
  async markReceived(wishlistId: string, itemId: string): Promise<WishItem> {
    const response = await fetch(`${this.baseUrl}/${wishlistId}/items/${itemId}/received`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to mark item as received');
    return response.json();
  }

  // ==================== SHARING & COLLABORATION ====================

  /**
   * Share wishlist with members
   */
  async shareWishlist(wishlistId: string, userIds: string[]): Promise<Wishlist> {
    const response = await fetch(`${this.baseUrl}/${wishlistId}/share`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ userIds }),
    });

    if (!response.ok) throw new Error('Failed to share wishlist');
    return response.json();
  }

  /**
   * Add collaborator to wishlist
   */
  async addCollaborator(
    wishlistId: string,
    userId: string,
    permissions?: { canEdit: boolean; canView: boolean }
  ): Promise<Wishlist> {
    const response = await fetch(`${this.baseUrl}/${wishlistId}/collaborators`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ userId, ...permissions }),
    });

    if (!response.ok) throw new Error('Failed to add collaborator');
    return response.json();
  }

  /**
   * Remove collaborator from wishlist
   */
  async removeCollaborator(wishlistId: string, userId: string): Promise<Wishlist> {
    const response = await fetch(`${this.baseUrl}/${wishlistId}/collaborators/${userId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to remove collaborator');
    return response.json();
  }

  /**
   * Update collaborator permissions
   */
  async updateCollaboratorPermissions(
    wishlistId: string,
    userId: string,
    permissions: { canEdit: boolean; canView: boolean }
  ): Promise<Wishlist> {
    const response = await fetch(`${this.baseUrl}/${wishlistId}/collaborators/${userId}/permissions`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(permissions),
    });

    if (!response.ok) throw new Error('Failed to update permissions');
    return response.json();
  }

  /**
   * Generate shareable link
   */
  async generateShareLink(wishlistId: string, expiresIn?: number): Promise<{ shareUrl: string; expiresAt: string }> {
    const response = await fetch(`${this.baseUrl}/${wishlistId}/generate-share-link`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ expiresIn }),
    });

    if (!response.ok) throw new Error('Failed to generate share link');
    return response.json();
  }

  // ==================== NOTIFICATIONS & REMINDERS ====================

  /**
   * Get unclaimed items for a wishlist
   */
  async getUnclaimedItems(wishlistId: string): Promise<WishItem[]> {
    const response = await fetch(`${this.baseUrl}/${wishlistId}/unclaimed-items`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch unclaimed items');
    return response.json();
  }

  /**
   * Get claimed items by current user
   */
  async getMyClaimedItems(familyId: string): Promise<WishItem[]> {
    const params = new URLSearchParams({ familyId });

    const response = await fetch(`${this.baseUrl}/my-claimed-items?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch claimed items');
    return response.json();
  }

  // ==================== STATISTICS & ANALYTICS ====================

  /**
   * Get wishlists statistics
   */
  async getStats(familyId: string): Promise<WishlistStats> {
    const params = new URLSearchParams({ familyId });

    const response = await fetch(`${this.baseUrl}/stats?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  }

  /**
   * Get upcoming events with wishlists
   */
  async getUpcomingEvents(familyId: string, days: number = 90): Promise<any[]> {
    const params = new URLSearchParams({ familyId, days: days.toString() });

    const response = await fetch(`${this.baseUrl}/upcoming-events?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch upcoming events');
    return response.json();
  }

  // ==================== IMPORT/EXPORT ====================

  /**
   * Export wishlist as PDF
   */
  async exportPDF(wishlistId: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/${wishlistId}/export/pdf`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to export wishlist');
    return response.blob();
  }

  /**
   * Export wishlist as CSV
   */
  async exportCSV(wishlistId: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/${wishlistId}/export/csv`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to export wishlist');
    return response.blob();
  }

  /**
   * Duplicate wishlist
   */
  async duplicateWishlist(wishlistId: string, newTitle?: string): Promise<Wishlist> {
    const response = await fetch(`${this.baseUrl}/${wishlistId}/duplicate`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ newTitle }),
    });

    if (!response.ok) throw new Error('Failed to duplicate wishlist');
    return response.json();
  }

  /**
   * Search wishlists
   */
  async searchWishlists(familyId: string, query: string): Promise<Wishlist[]> {
    const params = new URLSearchParams({ familyId, query });

    const response = await fetch(`${this.baseUrl}/search?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to search wishlists');
    return response.json();
  }
}

export default new WishlistsApiService();
