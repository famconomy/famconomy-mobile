import apiClient from './apiClient';
import type { Chat, Message, MessageAttachment } from '../types';

interface RawChat {
  ChatID?: string;
  id?: string;
  Type?: string;
  Name?: string;
  AvatarUrl?: string | null;
  FamilyID?: string | number;
  Participants?: Array<{
    UserID: string;
  }>;
  LastMessage?: RawMessage | null;
  LastMessageAt?: string | null;
  UnreadCount?: number;
  IsMuted?: boolean;
  TypingUserIds?: string[];
  CreatedAt?: string;
}

interface RawMessage {
  MessageID?: string;
  id?: string;
  ChatID?: string;
  SenderID?: string;
  SenderName?: string;
  Content?: string;
  Type?: string;
  Status?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
  DeliveredAt?: string;
  ReadAt?: string;
  Attachments?: RawAttachment[] | null;
  Metadata?: Record<string, unknown> | null;
}

interface RawAttachment {
  AttachmentID?: string;
  id?: string;
  Url?: string;
  ThumbnailUrl?: string | null;
  FileName?: string | null;
  FileSize?: number | null;
  MimeType?: string | null;
  Type?: string | null;
}

const mapAttachment = (attachment: RawAttachment): MessageAttachment => ({
  id: attachment.AttachmentID ?? attachment.id ?? '',
  url: attachment.Url ?? '',
  thumbnailUrl: attachment.ThumbnailUrl ?? undefined,
  fileName: attachment.FileName ?? undefined,
  fileSize: attachment.FileSize ?? undefined,
  mimeType: attachment.MimeType ?? undefined,
  type: (attachment.Type ?? 'file') as MessageAttachment['type'],
});

const mapMessage = (message: RawMessage): Message => ({
  id: message.MessageID ?? message.id ?? '',
  chatId: message.ChatID ?? '',
  senderId: message.SenderID ?? '',
  senderName: message.SenderName ?? undefined,
  content: message.Content ?? '',
  type: (message.Type ?? 'text') as Message['type'],
  status: (message.Status?.toLowerCase() as Message['status']) ?? 'sent',
  timestamp: message.CreatedAt ?? new Date().toISOString(),
  updatedAt: message.UpdatedAt ?? undefined,
  deliveredAt: message.DeliveredAt ?? undefined,
  readAt: message.ReadAt ?? undefined,
  attachments: Array.isArray(message.Attachments)
    ? message.Attachments.map(mapAttachment)
    : undefined,
  metadata: message.Metadata ?? undefined,
});

const mapChat = (chat: RawChat): Chat => ({
  id: chat.ChatID ?? chat.id ?? '',
  type: (chat.Type ?? 'group') as Chat['type'],
  participants: Array.isArray(chat.Participants)
    ? chat.Participants.map((participant) => participant.UserID)
    : [],
  familyId: String(chat.FamilyID ?? ''),
  lastMessage: chat.LastMessage ? mapMessage(chat.LastMessage) : undefined,
  lastMessageTime: chat.LastMessageAt ?? undefined,
  createdAt: chat.CreatedAt ?? new Date().toISOString(),
  name: chat.Name ?? undefined,
  avatar: chat.AvatarUrl ?? undefined,
  unreadCount: chat.UnreadCount ?? 0,
  isMuted: chat.IsMuted ?? false,
  typingUserIds: chat.TypingUserIds ?? [],
});

export const getChats = async (familyId: string): Promise<Chat[]> => {
  const response = await apiClient.get(`/families/${familyId}/chats`);
  const raw = Array.isArray(response.data) ? (response.data as RawChat[]) : [];
  return raw.map(mapChat);
};

export const getChat = async (chatId: string): Promise<Chat> => {
  const response = await apiClient.get(`/chats/${chatId}`);
  return mapChat(response.data as RawChat);
};

export const getMessages = async (
  chatId: string,
  params: { limit?: number; before?: string } = {}
): Promise<Message[]> => {
  const searchParams = new URLSearchParams();
  if (params.limit) searchParams.append('limit', params.limit.toString());
  if (params.before) searchParams.append('before', params.before);
  const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
  const response = await apiClient.get(`/chats/${chatId}/messages${query}`);
  const raw = Array.isArray(response.data) ? (response.data as RawMessage[]) : [];
  return raw.map(mapMessage);
};

export const sendMessage = async (
  chatId: string,
  payload: {
    content: string;
    type?: Message['type'];
    attachments?: { uri: string; name: string; type: string }[];
  }
): Promise<Message> => {
  if (payload.attachments && payload.attachments.length > 0) {
    const formData = new FormData() as any;
    formData.append('content', payload.content);
    formData.append('type', payload.type ?? 'text');
    payload.attachments.forEach((file) => {
      formData.append(
        'attachments',
        ({ uri: file.uri, name: file.name, type: file.type } as unknown) as Blob
      );
    });
    const response = await apiClient.post(`/chats/${chatId}/messages`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return mapMessage(response.data as RawMessage);
  }

  const response = await apiClient.post(`/chats/${chatId}/messages`, {
    content: payload.content,
    type: payload.type ?? 'text',
  });
  return mapMessage(response.data as RawMessage);
};

export const markMessageRead = async (messageId: string): Promise<void> => {
  await apiClient.put(`/messages/${messageId}/read`, {});
};

export const deleteMessage = async (messageId: string): Promise<void> => {
  await apiClient.delete(`/messages/${messageId}`);
};
