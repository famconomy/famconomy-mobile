import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Text } from '../../components/ui/Text';
import { Alert } from '../../components/ui/Alert';
import { spacing, lightTheme, darkTheme, fontSize, fontWeight } from '../../theme';

interface LoginScreenProps {
  onSignUpPress?: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onSignUpPress }) => {
  const { theme } = useAppStore();
  const { login, error, isLoading, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const isDark = theme === 'dark';
  const themeColors = isDark ? darkTheme : lightTheme;

  // Clear errors when user starts typing
  useEffect(() => {
    clearError();
  }, [clearError]);

  const validateForm = (): boolean => {
    const errors: typeof fieldErrors = {};
    
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email';
    }
    
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await login(email, password);
    } catch (err) {
      // Error is already set by the store
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: themeColors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text variant="h1" isDark={isDark} weight="bold">
            Welcome Back
          </Text>
          <Text variant="body" color="textSecondary" isDark={isDark} style={styles.subtitle}>
            Sign in to your FamConomy account
          </Text>
        </View>

        {/* Error Alert */}
        {error && (
          <Alert 
            type="error" 
            title="Login Failed" 
            message={error} 
            isDark={isDark} 
            style={styles.alert} 
          />
        )}

        {/* Form */}
        <View style={styles.form}>
          <Input
            label="Email Address"
            placeholder="you@example.com"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setFieldErrors({ ...fieldErrors, email: undefined });
            }}
            editable={!isLoading}
            isDark={isDark}
            containerStyle={styles.inputContainer}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={fieldErrors.email}
          />

          <Input
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setFieldErrors({ ...fieldErrors, password: undefined });
            }}
            secureTextEntry
            editable={!isLoading}
            isDark={isDark}
            containerStyle={styles.inputContainer}
            error={fieldErrors.password}
          />

          <TouchableOpacity 
            style={styles.forgotPasswordContainer}
            disabled={isLoading}
          >
            <Text 
              variant="body" 
              color="primary" 
              isDark={isDark}
              style={{ fontSize: fontSize.sm }}
            >
              Forgot Password?
            </Text>
          </TouchableOpacity>

          <Button
            title={isLoading ? 'Signing in...' : 'Sign In'}
            onPress={handleLogin}
            loading={isLoading}
            disabled={isLoading || !email || !password}
            isDark={isDark}
            style={styles.button}
            size="large"
          />
        </View>

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
          <Text 
            variant="caption" 
            color="textTertiary" 
            isDark={isDark}
            style={styles.dividerText}
          >
            OR
          </Text>
          <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
        </View>

        {/* Social Login Placeholder */}
        <View style={styles.socialContainer}>
          <Button
            title="Continue with Apple"
            onPress={() => {}}
            variant="outline"
            isDark={isDark}
            style={styles.socialButton}
          />
          <Button
            title="Continue with Google"
            onPress={() => {}}
            variant="outline"
            isDark={isDark}
            style={styles.socialButton}
          />
        </View>

        {/* Sign Up Link */}
        <View style={styles.footer}>
          <Text variant="body" isDark={isDark}>
            Don't have an account?{' '}
          </Text>
          <TouchableOpacity disabled={isLoading} onPress={onSignUpPress}>
            <Text 
              variant="body" 
              color="primary" 
              isDark={isDark}
              weight="semibold"
            >
              Create one
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing[4],
    justifyContent: 'center',
    paddingBottom: spacing[8],
  },
  header: {
    marginBottom: spacing[6],
  },
  subtitle: {
    marginTop: spacing[2],
  },
  form: {
    marginVertical: spacing[4],
  },
  inputContainer: {
    marginBottom: spacing[4],
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: spacing[4],
    marginTop: spacing[1],
  },
  button: {
    marginTop: spacing[2],
  },
  alert: {
    marginBottom: spacing[4],
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing[6],
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: spacing[3],
  },
  socialContainer: {
    gap: spacing[3],
    marginBottom: spacing[6],
  },
  socialButton: {
    marginBottom: spacing[2],
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing[4],
    flexWrap: 'wrap',
  },
});

export default LoginScreen;
