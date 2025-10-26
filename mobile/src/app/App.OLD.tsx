import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { ParentDashboard } from './screens/ParentDashboard';
import { ChildDevice } from './screens/ChildDevice';
import { LoginScreen } from './screens/Login';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#3b82f6',
  },
  userInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  userText: {
    fontSize: 12,
    color: '#374151',
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ef4444',
    borderRadius: 4,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
});

type Screen = 'parent' | 'child';

export default function App() {
  const { user, isLoading, logout, isAuthenticated } = useAuth();
  const [activeScreen, setActiveScreen] = useState<Screen>('parent');
  const isChildAccount = user?.role === 'child';

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    if (isChildAccount) {
      setActiveScreen('child');
    } else {
      setActiveScreen('parent');
    }
  }, [isAuthenticated, isChildAccount, user]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.userInfo}>
        <Text style={styles.userText}>
          {(user?.full_name || user?.firstName || user?.email) ?? user?.email} • {user?.role}
        </Text>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        {!isChildAccount && (
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeScreen === 'parent' && styles.tabButtonActive,
            ]}
            onPress={() => setActiveScreen('parent')}
          >
            <Text
              style={[
                styles.tabText,
                activeScreen === 'parent' && styles.tabTextActive,
              ]}
            >
              Parent Dashboard
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeScreen === 'child' && styles.tabButtonActive,
          ]}
          onPress={() => setActiveScreen('child')}
        >
          <Text
            style={[
              styles.tabText,
              activeScreen === 'child' && styles.tabTextActive,
            ]}
          >
            Child Device
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {activeScreen === 'parent' && !isChildAccount && <ParentDashboard />}
        {activeScreen === 'child' && <ChildDevice />}
      </View>
    </SafeAreaView>
  );
}
