import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { lightTheme, darkTheme, fontSize, fontWeight, lineHeight } from '../../theme';
import type { Theme } from '../../theme';

interface TextComponentProps extends TextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'caption' | 'label';
  isDark?: boolean;
  color?: 'text' | 'textSecondary' | 'textTertiary' | 'primary' | 'error' | 'success' | 'warning';
  weight?: keyof typeof fontWeight;
}

const getTextStyles = (
  theme: Theme,
  variant: TextComponentProps['variant'] = 'body',
  color: TextComponentProps['color'] = 'text',
  weight?: TextComponentProps['weight']
) => {
  const variantStyles = {
    h1: {
      fontSize: fontSize['3xl'],
      fontWeight: fontWeight.bold as any,
      // Let React Native compute an appropriate line height
    },
    h2: {
      fontSize: fontSize['2xl'],
      fontWeight: fontWeight.bold as any,
    },
    h3: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.semibold as any,
    },
    h4: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.semibold as any,
    },
    body: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.normal as any,
    },
    caption: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.normal as any,
    },
    label: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium as any,
    },
  };

  const colorMap: Record<string, string> = {
    text: theme.text,
    textSecondary: theme.textSecondary,
    textTertiary: theme.textTertiary,
    primary: theme.primary,
    error: theme.error,
    success: theme.success,
    warning: theme.warning,
  };

  // Map to named font styles for Plus Jakarta Sans; React Native uses fontFamily
  // variants for different weights. We'll provide sensible fallbacks.
  const fontFamilyForWeight = (w?: keyof typeof fontWeight) => {
    switch (w) {
      case 'semibold':
        return 'PlusJakartaSans-SemiBold';
      case 'bold':
        return 'PlusJakartaSans-Bold';
      case 'medium':
        return 'PlusJakartaSans-Medium';
      default:
        return 'PlusJakartaSans-Regular';
    }
  };

  return {
    ...variantStyles[variant],
    color: colorMap[color],
    // Prefer brand font; if not available yet, RN will fall back
    fontFamily: fontFamilyForWeight(weight),
  };
};

export const Text: React.FC<TextComponentProps> = ({
  variant = 'body',
  isDark = false,
  color = 'text',
  weight,
  style,
  ...props
}) => {
  const theme = isDark ? darkTheme : lightTheme;
  const textStyles = getTextStyles(theme, variant, color, weight);

  return <RNText {...props} style={[textStyles, style]} />;
};

const styles = StyleSheet.create({
  text: {},
});
