import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getChats,
  getChat,
  getMessages,
  sendMessage,
  deleteMessage,
  markMessageRead,
} from '../api/messages';
import type { Chat, Message } from '../types';
import { useSocket } from './useSocket';

interface UseMessagesOptions {
  familyId?: string;
  chatId?: string;
  enabled?: boolean;
  currentUserId?: string;
}

interface SendMessagePayload {
  content: string;
  attachments?: { uri: string; name: string; type: string }[];
  type?: Message['type'];
}

export const useMessages = ({
  familyId,
  chatId,
  enabled = true,
  currentUserId,
}: UseMessagesOptions) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [sending, setSending] = useState(false);

  const socket = useSocket({
    namespace: '/messages',
    enabled: enabled && Boolean(familyId),
    query: familyId ? { familyId } : undefined,
  });
  const typingStateRef = useRef<{
    isTyping: boolean;
    timeout: ReturnType<typeof setTimeout> | null;
  }>({ isTyping: false, timeout: null });

  const loadChats = useCallback(async () => {
    if (!familyId || !enabled) return;
    try {
      const data = await getChats(familyId);
      setChats(data);
    } catch (err) {
      console.warn('[useMessages] Failed to load chats', err);
      setError(err instanceof Error ? err : new Error('Unable to load chats'));
    }
  }, [enabled, familyId]);

  const loadMessages = useCallback(async () => {
    if (!chatId || !enabled) return;
    try {
      setIsRefreshing(true);
      const data = await getMessages(chatId, { limit: 50 });
      setMessages(data);
    } catch (err) {
      console.warn('[useMessages] Failed to load messages', err);
      setError(err instanceof Error ? err : new Error('Unable to load messages'));
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, [chatId, enabled]);

  const initialize = useCallback(
    async (source: 'initial' | 'refresh' = 'initial') => {
      if (!enabled) return;
      if (source === 'refresh') {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      try {
        if (familyId) {
          await loadChats();
        }
        if (chatId) {
          const chatData = await getChat(chatId);
          setActiveChat(chatData);
          await loadMessages();
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unable to load messages'));
      } finally {
        if (source === 'refresh') {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [chatId, enabled, familyId, loadChats, loadMessages]
  );

  useEffect(() => {
    initialize('initial');
  }, [initialize]);

  useEffect(() => {
    if (!chatId) return;
    setActiveChat((current) => {
      if (current && current.id === chatId) {
        return current;
      }
      const match = chats.find((chat) => chat.id === chatId);
      return match ?? current;
    });
  }, [chatId, chats]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: Message) => {
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === message.chatId
            ? {
                ...chat,
                lastMessage: message,
                lastMessageTime: message.timestamp,
                unreadCount: chat.id === chatId ? 0 : (chat.unreadCount ?? 0) + 1,
              }
            : chat
        )
      );

      if (message.chatId === chatId) {
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === message.id);
          if (exists) {
            return prev.map((m) => (m.id === message.id ? message : m));
          }
          return [...prev, message];
        });
      }
    };

    const handleMessageUpdated = (message: Message) => {
      setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
    };

    const handleTypingEvent = (data: { chatId?: string; userId?: string; typing?: boolean }) => {
      if (!data?.chatId || !data.userId) return;
      if (currentUserId && data.userId === currentUserId) return;
      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== data.chatId) return chat;
          const typingIds = new Set(chat.typingUserIds ?? []);
          if (data.typing) {
            typingIds.add(data.userId!);
          } else {
            typingIds.delete(data.userId!);
          }
          return {
            ...chat,
            typingUserIds: Array.from(typingIds),
          };
        })
      );
    };

    const handleMessageDelivery = (payload: {
      chatId?: string;
      messageId?: string;
      messageIds?: string[];
      status?: Message['status'];
      deliveredAt?: string;
    }) => {
      if (!payload) return;
      const ids = payload.messageIds ?? (payload.messageId ? [payload.messageId] : []);
      if (!ids.length) return;
      setMessages((prev) =>
        prev.map((msg) =>
          ids.includes(msg.id)
            ? {
                ...msg,
                status: payload.status ?? (msg.status === 'read' ? msg.status : 'delivered'),
                deliveredAt: payload.deliveredAt ?? msg.deliveredAt ?? new Date().toISOString(),
              }
            : msg
        )
      );
    };

    const handleMessageRead = (payload: {
      chatId?: string;
      messageId?: string;
      messageIds?: string[];
      readAt?: string;
      userId?: string;
    }) => {
      if (!payload) return;
      const ids = payload.messageIds ?? (payload.messageId ? [payload.messageId] : []);
      if (!ids.length) return;
      setMessages((prev) =>
        prev.map((msg) =>
          ids.includes(msg.id)
            ? {
                ...msg,
                status: 'read',
                readAt: payload.readAt ?? msg.readAt ?? new Date().toISOString(),
              }
            : msg
        )
      );
      if (payload.chatId) {
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === payload.chatId
              ? {
                  ...chat,
                  unreadCount: 0,
                }
              : chat
          )
        );
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:update', handleMessageUpdated);
    socket.on('message:typing', handleTypingEvent);
    socket.on('user:typing', handleTypingEvent);
    socket.on('message:delivered', handleMessageDelivery);
    socket.on('message:read', handleMessageRead);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:update', handleMessageUpdated);
      socket.off('message:typing', handleTypingEvent);
      socket.off('user:typing', handleTypingEvent);
      socket.off('message:delivered', handleMessageDelivery);
      socket.off('message:read', handleMessageRead);
    };
  }, [chatId, currentUserId, socket]);

  const optimisticUpdate = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === message.chatId
          ? {
              ...chat,
              lastMessage: message,
              lastMessageTime: message.timestamp,
            }
          : chat
      )
    );
  }, []);

  const handleSendMessage = useCallback(
    async (payload: SendMessagePayload) => {
      if (!chatId) throw new Error('Chat not selected');
      const trimmedContent = payload.content.trim();
      const hasAttachments = payload.attachments && payload.attachments.length > 0;
      if (!trimmedContent && !hasAttachments) {
        return;
      }

      const tempId = `local-${Date.now()}`;
      const optimisticMessage: Message = {
        id: tempId,
        chatId,
        senderId: currentUserId ?? 'me',
        content: trimmedContent,
        type: payload.type ?? (hasAttachments ? 'file' : 'text'),
        status: 'sending',
        timestamp: new Date().toISOString(),
        attachments: undefined,
        isLocal: true,
      };
      optimisticUpdate(optimisticMessage);
      setSending(true);
      try {
        const sent = await sendMessage(chatId, {
          ...payload,
          content: trimmedContent,
        });
        setMessages((prev) =>
          prev.map((msg) => (msg.id === tempId ? sent : msg))
        );
        setSending(false);
        return sent;
      } catch (err) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempId ? { ...msg, status: 'error' as const } : msg
          )
        );
        setSending(false);
        throw err;
      }
    },
    [chatId, optimisticUpdate]
  );

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      await deleteMessage(messageId);
      setMessages((prev) => prev.filter((message) => message.id !== messageId));
    },
    []
  );

  const emitTypingState = useCallback(
    (typing: boolean) => {
      if (!socket || !chatId) return;
      socket.emit('user:typing', { chatId, typing });
    },
    [chatId, socket]
  );

  const notifyTyping = useCallback(() => {
    if (!chatId || !socket) return;
    const state = typingStateRef.current;
    if (!state.isTyping) {
      emitTypingState(true);
      state.isTyping = true;
    }
    if (state.timeout) {
      clearTimeout(state.timeout);
    }
    state.timeout = setTimeout(() => {
      emitTypingState(false);
      typingStateRef.current = { isTyping: false, timeout: null };
    }, 1500);
  }, [chatId, emitTypingState, socket]);

  const stopTyping = useCallback(() => {
    const state = typingStateRef.current;
    if (!state.isTyping && !state.timeout) return;
    if (state.timeout) {
      clearTimeout(state.timeout);
    }
    emitTypingState(false);
    typingStateRef.current = { isTyping: false, timeout: null };
  }, [emitTypingState]);

  useEffect(() => {
    return () => {
      stopTyping();
    };
  }, [stopTyping]);

  const emitReadReceipt = useCallback(
    (messageIds: string[]) => {
      if (!socket || !chatId || !messageIds.length) return;
      socket.emit('message:read', { chatId, messageIds });
    },
    [chatId, socket]
  );

  const handleMarkRead = useCallback(
    async (messageIds: string[]) => {
      if (!messageIds.length) return;
      await Promise.all(messageIds.map((id) => markMessageRead(id)));
      emitReadReceipt(messageIds);
      setMessages((prev) =>
        prev.map((message) =>
          messageIds.includes(message.id)
            ? { ...message, status: 'read', readAt: new Date().toISOString() }
            : message
        )
      );
      if (chatId) {
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  unreadCount: 0,
                }
              : chat
          )
        );
      }
    },
    [chatId, emitReadReceipt]
  );

  useEffect(() => {
    if (!socket || !chatId) return;
    socket.emit('chat:join', { chatId });
    return () => {
      socket.emit('chat:leave', { chatId });
    };
  }, [chatId, socket]);

  const typingUsers = useMemo(() => {
    const chat = chats.find((c) => c.id === chatId);
    const ids = chat?.typingUserIds ?? [];
    return currentUserId ? ids.filter((id) => id !== currentUserId) : ids;
  }, [chatId, chats, currentUserId]);

  const unreadCount = useMemo(() => chats.reduce((sum, chat) => sum + (chat.unreadCount ?? 0), 0), [chats]);

  return {
    chats,
    messages,
    activeChat,
    typingUsers,
    unreadCount,
    isLoading,
    isRefreshing,
    sending,
    error,
    refetch: () => initialize('refresh'),
    loadChats,
    loadMessages,
    sendMessage: handleSendMessage,
    deleteMessage: handleDeleteMessage,
    markRead: handleMarkRead,
    setActiveChat,
    notifyTyping,
    stopTyping,
  };
};
