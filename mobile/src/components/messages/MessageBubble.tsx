import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Text } from '../ui/Text';
import { spacing, lightTheme, darkTheme, borderRadius } from '../../theme';
import type { Message } from '../../types';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  isDark?: boolean;
  onRetry?: (message: Message) => void;
  onAttachmentPress?: (attachmentUrl: string) => void;
}

const formatTimestamp = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  isDark = false,
  onRetry,
  onAttachmentPress,
}) => {
  const theme = isDark ? darkTheme : lightTheme;
  const alignStyle = isOwn ? styles.ownContainer : styles.otherContainer;
  const bubbleColor = isOwn ? theme.primary : theme.surfaceVariant;
  const textColor = isOwn ? '#fff' : theme.text;

  return (
    <View style={[styles.container, alignStyle]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: bubbleColor,
          },
        ]}
      >
        {message.attachments?.map((att) =>
          att.type === 'image' ? (
            <TouchableOpacity
              key={att.id}
              onPress={() => onAttachmentPress?.(att.url)}
              style={styles.attachmentImageWrapper}
            >
              <Image source={{ uri: att.thumbnailUrl ?? att.url }} style={styles.attachmentImage} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              key={att.id}
              style={styles.attachmentFile}
              onPress={() => onAttachmentPress?.(att.url)}
            >
              <Text variant="caption" style={{ color: textColor }}>
                📎 {att.fileName ?? 'Attachment'}
              </Text>
            </TouchableOpacity>
          )
        )}
        {message.content ? (
          <Text variant="body" style={{ color: textColor }}>
            {message.content}
          </Text>
        ) : null}
      </View>
      <View style={styles.metaRow}>
        <Text variant="caption" color="textSecondary" isDark={isDark}>
          {formatTimestamp(message.timestamp)}
        </Text>
        {isOwn && (
          <Text variant="caption" color="textSecondary" isDark={isDark} style={styles.status}>
            {message.status === 'error'
              ? 'Failed'
              : message.status === 'sending'
              ? 'Sending…'
              : message.status === 'delivered'
              ? 'Delivered'
              : message.status === 'read'
              ? 'Read'
              : message.status === 'sent'
              ? 'Sent'
              : ''}
          </Text>
        )}
        {message.status === 'error' && onRetry && (
          <TouchableOpacity onPress={() => onRetry(message)}>
            <Text variant="caption" color="error" isDark={isDark} style={styles.retry}>
              Retry
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing[1],
  },
  ownContainer: {
    alignItems: 'flex-end',
  },
  otherContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    gap: spacing[2],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  status: {
    textTransform: 'capitalize',
  },
  retry: {
    fontWeight: '600',
  },
  attachmentImageWrapper: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  attachmentImage: {
    width: 180,
    height: 160,
    borderRadius: borderRadius.md,
  },
  attachmentFile: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: spacing[2],
    borderRadius: borderRadius.md,
  },
});

export default MessageBubble;
