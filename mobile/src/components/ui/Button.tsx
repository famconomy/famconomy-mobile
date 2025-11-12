import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { lightTheme, darkTheme, fontSize, fontWeight, spacing, borderRadius, shadows } from '../../theme';
import type { Theme } from '../../theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  isDark?: boolean;
  style?: import('react-native').StyleProp<ViewStyle>;
}

const getButtonStyles = (
  theme: Theme,
  variant: ButtonProps['variant'] = 'primary',
  size: ButtonProps['size'] = 'medium',
  disabled: boolean = false,
  isDark: boolean = false
) : ViewStyle => {
  const baseStyle: ViewStyle = {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    ...shadows.base,
  };

  const sizeStyles: Record<string, ViewStyle> = {
    small: {
      paddingVertical: spacing[1],
      paddingHorizontal: spacing[3],
    },
    medium: {
      paddingVertical: spacing[2],
      paddingHorizontal: spacing[4],
    },
    large: {
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[6],
    },
  };

  const variantStyles: Record<string, ViewStyle> = {
    primary: {
      backgroundColor: disabled ? theme.textTertiary : theme.primary,
    },
    secondary: {
      backgroundColor: disabled ? theme.textTertiary : theme.secondary,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: disabled ? theme.textTertiary : theme.primary,
    },
    danger: {
      backgroundColor: disabled ? theme.textTertiary : theme.error,
    },
  };

  const result: ViewStyle = {
    ...baseStyle,
    ...sizeStyles[size],
    ...variantStyles[variant],
    opacity: disabled ? 0.6 : 1,
  };
  return result;
};

const getTextStyles = (
  theme: Theme,
  variant: ButtonProps['variant'] = 'primary',
  size: ButtonProps['size'] = 'medium',
  isDark: boolean = false
): TextStyle => {
  const fontSizes: Record<string, number> = {
    small: fontSize.sm,
    medium: fontSize.base,
    large: fontSize.lg,
  };

  const textColors: Record<string, string> = {
    primary: '#fff',
    secondary: '#fff',
    outline: theme.primary,
    danger: '#fff',
  };

  return {
    fontSize: fontSizes[size],
    fontWeight: fontWeight.semibold as any,
    color: textColors[variant],
  };
};

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  isDark = false,
  style,
}) => {
  const theme = isDark ? darkTheme : lightTheme;
  const buttonStyle = getButtonStyles(theme, variant, size, disabled || loading, isDark);
  const textStyle = getTextStyles(theme, variant, size, isDark);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[buttonStyle, style]}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={textStyle.color} size="small" />
      ) : (
        <Text style={textStyle}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
});
