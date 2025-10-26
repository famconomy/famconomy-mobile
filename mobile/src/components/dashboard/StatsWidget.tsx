import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from '../ui/Text';
import { spacing, lightTheme, darkTheme, borderRadius, shadows } from '../../theme';
import type { Theme } from '../../theme';

interface StatsWidgetProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  isDark?: boolean;
  style?: ViewStyle;
}

const getColorByType = (theme: Theme, color: StatsWidgetProps['color'] = 'primary'): string => {
  const colors = {
    primary: theme.primary,
    secondary: theme.secondary,
    success: theme.success,
    warning: theme.warning,
    error: theme.error,
  };
  return colors[color];
};

const getBackgroundColor = (theme: Theme, color: StatsWidgetProps['color'] = 'primary'): string => {
  const colors = {
    primary: theme.primaryLight,
    secondary: theme.secondaryLight,
    success: theme.successLight,
    warning: theme.warningLight,
    error: theme.errorLight,
  };
  return colors[color];
};

export const StatsWidget: React.FC<StatsWidgetProps> = ({
  title,
  value,
  subtitle,
  icon,
  color = 'primary',
  isDark = false,
  style,
}) => {
  const theme = isDark ? darkTheme : lightTheme;
  const accentColor = getColorByType(theme, color);
  const backgroundColor = getBackgroundColor(theme, color);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
        style,
      ]}
    >
      {icon && (
        <Text style={{ fontSize: 32, marginBottom: spacing[2] }}>
          {icon}
        </Text>
      )}
      <Text variant="caption" color="textSecondary" isDark={isDark}>
        {title}
      </Text>
      <Text
        variant="h2"
        isDark={isDark}
        weight="bold"
        style={{ color: accentColor, marginVertical: spacing[1] }}
      >
        {value}
      </Text>
      {subtitle && (
        <Text variant="caption" color="textTertiary" isDark={isDark}>
          {subtitle}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    padding: spacing[4],
    borderWidth: 1,
    ...shadows.base,
  },
});
