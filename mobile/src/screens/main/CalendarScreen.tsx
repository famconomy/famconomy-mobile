import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, FlatList } from 'react-native';
import { useAppStore } from '../../store/appStore';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { spacing, lightTheme, darkTheme } from '../../theme';
import type { CalendarEvent } from '../../types';

const CalendarScreen: React.FC = () => {
  const { theme } = useAppStore();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isDark = theme === 'dark';
  const themeColors = isDark ? darkTheme : lightTheme;

  useEffect(() => {
    // TODO: Fetch calendar events from API
    setTimeout(() => {
      setEvents([]);
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
          Calendar
        </Text>
      </View>

      <Card isDark={isDark} style={styles.content}>
        <Text variant="h4" isDark={isDark}>
          Calendar View
        </Text>
        <View style={styles.placeholder}>
          <Text variant="body" color="textSecondary" isDark={isDark}>
            Calendar component coming soon
          </Text>
        </View>
      </Card>

      <View style={styles.buttonContainer}>
        <Button
          title="Add Event"
          onPress={() => {}}
          isDark={isDark}
          variant="primary"
        />
      </View>

      {events.length === 0 && (
        <Card isDark={isDark} style={styles.emptyState}>
          <Text variant="body" color="textSecondary" isDark={isDark}>
            No events scheduled yet
          </Text>
        </Card>
      )}
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
  content: {
    marginBottom: spacing[4],
  },
  placeholder: {
    marginTop: spacing[4],
    padding: spacing[4],
    alignItems: 'center',
  },
  buttonContainer: {
    marginBottom: spacing[4],
  },
  emptyState: {
    padding: spacing[6],
    alignItems: 'center',
  },
});

export default CalendarScreen;
