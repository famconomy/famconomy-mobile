import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { lightTheme, darkTheme, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import type { Theme } from '../../theme';

interface AlertProps {
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  isDark?: boolean;
  style?: ViewStyle;
}

const getAlertStyles = (theme: Theme, type: AlertProps['type'] = 'info'): ViewStyle => {
  const baseStyle: ViewStyle = {
    borderRadius: borderRadius.base,
    padding: spacing[3],
    marginVertical: spacing[2],
    borderLeftWidth: 4,
  };

  const typeStyles: Record<string, ViewStyle> = {
    success: {
      backgroundColor: theme.successLight,
      borderLeftColor: theme.success,
    },
    error: {
      backgroundColor: theme.errorLight,
      borderLeftColor: theme.error,
    },
    warning: {
      backgroundColor: theme.warningLight,
      borderLeftColor: theme.warning,
    },
    info: {
      backgroundColor: theme.primaryLight,
      borderLeftColor: theme.primary,
    },
  };

  return {
    ...baseStyle,
    ...typeStyles[type],
  };
};

const getAlertTextColor = (theme: Theme, type: AlertProps['type'] = 'info'): string => {
  const colors: Record<string, string> = {
    success: theme.success,
    error: theme.error,
    warning: theme.warning,
    info: theme.primary,
  };
  return colors[type];
};

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  message,
  isDark = false,
  style,
}) => {
  const theme = isDark ? darkTheme : lightTheme;
  const alertStyle = getAlertStyles(theme, type);
  const textColor = getAlertTextColor(theme, type);

  return (
    <View style={[alertStyle, style]}>
      {title && (
        <Text
          style={{
            fontSize: fontSize.sm,
            fontWeight: fontWeight.semibold as any,
            color: textColor,
            marginBottom: spacing[1],
          }}
        >
          {title}
        </Text>
      )}
      <Text
        style={{
          fontSize: fontSize.sm,
          color: theme.text,
          lineHeight: 20,
        }}
      >
        {message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  alert: {
    borderRadius: borderRadius.base,
    padding: spacing[3],
    marginVertical: spacing[2],
  },
});
