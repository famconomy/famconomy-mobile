import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useAppStore } from '../../store/appStore';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Text } from '../../components/ui/Text';
import { Alert } from '../../components/ui/Alert';
import { spacing, lightTheme, darkTheme, fontSize } from '../../theme';
import * as authApi from '../../api/auth';

interface ForgotPasswordScreenProps {
  onBackPress?: () => void;
}

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ onBackPress }) => {
  const { theme } = useAppStore();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const isDark = theme === 'dark';
  const themeColors = isDark ? darkTheme : lightTheme;

  useEffect(() => {
    setError(null);
  }, []);

  const validateEmail = (): boolean => {
    if (!email.trim()) {
      setEmailError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email');
      return false;
    }
    setEmailError(null);
    return true;
  };

  const handleForgotPassword = async () => {
    if (!validateEmail()) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await authApi.forgotPassword({ email });
      setSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send reset email';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { backgroundColor: themeColors.background }]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.successContainer}>
            <Text variant="h2" isDark={isDark} style={styles.successIcon}>
              ✓
            </Text>
            <Text variant="h2" isDark={isDark} style={styles.successTitle}>
              Check Your Email
            </Text>
            <Text 
              variant="body" 
              color="textSecondary" 
              isDark={isDark} 
              style={styles.successMessage}
            >
              We've sent a password reset link to {email}. Please check your email and follow the instructions to reset your password.
            </Text>

            <Alert 
              type="info"
              title="Tip"
              message="If you don't see the email, check your spam or junk folder."
              isDark={isDark}
              style={styles.tip}
            />

            <Button
              title="Back to Login"
              onPress={onBackPress || (() => {})}
              isDark={isDark}
              variant="primary"
              style={styles.button}
              size="large"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

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
            Reset Password
          </Text>
          <Text 
            variant="body" 
            color="textSecondary" 
            isDark={isDark} 
            style={styles.subtitle}
          >
            Enter your email and we'll send you a link to reset your password
          </Text>
        </View>

        {/* Error Alert */}
        {error && (
          <Alert 
            type="error" 
            title="Error" 
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
              setEmailError(null);
            }}
            editable={!isLoading}
            isDark={isDark}
            containerStyle={styles.inputContainer}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={emailError}
          />

          <Button
            title={isLoading ? 'Sending...' : 'Send Reset Link'}
            onPress={handleForgotPassword}
            loading={isLoading}
            disabled={isLoading || !email}
            isDark={isDark}
            style={styles.button}
            size="large"
          />
        </View>

        {/* Back to Login */}
        <View style={styles.footer}>
          <TouchableOpacity disabled={isLoading} onPress={onBackPress || (() => {})}>
            <Text 
              variant="body" 
              color="primary" 
              isDark={isDark}
              weight="semibold"
            >
              ← Back to Login
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
  button: {
    marginTop: spacing[4],
  },
  alert: {
    marginBottom: spacing[4],
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing[6],
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: spacing[8],
  },
  successIcon: {
    color: '#22c55e',
    fontSize: 80,
    marginBottom: spacing[4],
  },
  successTitle: {
    marginBottom: spacing[3],
  },
  successMessage: {
    textAlign: 'center',
    marginBottom: spacing[6],
    lineHeight: 22,
  },
  tip: {
    marginBottom: spacing[6],
    alignSelf: 'stretch',
  },
});

export default ForgotPasswordScreen;
