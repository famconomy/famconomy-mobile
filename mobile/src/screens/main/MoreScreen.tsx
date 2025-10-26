import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { spacing, lightTheme, darkTheme } from '../../theme';

const MoreScreen: React.FC = () => {
  const { theme, setTheme } = useAppStore();
  const { logout } = useAuthStore();
  const isDark = theme === 'dark';
  const themeColors = isDark ? darkTheme : lightTheme;

  const menuItems = [
    { title: 'Journal', icon: '📔' },
    { title: 'Recipes', icon: '🍳' },
    { title: 'Wishlists', icon: '🎁' },
    { title: 'Guidelines', icon: '📋' },
    { title: 'Settings', icon: '⚙️' },
    { title: 'Help & Support', icon: '❓' },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text variant="h2" isDark={isDark}>
          More
        </Text>
      </View>

      {menuItems.map((item, index) => (
        <Card key={index} isDark={isDark} style={styles.menuItem}>
          <Text variant="h4" isDark={isDark}>
            {item.icon} {item.title}
          </Text>
        </Card>
      ))}

      <Card isDark={isDark} style={styles.settingsCard}>
        <Text variant="h4" isDark={isDark}>
          Preferences
        </Text>
        <View style={styles.preferenceItem}>
          <Text variant="body" isDark={isDark}>
            Dark Mode
          </Text>
          <Button
            title={isDark ? 'On' : 'Off'}
            onPress={() => setTheme(isDark ? 'light' : 'dark')}
            variant="outline"
            size="small"
            isDark={isDark}
          />
        </View>
      </Card>

      <View style={styles.buttonContainer}>
        <Button
          title="Logout"
          onPress={logout}
          variant="danger"
          isDark={isDark}
        />
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
  menuItem: {
    marginBottom: spacing[3],
    padding: spacing[4],
  },
  settingsCard: {
    marginTop: spacing[4],
    marginBottom: spacing[4],
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[3],
  },
  buttonContainer: {
    marginTop: spacing[4],
    marginBottom: spacing[8],
  },
});

export default MoreScreen;
