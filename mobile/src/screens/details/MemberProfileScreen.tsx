import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useAppStore } from '../../store/appStore';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { spacing, lightTheme, darkTheme } from '../../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../types';

type Props = NativeStackScreenProps<MainStackParamList, 'MemberProfile'>;

const MemberProfileScreen: React.FC<Props> = ({ route, navigation }) => {
  const { theme } = useAppStore();
  const isDark = theme === 'dark';
  const themeColors = isDark ? darkTheme : lightTheme;
  const { userId } = route.params;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Button
          title="← Back"
          onPress={() => navigation.goBack()}
          variant="outline"
          size="small"
          isDark={isDark}
        />
      </View>

      <Card isDark={isDark} style={styles.profileCard}>
        <Text variant="h2" isDark={isDark}>
          {userId}
        </Text>
        <Text variant="body" color="textSecondary" isDark={isDark} style={styles.text}>
          Member profile coming soon
        </Text>
      </Card>

      <View style={styles.statsContainer}>
        <Card isDark={isDark} style={styles.statCard}>
          <Text variant="h4" isDark={isDark}>
            Tasks Completed
          </Text>
          <Text variant="h3" isDark={isDark}>
            0
          </Text>
        </Card>

        <Card isDark={isDark} style={styles.statCard}>
          <Text variant="h4" isDark={isDark}>
            Points
          </Text>
          <Text variant="h3" isDark={isDark}>
            0
          </Text>
        </Card>
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
  profileCard: {
    marginBottom: spacing[4],
    alignItems: 'center',
  },
  text: {
    marginTop: spacing[2],
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
});

export default MemberProfileScreen;
