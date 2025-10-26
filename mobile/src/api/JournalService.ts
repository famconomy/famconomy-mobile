// Journal Service - Private Diary Entries with Rich Text

// ============================================
// ENUMS
// ============================================

export enum JournalMood {
  VERY_SAD = 'very_sad',
  SAD = 'sad',
  NEUTRAL = 'neutral',
  HAPPY = 'happy',
  VERY_HAPPY = 'very_happy'
}

export enum JournalEntryStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

export enum JournalPrivacy {
  PRIVATE = 'private',
  FAMILY = 'family',
  SPECIFIC_MEMBERS = 'specific_members'
}

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface JournalAttachment {
  id: string;
  url: string;
  type: 'image' | 'video' | 'audio' | 'file';
  name: string;
  uploadedAt: string;
}

export interface JournalEntry {
  id: string;
  familyId: string;
  userId: string;
  userName: string;
  userImage?: string;
  title: string;
  content: string;
  richContent?: any; // Rich text editor format
  mood?: JournalMood;
  tags: string[];
  attachments: JournalAttachment[];
  status: JournalEntryStatus;
  privacy: JournalPrivacy;
  sharedWith?: string[]; // User IDs if privacy is SPECIFIC_MEMBERS
  likes: number;
  likedBy: string[];
  comments: JournalComment[];
  views: number;
  viewedBy: string[];
  createdAt: string;
  updatedAt: string;
  scheduledPublishAt?: string;
}

export interface JournalComment {
  id: string;
  userId: string;
  userName: string;
  userImage?: string;
  content: string;
  createdAt: string;
  likes: number;
}

export interface JournalPrompt {
  id: string;
  title: string;
  description: string;
  category: string;
}

export interface CreateJournalEntryRequest {
  title: string;
  content: string;
  richContent?: any;
  mood?: JournalMood;
  tags?: string[];
  status?: JournalEntryStatus;
  privacy?: JournalPrivacy;
  sharedWith?: string[];
  scheduledPublishAt?: string;
}

export interface UpdateJournalEntryRequest extends Partial<CreateJournalEntryRequest> {}

export interface JournalEntriesResponse {
  entries: JournalEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface JournalFilter {
  familyId: string;
  userId?: string;
  status?: JournalEntryStatus;
  privacy?: JournalPrivacy;
  mood?: JournalMood;
  tags?: string[];
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface JournalStats {
  totalEntries: number;
  thisMonthEntries: number;
  thisWeekEntries: number;
  averageEntryLength: number;
  mostUsedMood: JournalMood;
  mostUsedTags: string[];
  streakDays: number;
}

export interface JournalMoodStats {
  mood: JournalMood;
  count: number;
  percentage: number;
}

export interface AddJournalCommentRequest {
  content: string;
}

// ============================================
// JOURNAL API SERVICE
// ============================================

class JournalApiService {
  private baseUrl = '/api/journal';
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

  // ==================== ENTRY CRUD ====================

  /**
   * Create a journal entry
   */
  async createEntry(familyId: string, request: CreateJournalEntryRequest): Promise<JournalEntry> {
    const response = await fetch(`${this.baseUrl}/entries`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ ...request, familyId }),
    });

