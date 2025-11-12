import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  Linking,
} from 'react-native';
import { useAppStore } from '../../store/appStore';
import { useAuth } from '../../hooks/useAuth';
import { useFamily } from '../../hooks/useFamily';
import { useMessages } from '../../hooks/useMessages';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Toast } from '../../components/ui/Toast';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { MessageBubble } from '../../components/messages/MessageBubble';
import { spacing, lightTheme, darkTheme } from '../../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList, Message } from '../../types';

type Props = NativeStackScreenProps<MainStackParamList, 'ChatDetail'>;

const ChatDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { theme } = useAppStore();
  const { user } = useAuth();
  const { family } = useFamily();
  const { chatId } = route.params;
  const isDark = theme === 'dark';
  const themeColors = isDark ? darkTheme : lightTheme;

  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<{ uri: string; name: string; type: string }[]>([]);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);
  const listRef = useRef<FlatList<Message>>(null);

  const {
    messages,
    activeChat,
    sendMessage,
    markRead,
    isLoading,
    sending,
    error,
    typingUsers,
    notifyTyping,
    stopTyping,
  } = useMessages({
    chatId,
    familyId: family?.id,
    enabled: Boolean(chatId),
    currentUserId: user?.id,
  });

  const showToast = useCallback(
    (text: string, type: 'success' | 'error' | 'info' = 'info') => setToast({ message: text, type }),
    []
  );

  const data = useMemo(() => messages, [messages]);

  useEffect(() => {
    const unreadMessageIds = data
      .filter((msg) => msg.status !== 'read' && msg.senderId !== user?.id)
      .map((msg) => msg.id);
    if (unreadMessageIds.length) {
      markRead(unreadMessageIds).catch((err) => console.warn('Failed to mark read', err));
    }
  }, [data, markRead, user?.id]);

  const handleSend = useCallback(async () => {
    if (!message.trim() && attachments.length === 0) {
      return;
    }
    try {
      await sendMessage({
        content: message.trim(),
        attachments,
      });
      setMessage('');
      setAttachments([]);
      listRef.current?.scrollToEnd({ animated: true });
      stopTyping();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to send message', 'error');
    }
  }, [attachments, message, sendMessage, showToast, stopTyping]);

  const handleRetry = useCallback(
    async (msg: Message) => {
      setMessage(msg.content);
      await handleSend();
    },
    [handleSend]
  );

  const handleAddAttachment = useCallback(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const ImagePicker = require('react-native-image-picker');
      const { launchImageLibrary } = ImagePicker;
      launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 }, (resp: any) => {
        const asset = resp?.assets?.[0];
        if (asset?.uri) {
          setAttachments([
            {
              uri: asset.uri,
              name: asset.fileName ?? 'photo.jpg',
              type: asset.type ?? 'image/jpeg',
            },
          ]);
        }
      });
    } catch (err) {
      showToast('Image picker not available. Install react-native-image-picker.', 'error');
    }
  }, [showToast]);

  const handleRemoveAttachment = useCallback(() => {
    setAttachments([]);
  }, []);

  const handlePressAttachment = useCallback(
    async (url: string) => {
      if (!url) return;
      try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          showToast('Unable to open attachment link', 'error');
        }
      } catch (err) {
        showToast('Failed to open attachment', 'error');
      }
    },
    [showToast]
  );

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {toast && (
        <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />
      )}

      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
        <Button
          title="← Back"
          onPress={() => navigation.goBack()}
          variant="outline"
          size="small"
          isDark={isDark}
        />
        <Text variant="h4" isDark={isDark} weight="bold" numberOfLines={1}>
          {activeChat?.name ?? 'Family Chat'}
        </Text>
      </View>

      {error && (
        <Card isDark={isDark} style={styles.errorCard}>
          <Text variant="body" color="textSecondary" isDark={isDark}>
            {error.message}
          </Text>
        </Card>
      )}

      {isLoading && !data.length ? (
        <LoadingSpinner isDark={isDark} message="Loading messages…" />
      ) : (
        <FlatList
          ref={listRef}
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesContainer}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              isOwn={!!(item.senderId === user?.id || item.isLocal)}
              isDark={isDark}
              onRetry={handleRetry}
              onAttachmentPress={handlePressAttachment}
            />
          )}
        />
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <View style={[styles.inputContainer, { borderTopColor: themeColors.border }]}>
          {typingUsers.length > 0 && (
            <Text
              variant="caption"
              color="textSecondary"
              isDark={isDark}
              style={styles.typingIndicator}
            >
              {typingUsers.length === 1 ? 'Someone is typing…' : 'Several people are typing…'}
            </Text>
          )}

          {attachments.map((att) => (
            <View key={att.uri} style={styles.attachmentPreviewWrapper}>
              <Image source={{ uri: att.uri }} style={styles.attachmentPreview} />
              <TouchableOpacity onPress={handleRemoveAttachment} style={styles.removeAttachment}>
                <Text style={{ color: '#fff', fontWeight: '600' }}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.inputRow}>
            <Button
              title="📎"
              onPress={handleAddAttachment}
              variant="outline"
              size="small"
              isDark={isDark}
            />
            <Input
              placeholder="Type a message…"
              value={message}
              onChangeText={(text) => {
                setMessage(text);
                notifyTyping();
              }}
              isDark={isDark}
              containerStyle={styles.input}
              onBlur={stopTyping}
            />
            <Button
              title={sending ? 'Sending…' : 'Send'}
              onPress={handleSend}
              size="small"
              isDark={isDark}
              disabled={sending}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    gap: spacing[3],
    borderBottomWidth: 1,
  },
  errorCard: {
    marginHorizontal: spacing[4],
    marginTop: spacing[3],
    padding: spacing[3],
  },
  messagesContainer: {
    flexGrow: 1,
    padding: spacing[4],
    paddingBottom: spacing[6],
  },
  inputContainer: {
    borderTopWidth: 1,
    paddingHorizontal: spacing[3],
    paddingTop: spacing[3],
    paddingBottom: spacing[4],
    gap: spacing[2],
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  input: {
    flex: 1,
  },
  typingIndicator: {
    marginLeft: spacing[1],
    marginBottom: spacing[1],
  },
  attachmentPreviewWrapper: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
  },
  attachmentPreview: {
    width: '100%',
    height: '100%',
  },
  removeAttachment: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    paddingHorizontal: spacing[1],
    paddingVertical: 2,
  },
});

export default ChatDetailScreen;
