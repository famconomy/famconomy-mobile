import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  SafeAreaView,
} from 'react-native';
import { lightTheme, darkTheme, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import type { Theme } from '../../theme';

interface HeaderProps {
  title: string;
  subtitle?: string;
  leftAction?: {
    label: string;
    onPress: () => void;
  };
  rightAction?: {
    label: string;
    onPress: () => void;
  };
  isDark?: boolean;
}

const getHeaderStyles = (theme: Theme): ViewStyle => {
  return {
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  };
};

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  leftAction,
  rightAction,
  isDark = false,
}) => {
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <SafeAreaView style={getHeaderStyles(theme)}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: subtitle ? spacing[1] : 0,
        }}
      >
        <View style={{ flex: 1 }}>
          {leftAction ? (
            <TouchableOpacity onPress={leftAction.onPress} activeOpacity={0.7}>
              <Text
                style={{
                  fontSize: fontSize.base,
                  fontWeight: fontWeight.medium as any,
                  color: theme.primary,
                }}
              >
                {leftAction.label}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={{ flex: 2, alignItems: 'center' }}>
          <Text
            style={{
              fontSize: fontSize.lg,
              fontWeight: fontWeight.bold as any,
              color: theme.text,
            }}
          >
            {title}
          </Text>
        </View>

        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          {rightAction ? (
            <TouchableOpacity onPress={rightAction.onPress} activeOpacity={0.7}>
              <Text
                style={{
                  fontSize: fontSize.base,
                  fontWeight: fontWeight.medium as any,
                  color: theme.primary,
                }}
              >
                {rightAction.label}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {subtitle && (
        <Text
          style={{
            fontSize: fontSize.sm,
            color: theme.textSecondary,
          }}
        >
          {subtitle}
        </Text>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
});
