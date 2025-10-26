import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { lightTheme, darkTheme } from '../../theme';

const SplashScreen: React.FC = () => {
  const { theme, setInitialized } = useAppStore();
  const { isLoading } = useAuthStore();
  const isDark = theme === 'dark';
  const themeColors = isDark ? darkTheme : lightTheme;

  useEffect(() => {
    // Initialize app - check auth status, load user preferences, etc.
    const initializeApp = async () => {
      try {
        // TODO: Add any initialization logic here
        // - Load user from token if exists
        // - Load app settings
        // - Set up listeners
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate loading
      } catch (error) {
        console.error('Failed to initialize app:', error);
      } finally {
        setInitialized(true);
      }
    };

    initializeApp();
  }, [setInitialized]);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: themeColors.background },
      ]}
    >
      <LoadingSpinner isDark={isDark} message="Loading FamConomy..." />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SplashScreen;
