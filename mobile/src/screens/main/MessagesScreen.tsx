import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, FlatList } from 'react-native';
import { useAppStore } from '../../store/appStore';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { spacing, lightTheme, darkTheme } from '../../theme';
import type { Message } from '../../types';

const MessagesScreen: React.FC = () => {
  const { theme } = useAppStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isDark = theme === 'dark';
  const themeColors = isDark ? darkTheme : lightTheme;

  useEffect(() => {
    setTimeout(() => {
      setMessages([]);
      setIsLoading(false);
    }, 500);
  }, []);

  if (isLoading) {
    return <LoadingSpinner isDark={isDark} />;
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text variant="h2" isDark={isDark}>
          Messages
        </Text>
      </View>

      {messages.length === 0 ? (
        <Card isDark={isDark} style={styles.emptyState}>
          <Text variant="h4" isDark={isDark}>
            No conversations
          </Text>
          <Text variant="body" color="textSecondary" isDark={isDark} style={styles.emptyText}>
            Start a conversation with a family member
          </Text>
        </Card>
      ) : (
        <FlatList
          data={messages}
          renderItem={({ item }) => (
            <Card isDark={isDark} style={styles.messageCard}>
              <Text variant="h4" isDark={isDark}>
                {item.content}
              </Text>
            </Card>
          )}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
        />
      )}

      <View style={styles.buttonContainer}>
        <Button title="New Message" onPress={() => {}} isDark={isDark} variant="primary" />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing[4],
  },
  header: {
    marginBottom: spacing[4],
  },
  messageCard: {
    marginBottom: spacing[3],
  },
  emptyState: {
    padding: spacing[6],
    alignItems: 'center',
  },
  emptyText: {
    marginTop: spacing[2],
  },
  buttonContainer: {
    marginTop: spacing[4],
  },
});

export default MessagesScreen;
