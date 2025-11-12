import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Switch,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import {
  User as UserIcon,
  Bell,
  Mail,
  Palette,
  HelpCircle,
  Shield,
  FileText,
  Info,
  LogOut,
  ChevronRight,
} from 'lucide-react-native';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { useFamily } from '../../hooks/useFamily';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { spacing, lightTheme, darkTheme, borderRadius, fontSize } from '../../theme';
import type { MainStackParamList } from '../../types';
import { Toast } from '../../components/ui/Toast';
import { updateUser } from '../../api/users';

const SettingsScreen: React.FC = () => {
  const {
    theme,
    setTheme,
    notifications,
    setNotifications,
    emailNotifications,
    setEmailNotifications,
  } = useAppStore();
  const { user, logout, setUser } = useAuthStore();
  const { family } = useFamily();
  const navigation = useNavigation<any>();
  const [pendingPreference, setPendingPreference] = useState<null | 'push' | 'email' | 'theme'>(null);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);

  const isDark = theme === 'dark';
  const themeColors = isDark ? darkTheme : lightTheme;

  const contactEmail = 'support@famconomy.com';

  const userDisplayName = useMemo(() => {
    if (user?.fullName) return user.fullName;
    const composed = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
    return composed || user?.email || 'FamConomy Member';
  }, [user]);

  useEffect(() => {
    if (!user?.preferences) return;
    const prefs = user.preferences;
    if (
      prefs.pushNotificationsEnabled !== undefined &&
      prefs.pushNotificationsEnabled !== notifications
    ) {
      setNotifications(prefs.pushNotificationsEnabled);
    }
    if (
      prefs.emailNotificationsEnabled !== undefined &&
      prefs.emailNotificationsEnabled !== emailNotifications
    ) {
      setEmailNotifications(prefs.emailNotificationsEnabled);
    }
    if (
      prefs.themePreference &&
      prefs.themePreference !== theme
    ) {
      setTheme(prefs.themePreference);
    }
  }, [user?.preferences, notifications, emailNotifications, theme, setNotifications, setEmailNotifications, setTheme]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: logout,
      },
    ]);
  };

  const handleLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Unavailable', 'Unable to open the requested link.');
    });
  };

  const syncPreferences = async (
    changes: { pushNotificationsEnabled?: boolean; emailNotificationsEnabled?: boolean; themePreference?: 'light' | 'dark' },
    revert?: () => void,
    source?: 'push' | 'email' | 'theme',
  ) => {
    if (!user) {
      setToast({ message: 'Sign in to sync preferences.', type: 'info' });
      return;
    }
    try {
      setPendingPreference(source ?? null);
      const payload = { preferences: changes };
      const apiUser: any = await updateUser(user.id, payload);
      const rawPreferences =
        apiUser?.preferences ??
        apiUser?.Preferences ??
        apiUser?.settings ??
        user.preferences ??
        {};
      const normalizedPreferences = {
        pushNotificationsEnabled:
          rawPreferences?.pushNotificationsEnabled ??
          rawPreferences?.PushNotificationsEnabled ??
          changes.pushNotificationsEnabled ??
          user.preferences?.pushNotificationsEnabled,
        emailNotificationsEnabled:
          rawPreferences?.emailNotificationsEnabled ??
          rawPreferences?.EmailNotificationsEnabled ??
          changes.emailNotificationsEnabled ??
          user.preferences?.emailNotificationsEnabled,
        themePreference:
          rawPreferences?.themePreference ??
          rawPreferences?.ThemePreference ??
          changes.themePreference ??
          user.preferences?.themePreference,
      };
      setUser({
        ...user,
        preferences: normalizedPreferences,
      } as any);
    } catch (err) {
      revert?.();
      const message =
        err instanceof Error ? err.message : 'Failed to update your preferences.';
      setToast({ message, type: 'error' });
    } finally {
      setPendingPreference(null);
    }
  };

  const handleTogglePush = (value: boolean) => {
    const previous = notifications;
    setNotifications(value);
    void syncPreferences(
      { pushNotificationsEnabled: value },
      () => setNotifications(previous),
      'push',
    );
  };

  const handleToggleEmail = (value: boolean) => {
    const previous = emailNotifications;
    setEmailNotifications(value);
    void syncPreferences(
      { emailNotificationsEnabled: value },
      () => setEmailNotifications(previous),
      'email',
    );
  };

  const handleToggleTheme = (value: boolean) => {
    const previous = theme;
    const nextTheme = value ? 'dark' : 'light';
    setTheme(nextTheme);
    void syncPreferences(
      { themePreference: nextTheme },
      () => setTheme(previous),
      'theme',
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {toast && <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />}

      <Card isDark={isDark} elevated style={styles.userCard}>
        <View style={styles.userRow}>
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: themeColors.primary,
              },
            ]}
          >
            <UserIcon size={28} color="#fff" />
          </View>
          <View style={{ flex: 1, marginLeft: spacing[3] }}>
            <Text variant="h3" isDark={isDark} weight="bold">
              {userDisplayName}
            </Text>
            <Text variant="body" color="textSecondary" isDark={isDark}>
              {user?.email ?? 'No email provided'}
            </Text>
            {family && (
              <Text variant="caption" color="textSecondary" isDark={isDark} style={{ marginTop: spacing[1] }}>
                👪 {family.name}
              </Text>
            )}
          </View>
        </View>
        <Button
          title="View profile"
          onPress={() => navigation.navigate('Profile')}
          size="small"
          style={{ marginTop: spacing[3] }}
          isDark={isDark}
        />
      </Card>

      <Card isDark={isDark} style={styles.sectionCard}>
        <Text variant="h3" isDark={isDark} weight="bold" style={styles.sectionTitle}>
          Account
        </Text>
        <TouchableOpacity
          style={styles.rowItem}
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.7}
        >
          <View style={styles.rowLeft}>
            <UserIcon size={20} color={themeColors.primary} />
            <Text variant="body" isDark={isDark} style={styles.rowLabel}>
              Profile
            </Text>
          </View>
          <ChevronRight size={18} color={themeColors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.rowItem}
          onPress={() => Alert.alert('Coming soon', 'Privacy settings will be available soon.')}
          activeOpacity={0.7}
        >
          <View style={styles.rowLeft}>
            <Shield size={20} color={themeColors.primary} />
            <Text variant="body" isDark={isDark} style={styles.rowLabel}>
              Privacy & Security
            </Text>
          </View>
          <ChevronRight size={18} color={themeColors.textSecondary} />
        </TouchableOpacity>
      </Card>

      <Card isDark={isDark} style={styles.sectionCard}>
        <Text variant="h3" isDark={isDark} weight="bold" style={styles.sectionTitle}>
          Notifications
        </Text>
        <View style={styles.rowItem}>
          <View style={styles.rowLeft}>
            <Bell size={20} color={themeColors.primary} />
            <Text variant="body" isDark={isDark} style={styles.rowLabel}>
              Push Notifications
            </Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={handleTogglePush}
            trackColor={{ false: themeColors.surfaceVariant, true: themeColors.primaryLight }}
            thumbColor={notifications ? themeColors.primary : '#f4f4f5'}
            disabled={pendingPreference === 'push'}
          />
        </View>
        <View style={styles.rowItem}>
          <View style={styles.rowLeft}>
            <Mail size={20} color={themeColors.primary} />
            <Text variant="body" isDark={isDark} style={styles.rowLabel}>
              Email Notifications
            </Text>
          </View>
          <Switch
            value={emailNotifications}
            onValueChange={handleToggleEmail}
            trackColor={{ false: themeColors.surfaceVariant, true: themeColors.primaryLight }}
            thumbColor={emailNotifications ? themeColors.primary : '#f4f4f5'}
            disabled={pendingPreference === 'email'}
          />
        </View>
      </Card>

      <Card isDark={isDark} style={styles.sectionCard}>
        <Text variant="h3" isDark={isDark} weight="bold" style={styles.sectionTitle}>
          Appearance
        </Text>
        <View style={styles.rowItem}>
          <View style={styles.rowLeft}>
            <Palette size={20} color={themeColors.primary} />
            <Text variant="body" isDark={isDark} style={styles.rowLabel}>
              Dark Mode
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={handleToggleTheme}
            trackColor={{ false: themeColors.surfaceVariant, true: themeColors.primaryLight }}
            thumbColor={isDark ? themeColors.primary : '#f4f4f5'}
            disabled={pendingPreference === 'theme'}
          />
        </View>
      </Card>

      <Card isDark={isDark} style={styles.sectionCard}>
        <Text variant="h3" isDark={isDark} weight="bold" style={styles.sectionTitle}>
          Support
        </Text>
        <TouchableOpacity
          style={styles.rowItem}
          onPress={() => Linking.openURL(`mailto:${contactEmail}`)}
          activeOpacity={0.7}
        >
          <View style={styles.rowLeft}>
            <HelpCircle size={20} color={themeColors.primary} />
            <Text variant="body" isDark={isDark} style={styles.rowLabel}>
              Help & Support
            </Text>
          </View>
          <ChevronRight size={18} color={themeColors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.rowItem}
          onPress={() => handleLink('https://famconomy.com/privacy')}
          activeOpacity={0.7}
        >
          <View style={styles.rowLeft}>
            <Shield size={20} color={themeColors.primary} />
            <Text variant="body" isDark={isDark} style={styles.rowLabel}>
              Privacy Policy
            </Text>
          </View>
          <ChevronRight size={18} color={themeColors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.rowItem}
          onPress={() => handleLink('https://famconomy.com/terms')}
          activeOpacity={0.7}
        >
          <View style={styles.rowLeft}>
            <FileText size={20} color={themeColors.primary} />
            <Text variant="body" isDark={isDark} style={styles.rowLabel}>
              Terms of Service
            </Text>
          </View>
          <ChevronRight size={18} color={themeColors.textSecondary} />
        </TouchableOpacity>
      </Card>

      <Card isDark={isDark} style={styles.sectionCard}>
        <Text variant="h3" isDark={isDark} weight="bold" style={styles.sectionTitle}>
          About
        </Text>
        <View style={styles.rowItem}>
          <View style={styles.rowLeft}>
            <Info size={20} color={themeColors.primary} />
            <Text variant="body" isDark={isDark} style={styles.rowLabel}>
              Version
            </Text>
          </View>
          <Text variant="body" color="textSecondary" isDark={isDark}>
            1.0.0
          </Text>
        </View>
      </Card>

      <Card isDark={isDark} style={styles.sectionCard}>
        <TouchableOpacity style={styles.logoutRow} onPress={handleLogout}>
          <LogOut size={22} color={themeColors.error} />
          <Text style={[styles.logoutText, { color: themeColors.error }]}>
            Logout
          </Text>
        </TouchableOpacity>
      </Card>

      <View style={styles.footer}>
        <Text variant="caption" color="textSecondary" isDark={isDark}>
          Need help? Email us at {contactEmail}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing[4],
  },
  userCard: {
    marginBottom: spacing[4],
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCard: {
    marginBottom: spacing[4],
  },
  sectionTitle: {
    marginBottom: spacing[3],
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  rowLabel: {
    fontSize: fontSize.base,
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[1],
  },
  logoutText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginBottom: spacing[8],
  },
});

export default SettingsScreen;
