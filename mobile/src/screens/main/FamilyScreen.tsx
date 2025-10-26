import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, FlatList } from 'react-native';
import { useAppStore } from '../../store/appStore';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { spacing, lightTheme, darkTheme } from '../../theme';
import type { FamilyMember } from '../../types';

const FamilyScreen: React.FC = () => {
  const { theme, family } = useAppStore();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isDark = theme === 'dark';
  const themeColors = isDark ? darkTheme : lightTheme;

  useEffect(() => {
    setTimeout(() => {
      setMembers(family?.members || []);
      setIsLoading(false);
    }, 500);
  }, [family]);

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
          Family
        </Text>
        {family && (
          <Text variant="body" color="textSecondary" isDark={isDark}>
            {family.familyName}
          </Text>
        )}
      </View>

      <Card isDark={isDark} style={styles.infoCard}>
        <Text variant="h4" isDark={isDark}>
          Members
        </Text>
        <Text variant="h3" isDark={isDark} style={styles.count}>
          {members.length}
        </Text>
      </Card>

      {members.length > 0 ? (
        <FlatList
          data={members}
          renderItem={({ item }) => (
            <Card isDark={isDark} style={styles.memberCard}>
              <Text variant="h4" isDark={isDark}>
                {item.userId}
              </Text>
              <Text variant="caption" color="textSecondary" isDark={isDark}>
                {item.role}
              </Text>
            </Card>
          )}
          keyExtractor={(item) => item.userId}
          scrollEnabled={false}
        />
      ) : (
        <Card isDark={isDark} style={styles.emptyState}>
          <Text variant="body" color="textSecondary" isDark={isDark}>
            No family members yet
          </Text>
        </Card>
      )}

      <View style={styles.buttonContainer}>
        <Button title="Invite Member" onPress={() => {}} isDark={isDark} variant="primary" />
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
  infoCard: {
    marginBottom: spacing[4],
    alignItems: 'center',
  },
  count: {
    marginTop: spacing[2],
  },
  memberCard: {
    marginBottom: spacing[3],
  },
  emptyState: {
    padding: spacing[6],
    alignItems: 'center',
  },
  buttonContainer: {
    marginTop: spacing[4],
  },
});

export default FamilyScreen;
