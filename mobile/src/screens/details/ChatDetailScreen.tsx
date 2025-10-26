import React from 'react';
import { View, ScrollView, StyleSheet, FlatList } from 'react-native';
import { useAppStore } from '../../store/appStore';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { spacing, lightTheme, darkTheme } from '../../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../types';

type Props = NativeStackScreenProps<MainStackParamList, 'ChatDetail'>;

const ChatDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { theme } = useAppStore();
  const isDark = theme === 'dark';
  const themeColors = isDark ? darkTheme : lightTheme;
  const { chatId } = route.params;
  const [message, setMessage] = React.useState('');

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={styles.header}>
        <Button
          title="← Back"
          onPress={() => navigation.goBack()}
          variant="outline"
          size="small"
          isDark={isDark}
        />
        <Text variant="h4" isDark={isDark}>
          Chat {chatId}
        </Text>
      </View>

      <ScrollView
        style={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
      >
        <Card isDark={isDark} style={styles.emptyState}>
          <Text variant="body" color="textSecondary" isDark={isDark}>
            No messages yet
          </Text>
        </Card>
      </ScrollView>

      <View style={[styles.inputContainer, { borderTopColor: themeColors.border }]}>
        <Input
          placeholder="Type a message..."
          value={message}
          onChangeText={setMessage}
          isDark={isDark}
          containerStyle={styles.input}
        />
        <Button
          title="Send"
          onPress={() => setMessage('')}
          size="small"
          isDark={isDark}
        />
      </View>
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
    padding: spacing[4],
    gap: spacing[3],
  },
  messagesContainer: {
    flex: 1,
    padding: spacing[4],
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing[6],
  },
  inputContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    padding: spacing[3],
    gap: spacing[2],
    alignItems: 'center',
  },
  input: {
    flex: 1,
  },
});

export default ChatDetailScreen;
