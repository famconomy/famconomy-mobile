import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Text } from '../../components/ui/Text';
import { Alert } from '../../components/ui/Alert';
import { spacing, lightTheme, darkTheme, fontSize, fontWeight } from '../../theme';

interface SignUpScreenProps {
  onLoginPress?: () => void;
}

const SignUpScreen: React.FC<SignUpScreenProps> = ({ onLoginPress }) => {
  const { theme } = useAppStore();
  const { signup, error, isLoading, clearError } = useAuthStore();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const isDark = theme === 'dark';
  const themeColors = isDark ? darkTheme : lightTheme;

  useEffect(() => {
    clearError();
  }, [clearError]);

  const validateForm = (): boolean => {
    const errors: typeof fieldErrors = {};

    if (!fullName.trim()) {
      errors.fullName = 'Full name is required';
    } else if (fullName.trim().length < 2) {
      errors.fullName = 'Name must be at least 2 characters';
    }

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])/.test(password)) {
      errors.password = 'Password must contain at least one lowercase letter';
    } else if (!/(?=.*[A-Z])/.test(password)) {
      errors.password = 'Password must contain at least one uppercase letter';
    } else if (!/(?=.*\d)/.test(password)) {
      errors.password = 'Password must contain at least one number';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await signup(fullName, email, password);
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
            Create Account
          </Text>
          <Text variant="body" color="textSecondary" isDark={isDark} style={styles.subtitle}>
            Join FamConomy to manage your family
          </Text>
        </View>

        {/* Error Alert */}
        {error && (
          <Alert 
            type="error" 
            title="Signup Failed" 
            message={error} 
            isDark={isDark} 
            style={styles.alert} 
          />
        )}

        {/* Form */}
        <View style={styles.form}>
          <Input
            label="Full Name"
            placeholder="John Smith"
            value={fullName}
            onChangeText={(text) => {
              setFullName(text);
              setFieldErrors({ ...fieldErrors, fullName: undefined });
            }}
            editable={!isLoading}
            isDark={isDark}
            containerStyle={styles.inputContainer}
            autoComplete="name"
            error={fieldErrors.fullName}
          />

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
            placeholder="Create a strong password"
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

          <View style={styles.passwordHints}>
            <PasswordRequirement 
              met={password.length >= 8} 
              text="At least 8 characters" 
              isDark={isDark} 
            />
            <PasswordRequirement 
              met={/(?=.*[a-z])/.test(password)} 
              text="One lowercase letter" 
              isDark={isDark} 
            />
            <PasswordRequirement 
              met={/(?=.*[A-Z])/.test(password)} 
              text="One uppercase letter" 
              isDark={isDark} 
            />
            <PasswordRequirement 
              met={/(?=.*\d)/.test(password)} 
              text="One number" 
              isDark={isDark} 
            />
          </View>

          <Input
            label="Confirm Password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              setFieldErrors({ ...fieldErrors, confirmPassword: undefined });
            }}
            secureTextEntry
            editable={!isLoading}
            isDark={isDark}
            containerStyle={styles.inputContainer}
            error={fieldErrors.confirmPassword}
          />

          <Button
            title={isLoading ? 'Creating account...' : 'Create Account'}
            onPress={handleSignUp}
            loading={isLoading}
            disabled={isLoading || !fullName || !email || !password || !confirmPassword}
            isDark={isDark}
            style={styles.button}
            size="large"
          />
        </View>

        {/* Terms */}
        <View style={styles.terms}>
          <Text variant="caption" color="textSecondary" isDark={isDark} style={styles.termsText}>
            By creating an account, you agree to our{' '}
            <Text variant="caption" color="primary" isDark={isDark} weight="semibold">
              Terms of Service
            </Text>
            {' '}and{' '}
            <Text variant="caption" color="primary" isDark={isDark} weight="semibold">
              Privacy Policy
            </Text>
          </Text>
        </View>

        {/* Sign In Link */}
        <View style={styles.footer}>
          <Text variant="body" isDark={isDark}>
            Already have an account?{' '}
          </Text>
          <TouchableOpacity disabled={isLoading} onPress={onLoginPress}>
            <Text 
              variant="body" 
              color="primary" 
              isDark={isDark}
              weight="semibold"
            >
              Sign in
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

interface PasswordRequirementProps {
  met: boolean;
  text: string;
  isDark: boolean;
}

const PasswordRequirement: React.FC<PasswordRequirementProps> = ({ met, text, isDark }) => {
  const theme = isDark ? darkTheme : lightTheme;
  return (
    <View style={styles.requirement}>
      <Text 
        style={{
          fontSize: 16,
          marginRight: spacing[1],
          color: met ? theme.success : theme.textTertiary,
        }}
      >
        {met ? '✓' : '○'}
      </Text>
      <Text 
        variant="caption" 
        color={met ? 'success' : 'textTertiary'} 
        isDark={isDark}
      >
        {text}
      </Text>
    </View>
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
  passwordHints: {
    backgroundColor: 'transparent',
    marginBottom: spacing[4],
    gap: spacing[2],
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing[2],
  },
  button: {
    marginTop: spacing[4],
  },
  alert: {
    marginBottom: spacing[4],
  },
  terms: {
    marginVertical: spacing[4],
    paddingHorizontal: spacing[2],
  },
  termsText: {
    lineHeight: 20,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing[4],
    flexWrap: 'wrap',
  },
});

export default SignUpScreen;
