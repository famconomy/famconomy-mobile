import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  logoContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#3b82f6',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1f2937',
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#991b1b',
    fontSize: 14,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#d1d5db',
  },
  dividerText: {
    paddingHorizontal: 12,
    color: '#6b7280',
    fontSize: 12,
  },
  providersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  providerButton: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  providerText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 6,
  },
  providerEmoji: {
    fontSize: 18,
  },
  footerText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 16,
  },
  linkText: {
    color: '#3b82f6',
    fontWeight: '600',
  },
});

interface LoginCredentials {
  email: string;
  password: string;
}

export const LoginScreen: React.FC = () => {
  const { login, isLoading, error: authError, loginWithProvider } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleLogin = async (credentials: LoginCredentials) => {
    console.log('Login attempt with:', credentials.email);

    if (!credentials.email.trim()) {
      setLocalError('Please enter your email address');
      return;
    }
    if (!credentials.password.trim()) {
      setLocalError('Please enter your password');
      return;
    }

    try {
      setLocalError('');
      console.log('Calling login...');
      await login(credentials);
      console.log('Login successful!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      console.error('Login error:', message);
      setLocalError(message);
    }
  };

  const handleOAuthProvider = async (provider: 'google' | 'apple' | 'microsoft' | 'facebook') => {
    try {
      setLocalError('');
      console.log('Starting OAuth login with:', provider);
      await loginWithProvider(provider);
    } catch (err) {
      const message = err instanceof Error ? err.message : `${provider} login failed`;
      setLocalError(message);
      console.error('OAuth error:', message);
    }
  };

  const displayError = localError || authError;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>FC</Text>
          </View>
          <Text style={styles.title}>FamConomy</Text>
          <Text style={styles.subtitle}>
            Family Management & Device Control
          </Text>
        </View>

        <View style={styles.card}>
          {displayError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{displayError}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              editable={!isLoading}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              editable={!isLoading}
              secureTextEntry
              placeholderTextColor="#9ca3af"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={() => handleLogin({ email, password })}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign in</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.providersContainer}>
            <TouchableOpacity
              style={styles.providerButton}
              onPress={() => handleOAuthProvider('google')}
              disabled={isLoading}
            >
              <Text style={styles.providerEmoji}>🔍</Text>
              <Text style={styles.providerText}>Google</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.providerButton}
              onPress={() => handleOAuthProvider('facebook')}
              disabled={isLoading}
            >
              <Text style={styles.providerEmoji}>👨‍👩‍👧‍👦</Text>
              <Text style={styles.providerText}>Meta</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.providerButton}
              onPress={() => handleOAuthProvider('apple')}
              disabled={isLoading}
            >
              <Text style={styles.providerEmoji}>🍎</Text>
              <Text style={styles.providerText}>Apple</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.providerButton}
              onPress={() => handleOAuthProvider('microsoft')}
              disabled={isLoading}
            >
              <Text style={styles.providerEmoji}>⊞</Text>
              <Text style={styles.providerText}>Microsoft</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footerText}>
            Don't have an account?{' '}
            <Text
              style={styles.linkText}
              onPress={() => Alert.alert('Sign up', 'Sign up feature coming soon')}
            >
              Sign up
            </Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default LoginScreen;
