import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../ui/Text';
import { Card } from '../ui/Card';
import { spacing, lightTheme, darkTheme } from '../../theme';
import type { Chat } from '../../types';

interface ChatListItemProps {
  chat: Chat;
  isDark?: boolean;
  onPress?: (chat: Chat) => void;
}

const formatTimestamp = (timestamp?: string) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 1) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export const ChatListItem: React.FC<ChatListItemProps> = ({ chat, isDark = false, onPress }) => {
  const theme = isDark ? darkTheme : lightTheme;
  const lastMessagePreview = useMemo(() => {
    if (!chat.lastMessage) return 'No messages yet';
    const prefix = chat.lastMessage.senderName ? `${chat.lastMessage.senderName}: ` : '';
    if (chat.lastMessage.type === 'image') return `${prefix}[Photo]`;
    if (chat.lastMessage.type === 'file') return `${prefix}[Attachment]`;
    return `${prefix}${chat.lastMessage.content}`.trim();
  }, [chat.lastMessage]);

  const unreadCount = chat.unreadCount ?? 0;
  const typingText =
    chat.typingUserIds && chat.typingUserIds.length > 0
      ? chat.typingUserIds.length === 1
        ? 'Typing…'
        : 'Several people are typing…'
      : null;

  return (
    <TouchableOpacity onPress={() => onPress?.(chat)}>
      <Card
        isDark={isDark}
        style={[
          styles.card,
          unreadCount > 0 && { borderColor: theme.primary, borderWidth: 1 },
        ]}
      >
        <View style={styles.row}>
          <View style={styles.avatar}>
            <Text variant="h3" isDark={isDark} weight="bold">
              {chat.name?.charAt(0).toUpperCase() ?? 'F'}
            </Text>
          </View>
          <View style={styles.content}>
            <View style={styles.header}>
              <Text variant="h4" isDark={isDark} weight="semibold" numberOfLines={1}>
                {chat.name ?? 'Family Chat'}
              </Text>
              <Text variant="caption" color="textSecondary" isDark={isDark}>
                {formatTimestamp(chat.lastMessageTime)}
              </Text>
            </View>
            {typingText ? (
              <Text variant="caption" color="textSecondary" isDark={isDark}>
                {typingText}
              </Text>
            ) : (
              <Text variant="caption" color="textSecondary" isDark={isDark} numberOfLines={1}>
                {lastMessagePreview}
              </Text>
            )}
          </View>
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: theme.primary }]}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing[3],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e0e7ff',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1],
    gap: spacing[2],
  },
  badge: {
    minWidth: 28,
    paddingHorizontal: spacing[1],
    paddingVertical: 2,
    borderRadius: 14,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
});

export default ChatListItem;