    if (!response.ok) throw new Error('Failed to create journal entry');
    return response.json();
  }

  /**
   * Get journal entries with filtering
   */
  async getEntries(filter: JournalFilter): Promise<JournalEntriesResponse> {
    const params = new URLSearchParams();
    params.append('familyId', filter.familyId);
    if (filter.userId) params.append('userId', filter.userId);
    if (filter.status) params.append('status', filter.status);
    if (filter.privacy) params.append('privacy', filter.privacy);
    if (filter.mood) params.append('mood', filter.mood);
    if (filter.tags?.length) params.append('tags', filter.tags.join(','));
    if (filter.startDate) params.append('startDate', filter.startDate);
    if (filter.endDate) params.append('endDate', filter.endDate);
    if (filter.page) params.append('page', filter.page.toString());
    if (filter.limit) params.append('limit', filter.limit.toString());

    const response = await fetch(`${this.baseUrl}/entries?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch journal entries');
    return response.json();
  }

  /**
   * Get a single journal entry
   */
  async getEntry(entryId: string): Promise<JournalEntry> {
    const response = await fetch(`${this.baseUrl}/entries/${entryId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch journal entry');
    return response.json();
  }

  /**
   * Update a journal entry
   */
  async updateEntry(
    entryId: string,
    request: UpdateJournalEntryRequest
  ): Promise<JournalEntry> {
    const response = await fetch(`${this.baseUrl}/entries/${entryId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Failed to update journal entry');
    return response.json();
  }

  /**
   * Delete a journal entry
   */
  async deleteEntry(entryId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/entries/${entryId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to delete journal entry');
    return response.json();
  }

  /**
   * Publish a draft entry
   */
  async publishEntry(entryId: string): Promise<JournalEntry> {
    const response = await fetch(`${this.baseUrl}/entries/${entryId}/publish`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to publish entry');
    return response.json();
  }

  /**
   * Archive an entry
   */
  async archiveEntry(entryId: string): Promise<JournalEntry> {
    const response = await fetch(`${this.baseUrl}/entries/${entryId}/archive`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to archive entry');
    return response.json();
  }

  /**
   * Schedule entry publication
   */
  async schedulePublish(entryId: string, publishAt: string): Promise<JournalEntry> {
    const response = await fetch(`${this.baseUrl}/entries/${entryId}/schedule`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ publishAt }),
    });

    if (!response.ok) throw new Error('Failed to schedule publication');
    return response.json();
  }

  // ==================== ATTACHMENT OPERATIONS ====================

  /**
   * Upload attachment to entry
   */
  async uploadAttachment(entryId: string, file: File): Promise<JournalAttachment> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/entries/${entryId}/attachments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    });

    if (!response.ok) throw new Error('Failed to upload attachment');
    return response.json();
  }

  /**
   * Remove attachment
   */
  async removeAttachment(entryId: string, attachmentId: string): Promise<{ success: boolean }> {
    const response = await fetch(
      `${this.baseUrl}/entries/${entryId}/attachments/${attachmentId}`,
      {
        method: 'DELETE',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) throw new Error('Failed to remove attachment');
    return response.json();
  }

  // ==================== COMMENTS & REACTIONS ====================

  /**
   * Add comment to entry
   */
  async addComment(entryId: string, request: AddJournalCommentRequest): Promise<JournalComment> {
    const response = await fetch(`${this.baseUrl}/entries/${entryId}/comments`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Failed to add comment');
    return response.json();
  }

  /**
   * Get entry comments
   */
  async getComments(entryId: string): Promise<JournalComment[]> {
    const response = await fetch(`${this.baseUrl}/entries/${entryId}/comments`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch comments');
    return response.json();
  }

  /**
   * Delete comment
   */
  async deleteComment(entryId: string, commentId: string): Promise<{ success: boolean }> {
    const response = await fetch(
      `${this.baseUrl}/entries/${entryId}/comments/${commentId}`,
      {
        method: 'DELETE',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) throw new Error('Failed to delete comment');
    return response.json();
  }

  /**
   * Like entry
   */
  async likeEntry(entryId: string): Promise<JournalEntry> {
    const response = await fetch(`${this.baseUrl}/entries/${entryId}/like`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to like entry');
    return response.json();
  }

  /**
   * Unlike entry
   */
  async unlikeEntry(entryId: string): Promise<JournalEntry> {
    const response = await fetch(`${this.baseUrl}/entries/${entryId}/unlike`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to unlike entry');
    return response.json();
  }

  /**
   * Like comment
   */
  async likeComment(entryId: string, commentId: string): Promise<JournalComment> {
    const response = await fetch(
      `${this.baseUrl}/entries/${entryId}/comments/${commentId}/like`,
      {
        method: 'POST',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) throw new Error('Failed to like comment');
    return response.json();
  }

  // ==================== SHARING & PRIVACY ====================

  /**
   * Share entry with specific members
   */
  async shareEntry(entryId: string, userIds: string[]): Promise<JournalEntry> {
    const response = await fetch(`${this.baseUrl}/entries/${entryId}/share`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ userIds }),
    });

    if (!response.ok) throw new Error('Failed to share entry');
    return response.json();
  }

  /**
   * Unshare entry from member
   */
  async unshareEntry(entryId: string, userId: string): Promise<JournalEntry> {
    const response = await fetch(`${this.baseUrl}/entries/${entryId}/unshare/${userId}`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to unshare entry');
    return response.json();
  }

  /**
   * Make entry public to family
   */
  async makeEntryFamilyPublic(entryId: string): Promise<JournalEntry> {
    const response = await fetch(`${this.baseUrl}/entries/${entryId}/make-family-public`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to make entry family public');
    return response.json();
  }

  /**
   * Make entry private
   */
  async makeEntryPrivate(entryId: string): Promise<JournalEntry> {
    const response = await fetch(`${this.baseUrl}/entries/${entryId}/make-private`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to make entry private');
    return response.json();
  }

  // ==================== STATISTICS & ANALYTICS ====================

  /**
   * Get journal statistics
   */
  async getJournalStats(familyId: string, userId: string): Promise<JournalStats> {
    const params = new URLSearchParams({ familyId, userId });

    const response = await fetch(`${this.baseUrl}/stats?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch journal stats');
    return response.json();
  }

  /**
   * Get mood statistics
   */
  async getMoodStats(familyId: string, userId: string): Promise<JournalMoodStats[]> {
    const params = new URLSearchParams({ familyId, userId });

    const response = await fetch(`${this.baseUrl}/mood-stats?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch mood stats');
    return response.json();
  }

  /**
   * Get writing streak
   */
  async getWritingStreak(familyId: string, userId: string): Promise<{ streak: number; lastWriteDate: string }> {
    const params = new URLSearchParams({ familyId, userId });

    const response = await fetch(`${this.baseUrl}/writing-streak?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch writing streak');
    return response.json();
  }

  // ==================== PROMPTS & SUGGESTIONS ====================

  /**
   * Get writing prompts
   */
  async getPrompts(): Promise<JournalPrompt[]> {
    const response = await fetch(`${this.baseUrl}/prompts`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch prompts');
    return response.json();
  }

  /**
   * Get prompt by category
   */
  async getPromptsByCategory(category: string): Promise<JournalPrompt[]> {
    const params = new URLSearchParams({ category });

    const response = await fetch(`${this.baseUrl}/prompts?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch prompts');
    return response.json();
  }

  // ==================== SEARCH & EXPORT ====================

  /**
   * Search entries
   */
  async searchEntries(
    familyId: string,
    query: string
  ): Promise<JournalEntry[]> {
    const params = new URLSearchParams({ familyId, query });

    const response = await fetch(`${this.baseUrl}/search?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to search entries');
    return response.json();
  }

  /**
   * Export entries as PDF
   */
  async exportAsPDF(
    familyId: string,
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<Blob> {
    const params = new URLSearchParams({ familyId, userId });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await fetch(`${this.baseUrl}/export/pdf?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to export journal');
    return response.blob();
  }

  /**
   * Export entries as JSON
   */
  async exportAsJSON(
    familyId: string,
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<Blob> {
    const params = new URLSearchParams({ familyId, userId });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await fetch(`${this.baseUrl}/export/json?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to export journal');
    return response.blob();
  }

  /**
   * Record voice entry
   */
  async recordVoiceEntry(
    familyId: string,
    audioBlob: Blob,
    title: string,
    mood?: JournalMood,
    tags?: string[]
  ): Promise<JournalEntry> {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('familyId', familyId);
    formData.append('title', title);
    if (mood) formData.append('mood', mood);
    if (tags?.length) formData.append('tags', JSON.stringify(tags));

    const response = await fetch(`${this.baseUrl}/voice-entry`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    });

    if (!response.ok) throw new Error('Failed to record voice entry');
    return response.json();
  }
}

export default new JournalApiService();
