// Member Profiles Service - Enhanced Profile Views with Stats

// ============================================
// ENUMS
// ============================================

export enum ProfileVisibility {
  PRIVATE = 'private',
  FAMILY = 'family',
  PUBLIC = 'public'
}

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface MemberProfile {
  userId: string;
  familyId: string;
  name: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  image?: string;
  bannerImage?: string;
  bio?: string;
  role: 'admin' | 'parent' | 'teen' | 'child';
  joinedAt: string;
  lastActiveAt: string;
  visibility: ProfileVisibility;
  social?: {
    instagram?: string;
    twitter?: string;
    facebook?: string;
  };
  preferences?: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    notifications: boolean;
    emailUpdates: boolean;
  };
  stats: MemberStats;
  badges: MemberBadge[];
  achievements: Achievement[];
}

export interface MemberStats {
  totalTasks: number;
  completedTasks: number;
  totalPoints: number;
  totalRewards: number;
  currentStreak: number;
  longestStreak: number;
  tasksCompletedThisWeek: number;
  tasksCompletedThisMonth: number;
  averageCompletionTime: number; // in minutes
  contributionScore: number; // 0-100
}

export interface MemberBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  progress: number;
  target: number;
  earnedAt?: string;
  type: 'task' | 'streak' | 'points' | 'milestone';
}

export interface MemberActivity {
  id: string;
  userId: string;
  userName: string;
  type: 'task_completed' | 'task_created' | 'message_sent' | 'event_created' | 'recipe_shared';
  description: string;
  timestamp: string;
  relatedItem?: {
    id: string;
    title: string;
  };
}

export interface MemberContribution {
  userId: string;
  userName: string;
  tasksCreated: number;
  tasksCompleted: number;
  eventsCreated: number;
  recipesShared: number;
  messagesCount: number;
  contributionPercentage: number;
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  image?: string;
  bannerImage?: string;
  bio?: string;
  visibility?: ProfileVisibility;
  social?: {
    instagram?: string;
    twitter?: string;
    facebook?: string;
  };
  preferences?: {
    theme?: 'light' | 'dark' | 'auto';
    language?: string;
    notifications?: boolean;
    emailUpdates?: boolean;
  };
}

export interface ProfilesResponse {
  profiles: MemberProfile[];
  total: number;
  page: number;
  limit: number;
}

// ============================================
// MEMBER PROFILES API SERVICE
// ============================================

class MemberProfilesApiService {
  private baseUrl = '/api/member-profiles';
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

  // ==================== PROFILE OPERATIONS ====================

  /**
   * Get current user's profile
   */
  async getMyProfile(): Promise<MemberProfile> {
    const response = await fetch(`${this.baseUrl}/me`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch profile');
    return response.json();
  }

  /**
   * Get member profile by ID
   */
  async getMemberProfile(userId: string): Promise<MemberProfile> {
    const response = await fetch(`${this.baseUrl}/${userId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch member profile');
    return response.json();
  }

  /**
   * Get all family members' profiles
   */
  async getFamilyProfiles(
    familyId: string,
    page?: number,
    limit?: number
  ): Promise<ProfilesResponse> {
    const params = new URLSearchParams({ familyId });
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());

    const response = await fetch(`${this.baseUrl}?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch family profiles');
    return response.json();
  }

  /**
   * Update profile
   */
  async updateProfile(request: UpdateProfileRequest): Promise<MemberProfile> {
    const response = await fetch(`${this.baseUrl}/me`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Failed to update profile');
    return response.json();
  }

  /**
   * Upload profile picture
   */
  async uploadProfilePicture(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/me/profile-picture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    });

    if (!response.ok) throw new Error('Failed to upload profile picture');
    return response.json();
  }

  /**
   * Upload banner picture
   */
  async uploadBannerPicture(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/me/banner-picture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    });

    if (!response.ok) throw new Error('Failed to upload banner picture');
    return response.json();
  }

  // ==================== STATISTICS & ANALYTICS ====================

  /**
   * Get member stats
   */
  async getMemberStats(userId: string): Promise<MemberStats> {
    const response = await fetch(`${this.baseUrl}/${userId}/stats`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch member stats');
    return response.json();
  }

  /**
   * Get family contribution breakdown
   */
  async getFamilyContributions(familyId: string): Promise<MemberContribution[]> {
    const params = new URLSearchParams({ familyId });

    const response = await fetch(`${this.baseUrl}/contributions?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch contributions');
    return response.json();
  }

  /**
   * Get member activity feed
   */
  async getMemberActivity(
    userId: string,
    limit?: number,
    offset?: number
  ): Promise<MemberActivity[]> {
    const params = new URLSearchParams({ userId });
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());

    const response = await fetch(`${this.baseUrl}/${userId}/activity?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch activity');
    return response.json();
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(
    familyId: string,
    metric: 'points' | 'tasks' | 'streak' | 'contribution',
    period: 'week' | 'month' | 'all'
  ): Promise<Array<{ rank: number; userId: string; name: string; value: number }>> {
    const params = new URLSearchParams({ familyId, metric, period });

    const response = await fetch(`${this.baseUrl}/leaderboard?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch leaderboard');
    return response.json();
  }

  // ==================== BADGES & ACHIEVEMENTS ====================

  /**
   * Get member badges
   */
  async getBadges(userId: string): Promise<MemberBadge[]> {
    const response = await fetch(`${this.baseUrl}/${userId}/badges`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch badges');
    return response.json();
  }

  /**
   * Get member achievements
   */
  async getAchievements(userId: string): Promise<Achievement[]> {
    const response = await fetch(`${this.baseUrl}/${userId}/achievements`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch achievements');
    return response.json();
  }

  /**
   * Get available achievements for a family
   */
  async getAvailableAchievements(familyId: string): Promise<Achievement[]> {
    const params = new URLSearchParams({ familyId });

    const response = await fetch(`${this.baseUrl}/achievements/available?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch available achievements');
    return response.json();
  }

  // ==================== RELATIONSHIPS ====================

  /**
   * Get member's connections
   */
  async getConnections(userId: string): Promise<MemberProfile[]> {
    const response = await fetch(`${this.baseUrl}/${userId}/connections`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch connections');
    return response.json();
  }

  /**
   * Get shared interests with another member
   */
  async getSharedInterests(userId: string, otherUserId: string): Promise<any> {
    const params = new URLSearchParams({ userId, otherUserId });

    const response = await fetch(`${this.baseUrl}/shared-interests?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch shared interests');
    return response.json();
  }

  // ==================== RECENT ACTIVITY ====================

  /**
   * Get family activity feed
   */
  async getFamilyActivityFeed(familyId: string, limit?: number): Promise<MemberActivity[]> {
    const params = new URLSearchParams({ familyId });
    if (limit) params.append('limit', limit.toString());

    const response = await fetch(`${this.baseUrl}/family-activity?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch family activity');
    return response.json();
  }

  /**
   * Mark member as seen (update last active)
   */
  async markAsSeen(): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/me/mark-seen`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to mark as seen');
    return response.json();
  }
}

export default new MemberProfilesApiService();
