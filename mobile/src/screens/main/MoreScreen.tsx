import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { spacing, lightTheme, darkTheme } from '../../theme';
// import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
// import type { MainStackParamList } from '../../types';

const MoreScreen: React.FC = () => {
  const { theme, setTheme } = useAppStore();
  const { logout } = useAuthStore();
  const navigation = useNavigation<any>();
  const isDark = theme === 'dark';
  const themeColors = isDark ? darkTheme : lightTheme;

  const menuItems = [
    {
      title: 'Profile',
      icon: '👤',
      onPress: () => navigation.navigate('Profile'),
    },
    {
      title: 'Settings',
      icon: '⚙️',
      onPress: () => navigation.navigate('Settings'),
    },
    {
      title: 'Journal',
      icon: '📔',
      onPress: () => Alert.alert('Coming soon', 'Journal is on the roadmap for mobile.'),
    },
    {
      title: 'Recipes',
      icon: '🍳',
      onPress: () => Alert.alert('Coming soon', 'Recipe management will be available soon.'),
    },
    {
      title: 'Wishlists',
      icon: '🎁',
      onPress: () => Alert.alert('Coming soon', 'Wishlist features are coming soon.'),
    },
    {
      title: 'Help & Support',
      icon: '❓',
      onPress: () => Alert.alert('Support', 'Email support@famconomy.com for help.'),
    },
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

      {menuItems.map((item) => (
        <TouchableOpacity
          key={item.title}
          activeOpacity={0.75}
          onPress={item.onPress}
        >
          <Card isDark={isDark} style={styles.menuItem}>
            <Text variant="h4" isDark={isDark}>
              {item.icon} {item.title}
            </Text>
          </Card>
        </TouchableOpacity>
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
