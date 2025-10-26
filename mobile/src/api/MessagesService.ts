// Message Service - Real-time Chat with Socket.IO

import { io, Socket } from 'socket.io-client';

// ============================================
// ENUMS
// ============================================

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  FILE = 'file',
  SYSTEM = 'system'
}

export enum MessageStatus {
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed'
}

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface MessageAttachment {
  id: string;
  url: string;
  type: 'image' | 'video' | 'file';
  name: string;
  size: number;
  uploadedAt: string;
}

export interface MessageReaction {
  emoji: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderImage?: string;
  content: string;
  type: MessageType;
  status: MessageStatus;
  attachments: MessageAttachment[];
  reactions: MessageReaction[];
  repliedTo?: {
    id: string;
    content: string;
    senderName: string;
  };
  editedAt?: string;
  editHistory?: EditedMessage[];
  createdAt: string;
  readBy: Array<{
    userId: string;
    readAt: string;
  }>;
}

export interface EditedMessage {
  content: string;
  editedAt: string;
}

export interface Conversation {
  id: string;
  familyId: string;
  name: string;
  description?: string;
  type: 'direct' | 'group';
  members: ConversationMember[];
  lastMessage?: Message;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
  icon?: string;
  isArchived: boolean;
  isPinned: boolean;
}

export interface ConversationMember {
  userId: string;
  name: string;
  image?: string;
  role: 'owner' | 'member' | 'guest';
  joinedAt: string;
}

export interface CreateConversationRequest {
  name: string;
  description?: string;
  type: 'direct' | 'group';
  memberIds: string[];
  icon?: string;
}

export interface UpdateConversationRequest {
  name?: string;
  description?: string;
  icon?: string;
}

export interface SendMessageRequest {
  content: string;
  type?: MessageType;
  attachments?: MessageAttachment[];
  repliedToId?: string;
}

export interface MessageFilter {
  conversationId: string;
  userId?: string;
  type?: MessageType;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface MessageSearchResult {
  messages: Message[];
  total: number;
  conversationId: string;
}

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

// ============================================
// MESSAGE API SERVICE
// ============================================

class MessageApiService {
  private baseUrl = '/api/messages';
  private token: string | null = null;
  private socket: Socket | null = null;

  setToken(token: string) {
    this.token = token;
  }

  // ==================== SOCKET.IO CONNECTION ====================

  /**
   * Initialize Socket.IO connection
   */
  initializeSocket(serverUrl: string): Socket {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    this.socket = io(serverUrl, {
      auth: {
        token: this.token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.setupSocketListeners();
    return this.socket;
  }

  /**
   * Disconnect Socket.IO
   */
  disconnectSocket() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Get Socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  // ==================== CONVERSATION OPERATIONS ====================

  /**
   * Create a new conversation
   */
  async createConversation(familyId: string, request: CreateConversationRequest): Promise<Conversation> {
    const response = await fetch(`${this.baseUrl}/conversations`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ ...request, familyId }),
    });

    if (!response.ok) throw new Error('Failed to create conversation');
    return response.json();
  }

