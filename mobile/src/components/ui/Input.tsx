import React from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
} from 'react-native';
import { lightTheme, darkTheme, fontSize, fontWeight, spacing, borderRadius } from '../../theme';
import type { Theme } from '../../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  isDark?: boolean;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
}

const getInputStyles = (theme: Theme, isDark: boolean): TextStyle => {
  return {
    flex: 1,
    fontSize: fontSize.base,
    color: theme.text,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: borderRadius.base,
    backgroundColor: theme.surface,
  };
};

export const Input: React.FC<InputProps> = ({
  label,
  error,
  isDark = false,
  containerStyle,
  inputStyle,
  placeholderTextColor,
  ...props
}) => {
  const theme = isDark ? darkTheme : lightTheme;
  const inputDefaultStyle = getInputStyles(theme, isDark);

  return (
    <View style={containerStyle}>
      {label && (
        <Text
          style={{
            fontSize: fontSize.sm,
            fontWeight: fontWeight.semibold as any,
            color: theme.text,
            marginBottom: spacing[1],
          }}
        >
          {label}
        </Text>
      )}
      <TextInput
        {...props}
        style={[inputDefaultStyle, inputStyle]}
        placeholderTextColor={placeholderTextColor || theme.textTertiary}
      />
      {error && (
        <Text
          style={{
            fontSize: fontSize.xs,
            color: theme.error,
            marginTop: spacing[1],
          }}
        >
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing[2],
  },
});
