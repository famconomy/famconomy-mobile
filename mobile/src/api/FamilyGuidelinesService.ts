// Family Guidelines Service - Family Values, Mantras, Shared Rules

// ============================================
// ENUMS
// ============================================

export enum GuidelineType {
  VALUE = 'value',
  RULE = 'rule',
  MANTRA = 'mantra',
  GOAL = 'goal'
}

export enum GuidelinePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum GuidelineStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived'
}

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface FamilyGuidelineAcknowledgment {
  userId: string;
  userName: string;
  acknowledgedAt: string;
}

export interface GuidelineComment {
  id: string;
  userId: string;
  userName: string;
  userImage?: string;
  content: string;
  createdAt: string;
}

export interface FamilyGuideline {
  id: string;
  familyId: string;
  createdBy: string;
  title: string;
  description: string;
  type: GuidelineType;
  priority: GuidelinePriority;
  status: GuidelineStatus;
  content: string;
  category?: string;
  icon?: string;
  color?: string;
  tags: string[];
  acknowledgments: FamilyGuidelineAcknowledgment[];
  comments: GuidelineComment[];
  attachments: string[]; // URLs
  createdAt: string;
  updatedAt: string;
}

export interface CreateGuidelineRequest {
  title: string;
  description: string;
  type: GuidelineType;
  priority?: GuidelinePriority;
  content: string;
  category?: string;
  tags?: string[];
  icon?: string;
  color?: string;
}

export interface UpdateGuidelineRequest extends Partial<CreateGuidelineRequest> {
  status?: GuidelineStatus;
}

export interface FamilyGuidelinesResponse {
  guidelines: FamilyGuideline[];
  total: number;
  acknowledgedCount: number;
}

export interface GuidelineFilter {
  familyId: string;
  type?: GuidelineType;
  priority?: GuidelinePriority;
  status?: GuidelineStatus;
  category?: string;
  tags?: string[];
}

export interface FamilyGuidelinesStats {
  totalGuidelines: number;
  activeGuidelines: number;
  acknowledgedByMember: Record<string, number>;
  categoryBreakdown: Record<string, number>;
  priorityBreakdown: Record<string, number>;
}

// ============================================
// FAMILY GUIDELINES API SERVICE
// ============================================

class FamilyGuidelinesApiService {
  private baseUrl = '/api/family-guidelines';
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

  // ==================== GUIDELINE CRUD ====================

  /**
   * Create a new guideline
   */
  async createGuideline(
    familyId: string,
    request: CreateGuidelineRequest
  ): Promise<FamilyGuideline> {
    const response = await fetch(`${this.baseUrl}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ ...request, familyId }),
    });

    if (!response.ok) throw new Error('Failed to create guideline');
    return response.json();
  }

  /**
   * Get all guidelines for a family
   */
  async getGuidelines(filter: GuidelineFilter): Promise<FamilyGuidelinesResponse> {
    const params = new URLSearchParams({ familyId: filter.familyId });
    if (filter.type) params.append('type', filter.type);
    if (filter.priority) params.append('priority', filter.priority);
    if (filter.status) params.append('status', filter.status);
    if (filter.category) params.append('category', filter.category);
    if (filter.tags?.length) params.append('tags', filter.tags.join(','));

    const response = await fetch(`${this.baseUrl}?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch guidelines');
    return response.json();
  }

  /**
   * Get a single guideline
   */
  async getGuideline(guidelineId: string): Promise<FamilyGuideline> {
    const response = await fetch(`${this.baseUrl}/${guidelineId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch guideline');
    return response.json();
  }

  /**
   * Update a guideline
   */
  async updateGuideline(
    guidelineId: string,
    request: UpdateGuidelineRequest
  ): Promise<FamilyGuideline> {
    const response = await fetch(`${this.baseUrl}/${guidelineId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Failed to update guideline');
    return response.json();
  }

  /**
   * Delete a guideline
   */
  async deleteGuideline(guidelineId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/${guidelineId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to delete guideline');
    return response.json();
  }

  /**
   * Archive a guideline
   */
  async archiveGuideline(guidelineId: string): Promise<FamilyGuideline> {
    const response = await fetch(`${this.baseUrl}/${guidelineId}/archive`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to archive guideline');
    return response.json();
  }

  // ==================== ACKNOWLEDGMENTS ====================

  /**
   * Acknowledge a guideline
   */
  async acknowledgeGuideline(guidelineId: string): Promise<FamilyGuideline> {
    const response = await fetch(`${this.baseUrl}/${guidelineId}/acknowledge`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to acknowledge guideline');
    return response.json();
  }

  /**
   * Get unacknowledged guidelines for current user
   */
  async getUnacknowledgedGuidelines(familyId: string): Promise<FamilyGuideline[]> {
    const params = new URLSearchParams({ familyId });

    const response = await fetch(`${this.baseUrl}/unacknowledged?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch unacknowledged guidelines');
    return response.json();
  }

  /**
   * Get acknowledgment status for a guideline
   */
  async getAcknowledgmentStatus(guidelineId: string): Promise<FamilyGuidelineAcknowledgment[]> {
    const response = await fetch(`${this.baseUrl}/${guidelineId}/acknowledgments`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch acknowledgments');
    return response.json();
  }

  // ==================== COMMENTS ====================

  /**
   * Add comment to guideline
   */
  async addComment(guidelineId: string, content: string): Promise<GuidelineComment> {
    const response = await fetch(`${this.baseUrl}/${guidelineId}/comments`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ content }),
    });

    if (!response.ok) throw new Error('Failed to add comment');
    return response.json();
  }

  /**
   * Get guideline comments
   */
  async getComments(guidelineId: string): Promise<GuidelineComment[]> {
    const response = await fetch(`${this.baseUrl}/${guidelineId}/comments`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch comments');
    return response.json();
  }

  /**
   * Delete comment
   */
  async deleteComment(guidelineId: string, commentId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/${guidelineId}/comments/${commentId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to delete comment');
    return response.json();
  }

  // ==================== STATISTICS ====================

  /**
   * Get guidelines statistics
   */
  async getStats(familyId: string): Promise<FamilyGuidelinesStats> {
    const params = new URLSearchParams({ familyId });

    const response = await fetch(`${this.baseUrl}/stats?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  }

  /**
   * Get onboarding guidelines (for new members)
   */
  async getOnboardingGuidelines(familyId: string): Promise<FamilyGuideline[]> {
    const params = new URLSearchParams({ familyId, type: GuidelineType.RULE });

    const response = await fetch(`${this.baseUrl}/onboarding?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch onboarding guidelines');
    return response.json();
  }

  /**
   * Bulk create guidelines
   */
  async bulkCreateGuidelines(
    familyId: string,
    guidelines: CreateGuidelineRequest[]
  ): Promise<FamilyGuideline[]> {
    const response = await fetch(`${this.baseUrl}/bulk`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ familyId, guidelines }),
    });

    if (!response.ok) throw new Error('Failed to bulk create guidelines');
    return response.json();
  }
}

export default new FamilyGuidelinesApiService();
