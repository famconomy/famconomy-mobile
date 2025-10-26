import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { lightTheme, darkTheme, spacing, fontSize } from '../../theme';
import type { Theme } from '../../theme';

interface LoadingSpinnerProps {
  isDark?: boolean;
  size?: 'small' | 'large';
  message?: string;
  style?: ViewStyle;
}

const getSpinnerStyles = (theme: Theme): ViewStyle => {
  return {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.background,
  };
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  isDark = false,
  size = 'large',
  message,
  style,
}) => {
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <View style={[getSpinnerStyles(theme), style]}>
      <ActivityIndicator size={size} color={theme.primary} />
      {message && (
        <Text
          style={{
            marginTop: spacing[3],
            fontSize: fontSize.sm,
            color: theme.textSecondary,
          }}
        >
          {message}
        </Text>
      )}
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
