import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { lightTheme, darkTheme, spacing, borderRadius, shadows } from '../../theme';
import type { Theme } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  isDark?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
}

const getCardStyles = (theme: Theme, elevated: boolean = false): ViewStyle => {
  return {
    backgroundColor: theme.surface,
    borderRadius: borderRadius.md,
    padding: spacing[4],
    ...(elevated ? shadows.cardHover : shadows.card),
  };
};

export const Card: React.FC<CardProps> = ({
  children,
  isDark = false,
  style,
  elevated = false,
}) => {
  const theme = isDark ? darkTheme : lightTheme;
  const cardStyle = getCardStyles(theme, elevated);

  return (
    <View style={[cardStyle, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.md,
    padding: spacing[4],
  },
});
