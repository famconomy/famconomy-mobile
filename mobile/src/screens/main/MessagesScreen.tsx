import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  SectionList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../store/appStore';
import { useFamily } from '../../hooks/useFamily';
import { useMessages } from '../../hooks/useMessages';
import { useAuth } from '../../hooks/useAuth';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Toast } from '../../components/ui/Toast';
import { ChatListItem } from '../../components/messages/ChatListItem';
import { spacing, lightTheme, darkTheme } from '../../theme';
import type { Chat } from '../../types';
const MessagesScreen: React.FC = () => {
  const { theme } = useAppStore();
  const { user } = useAuth();
  const { family } = useFamily();
  const navigation = useNavigation<any>();
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);
  const isDark = theme === 'dark';
  const themeColors = isDark ? darkTheme : lightTheme;

  const familyId = family?.id;

  const {
    chats,
    isLoading,
    isRefreshing,
    error,
    unreadCount,
    refetch,
  } = useMessages({
    familyId,
    enabled: Boolean(familyId),
    currentUserId: user?.id,
  });

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'info') => {
      setToast({ message, type });
    },
    []
  );

  const groupedChats = useMemo(() => {
    if (!chats.length) return [];
    const pinned: Chat[] = [];
    const recent: Chat[] = [];
    chats.forEach((chat) => {
      if (chat.unreadCount && chat.unreadCount > 0) {
        pinned.push(chat);
      } else {
        recent.push(chat);
      }
    });
    const sections: Array<{ title: string; data: Chat[] }> = [];
    if (pinned.length) sections.push({ title: 'Unread', data: pinned });
    if (recent.length) sections.push({ title: 'Recent', data: recent });
    return sections;
  }, [chats]);

  const handleOpenChat = useCallback(
    (chat: Chat) => {
      navigation.navigate('ChatDetail', { chatId: chat.id });
    },
    [navigation]
  );

  const handleNewChat = useCallback(() => {
    showToast('Starting a new conversation soon!', 'info');
  }, [showToast]);

  if (!familyId) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <Card isDark={isDark} style={styles.emptyState}>
          <Text variant="h4" isDark={isDark} weight="semibold">
            Join or create a family to start messaging
          </Text>
        </Card>
      </View>
    );
  }

  if (isLoading && !chats.length) {
    return <LoadingSpinner isDark={isDark} message="Loading conversations…" />;
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {toast && (
        <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />
      )}
      <SectionList
        sections={groupedChats}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <Text variant="h2" isDark={isDark} weight="bold">
                Messages
              </Text>
              <Button
                title="+ New"
                onPress={handleNewChat}
                size="small"
                isDark={isDark}
              />
            </View>
            <Text variant="body" color="textSecondary" isDark={isDark}>
              {unreadCount > 0
                ? `${unreadCount} unread ${unreadCount === 1 ? 'message' : 'messages'}`
                : 'All caught up!'}
            </Text>
            {error && (
              <Card isDark={isDark} style={styles.errorCard}>
                <Text variant="body" color="textSecondary" isDark={isDark}>
                  {error.message}
                </Text>
              </Card>
            )}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text variant="label" color="textSecondary" isDark={isDark} style={styles.sectionTitle}>
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => (
          <ChatListItem chat={item} isDark={isDark} onPress={handleOpenChat} />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refetch}
            tintColor={themeColors.primary}
          />
        }
        ListEmptyComponent={
          <Card isDark={isDark} style={styles.emptyState}>
            <Text variant="h4" isDark={isDark} weight="semibold">
              No conversations
            </Text>
            <Text variant="body" color="textSecondary" isDark={isDark} style={styles.emptyText}>
              Start a conversation with a family member
            </Text>
          </Card>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[6],
  },
  sectionTitle: {
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  emptyState: {
    padding: spacing[6],
    alignItems: 'center',
    marginTop: spacing[6],
  },
  emptyText: {
    marginTop: spacing[2],
    textAlign: 'center',
  },
  errorCard: {
    marginTop: spacing[3],
    padding: spacing[3],
  },
});

export default MessagesScreen;