  /**
   * Get all conversations for a family
   */
  async getConversations(familyId: string, archived?: boolean): Promise<Conversation[]> {
    const params = new URLSearchParams({ familyId });
    if (archived !== undefined) params.append('archived', archived.toString());

    const response = await fetch(`${this.baseUrl}/conversations?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch conversations');
    return response.json();
  }

  /**
   * Get a single conversation
   */
  async getConversation(conversationId: string): Promise<Conversation> {
    const response = await fetch(`${this.baseUrl}/conversations/${conversationId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch conversation');
    return response.json();
  }

  /**
   * Update a conversation
   */
  async updateConversation(
    conversationId: string,
    request: UpdateConversationRequest
  ): Promise<Conversation> {
    const response = await fetch(`${this.baseUrl}/conversations/${conversationId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Failed to update conversation');
    return response.json();
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/conversations/${conversationId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to delete conversation');
    return response.json();
  }

  /**
   * Add member to conversation
   */
  async addMember(conversationId: string, userId: string): Promise<Conversation> {
    const response = await fetch(`${this.baseUrl}/conversations/${conversationId}/members`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) throw new Error('Failed to add member');
    return response.json();
  }

  /**
   * Remove member from conversation
   */
  async removeMember(conversationId: string, userId: string): Promise<Conversation> {
    const response = await fetch(
      `${this.baseUrl}/conversations/${conversationId}/members/${userId}`,
      {
        method: 'DELETE',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) throw new Error('Failed to remove member');
    return response.json();
  }

  /**
   * Archive a conversation
   */
  async archiveConversation(conversationId: string): Promise<Conversation> {
    const response = await fetch(
      `${this.baseUrl}/conversations/${conversationId}/archive`,
      {
        method: 'POST',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) throw new Error('Failed to archive conversation');
    return response.json();
  }

  /**
   * Pin a conversation
   */
  async pinConversation(conversationId: string): Promise<Conversation> {
    const response = await fetch(`${this.baseUrl}/conversations/${conversationId}/pin`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to pin conversation');
    return response.json();
  }

  // ==================== MESSAGE OPERATIONS ====================

  /**
   * Send a message (HTTP)
   */
  async sendMessage(conversationId: string, request: SendMessageRequest): Promise<Message> {
    const response = await fetch(`${this.baseUrl}/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) throw new Error('Failed to send message');
    return response.json();
  }

  /**
   * Send message via Socket.IO (real-time)
   */
  sendMessageSocket(conversationId: string, request: SendMessageRequest): void {
    if (!this.socket) throw new Error('Socket not initialized');
    this.socket.emit('message:send', {
      conversationId,
      ...request,
    });
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(filter: MessageFilter): Promise<MessageSearchResult> {
    const params = new URLSearchParams({
      conversationId: filter.conversationId,
      limit: (filter.limit || 50).toString(),
      offset: (filter.offset || 0).toString(),
    });

    if (filter.userId) params.append('userId', filter.userId);
    if (filter.type) params.append('type', filter.type);
    if (filter.startDate) params.append('startDate', filter.startDate);
    if (filter.endDate) params.append('endDate', filter.endDate);

    const response = await fetch(`${this.baseUrl}/messages?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to fetch messages');
    return response.json();
  }

  /**
   * Edit a message
   */
  async editMessage(messageId: string, content: string): Promise<Message> {
    const response = await fetch(`${this.baseUrl}/messages/${messageId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ content }),
    });

    if (!response.ok) throw new Error('Failed to edit message');
    return response.json();
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/messages/${messageId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to delete message');
    return response.json();
  }

  /**
   * Add reaction to message
   */
  async addReaction(messageId: string, emoji: string): Promise<Message> {
    const response = await fetch(`${this.baseUrl}/messages/${messageId}/reactions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ emoji }),
    });

    if (!response.ok) throw new Error('Failed to add reaction');
    return response.json();
  }

  /**
   * Remove reaction from message
   */
  async removeReaction(messageId: string, emoji: string): Promise<Message> {
    const response = await fetch(
      `${this.baseUrl}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
      {
        method: 'DELETE',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) throw new Error('Failed to remove reaction');
    return response.json();
  }

  /**
   * Mark messages as read
   */
  async markAsRead(conversationId: string): Promise<{ success: boolean }> {
    const response = await fetch(
      `${this.baseUrl}/conversations/${conversationId}/read`,
      {
        method: 'POST',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) throw new Error('Failed to mark as read');
    return response.json();
  }

  /**
   * Mark messages as read via Socket.IO
   */
  markAsReadSocket(conversationId: string): void {
    if (!this.socket) throw new Error('Socket not initialized');
    this.socket.emit('message:read', { conversationId });
  }

  // ==================== TYPING INDICATORS ====================

  /**
   * Send typing indicator via Socket.IO
   */
  sendTypingIndicator(conversationId: string, isTyping: boolean): void {
    if (!this.socket) throw new Error('Socket not initialized');
    this.socket.emit('typing', {
      conversationId,
      isTyping,
    });
  }

  /**
   * Listen for typing indicators
   */
  onTypingIndicator(callback: (data: TypingIndicator) => void): void {
    if (!this.socket) throw new Error('Socket not initialized');
    this.socket.on('typing', callback);
  }

  // ==================== MESSAGE SEARCH ====================

  /**
   * Search messages
   */
  async searchMessages(
    conversationId: string,
    query: string
  ): Promise<MessageSearchResult> {
    const params = new URLSearchParams({
      conversationId,
      query,
    });

    const response = await fetch(`${this.baseUrl}/search?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Failed to search messages');
    return response.json();
  }

  // ==================== UPLOAD ATTACHMENT ====================

  /**
   * Upload attachment
   */
  async uploadAttachment(file: File): Promise<MessageAttachment> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/attachments/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    });

    if (!response.ok) throw new Error('Failed to upload attachment');
    return response.json();
  }

  // ==================== HELPER METHODS ====================

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
    };
  }
}

export default new MessageApiService();
