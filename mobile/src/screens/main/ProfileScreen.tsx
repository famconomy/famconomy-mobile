import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { User as UserIcon, Camera, Award, Calendar } from 'lucide-react-native';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Toast } from '../../components/ui/Toast';
import { spacing, lightTheme, darkTheme, borderRadius, fontSize } from '../../theme';
import { updateUser } from '../../api/users';
import type { User as UserModel } from '../../types';

const formatDate = (value?: string | Date | null) => {
  if (!value) return '—';
  try {
    const date = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString();
  } catch {
    return '—';
  }
};

const ProfileScreen: React.FC = () => {
  const { theme } = useAppStore();
  const { user, setUser } = useAuthStore();

  const isDark = theme === 'dark';
  const themeColors = isDark ? darkTheme : lightTheme;

  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName ?? user?.fullName?.split(' ')[0] ?? '');
  const [lastName, setLastName] = useState(
    user?.lastName ?? user?.fullName?.split(' ').slice(1).join(' ') ?? '',
  );
  const [email, setEmail] = useState(user?.email ?? '');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (user && isEditing) {
      setFirstName(user.firstName ?? user.fullName?.split(' ')[0] ?? '');
      setLastName(user.lastName ?? user.fullName?.split(' ').slice(1).join(' ') ?? '');
      setEmail(user.email ?? '');
      setFormError(null);
    }
  }, [isEditing, user]);

  const fullName = useMemo(() => {
    if (user?.fullName) return user.fullName;
    const composed = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
    return composed || user?.email || 'Member';
  }, [user]);

  const initials = useMemo(() => {
    if (user?.fullName) {
      return user.fullName
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
    }
    if (user?.firstName || user?.lastName) {
      return `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'F';
    }
    return user?.email?.[0]?.toUpperCase() ?? 'F';
  }, [user]);

  const badges = useMemo(() => {
    const result: Array<{ icon: React.ReactNode; label: string; value: string }> = [];
    if (user?.role) {
      const icon = <Award size={16} color={themeColors.primary} />;
      const label = 'Role';
      const value = user.role.charAt(0).toUpperCase() + user.role.slice(1);
      result.push({ icon, label, value });
    }
    if (user?.signupDate) {
      const icon = <Calendar size={16} color={themeColors.primary} />;
      result.push({
        icon,
        label: 'Member since',
        value: formatDate(user.signupDate),
      });
    }
    return result;
  }, [themeColors.primary, user?.role, user?.signupDate]);

  const handleSaveProfile = async () => {
    if (!user) return;
    if (!firstName.trim() || !lastName.trim()) {
      setFormError('Please provide both first and last name.');
      return;
    }
    setFormError(null);
    setIsSaving(true);
    try {
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName: `${firstName.trim()} ${lastName.trim()}`.trim(),
        email: email.trim() || user.email,
      };
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
          user.preferences?.pushNotificationsEnabled,
        emailNotificationsEnabled:
          rawPreferences?.emailNotificationsEnabled ??
          rawPreferences?.EmailNotificationsEnabled ??
          user.preferences?.emailNotificationsEnabled,
        themePreference:
          rawPreferences?.themePreference ??
          rawPreferences?.ThemePreference ??
          user.preferences?.themePreference,
      };
      const normalized: UserModel = {
        ...user,
        firstName: apiUser?.firstName ?? apiUser?.FirstName ?? payload.firstName,
        lastName: apiUser?.lastName ?? apiUser?.LastName ?? payload.lastName,
        fullName: apiUser?.fullName ?? apiUser?.FullName ?? payload.fullName,
        email: apiUser?.email ?? apiUser?.Email ?? payload.email ?? user.email,
        avatar: apiUser?.avatar ?? apiUser?.ProfilePhotoUrl ?? user.avatar,
        signupDate: apiUser?.signupDate ?? apiUser?.SignupDate ?? user.signupDate,
        lastLogin: apiUser?.lastLogin ?? apiUser?.LastLogin ?? user.lastLogin,
        phoneNumber: apiUser?.phoneNumber ?? apiUser?.PhoneNumber ?? user.phoneNumber,
        smsEnabled: apiUser?.smsEnabled ?? apiUser?.SmsEnabled ?? user.smsEnabled,
        preferences: normalizedPreferences,
      };
      setUser(normalized);
      setToast({ message: 'Profile updated', type: 'success' });
      setIsEditing(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to update profile. Please try again.';
      setFormError(message);
      setToast({ message, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: themeColors.background }]}>
        <Card isDark={isDark} style={styles.emptyCard}>
          <Text variant="h3" isDark={isDark} weight="bold">
            No profile available
          </Text>
          <Text variant="body" color="textSecondary" isDark={isDark} style={{ marginTop: spacing[2] }}>
            Sign in to view and edit your FamConomy profile.
          </Text>
        </Card>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {toast && (
        <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />
      )}

      <Card isDark={isDark} style={styles.profileCard} elevated>
        <View style={styles.avatarContainer}>
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: themeColors.primary,
              },
            ]}
          >
            {user.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
            ) : (
              <Text variant="h2" style={{ color: '#fff' }} weight="bold">
                {initials}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.avatarButton,
              {
                backgroundColor: themeColors.surfaceVariant,
                borderColor: themeColors.border,
              },
            ]}
            onPress={() => Alert.alert('Coming soon', 'Photo upload will be available soon.')}
          >
            <Camera size={18} color={themeColors.textSecondary} />
            <Text variant="caption" color="textSecondary" isDark={isDark} style={{ marginLeft: spacing[1] }}>
              Update photo
            </Text>
          </TouchableOpacity>
        </View>

        <Text variant="h2" isDark={isDark} weight="bold" style={{ marginTop: spacing[2] }}>
          {fullName}
        </Text>
        <Text variant="body" color="textSecondary" isDark={isDark} style={{ marginTop: spacing[1] }}>
          {user.email}
        </Text>

        <View style={styles.badgeRow}>
          {badges.map((badge) => (
            <View
              key={badge.label}
              style={[
                styles.badge,
                {
                  backgroundColor: themeColors.surfaceVariant,
                  borderColor: themeColors.border,
                },
              ]}
            >
              <View style={{ marginRight: spacing[1] }}>{badge.icon}</View>
              <View>
                <Text variant="caption" color="textSecondary" isDark={isDark}>
                  {badge.label}
                </Text>
                <Text variant="body" isDark={isDark}>
                  {badge.value}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Button
          title="Edit profile"
          onPress={() => setIsEditing(true)}
          style={{ marginTop: spacing[3] }}
          isDark={isDark}
        />
      </Card>

      <Card isDark={isDark} style={{ marginBottom: spacing[4] }}>
        <Text variant="h3" isDark={isDark} weight="bold" style={{ marginBottom: spacing[3] }}>
          Activity
        </Text>
        <View style={styles.activityRow}>
          <View style={styles.activityStat}>
            <Text variant="h2" isDark={isDark} weight="bold">
              0
            </Text>
            <Text variant="caption" color="textSecondary" isDark={isDark}>
              Badges earned
            </Text>
          </View>
          <View style={styles.activityStat}>
            <Text variant="h2" isDark={isDark} weight="bold">
              {formatDate(user.lastLogin)}
            </Text>
            <Text variant="caption" color="textSecondary" isDark={isDark}>
              Last login
            </Text>
          </View>
        </View>
      </Card>

      <Modal
        visible={isEditing}
        animationType="slide"
        transparent
        onRequestClose={() => setIsEditing(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: themeColors.surface,
              },
            ]}
          >
            <View style={{ alignItems: 'center', marginBottom: spacing[3] }}>
              <View
                style={[
                  styles.modalAvatar,
                  {
                    backgroundColor: themeColors.primary,
                  },
                ]}
              >
                <UserIcon size={28} color="#fff" />
              </View>
              <Text variant="h3" isDark={isDark} weight="bold" style={{ marginTop: spacing[2] }}>
                Edit Profile
              </Text>
              <Text variant="body" color="textSecondary" isDark={isDark}>
                Update your visible information.
              </Text>
            </View>

            <Input
              label="First name"
              value={firstName}
              onChangeText={setFirstName}
              isDark={isDark}
              containerStyle={{ marginBottom: spacing[3] }}
            />
            <Input
              label="Last name"
              value={lastName}
              onChangeText={setLastName}
              isDark={isDark}
              containerStyle={{ marginBottom: spacing[3] }}
            />
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              isDark={isDark}
            />

            {formError && (
              <Text
                style={{
                  color: themeColors.error,
                  marginTop: spacing[2],
                  fontSize: fontSize.sm,
                }}
              >
                {formError}
              </Text>
            )}

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setIsEditing(false)}
                isDark={isDark}
                disabled={isSaving}
              />
              <Button
                title={isSaving ? 'Saving…' : 'Save'}
                onPress={handleSaveProfile}
                isDark={isDark}
                disabled={isSaving}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing[4],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing[4],
  },
  emptyCard: {
    padding: spacing[4],
    alignItems: 'center',
  },
  profileCard: {
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  avatarContainer: {
    alignItems: 'center',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.full,
  },
  avatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderWidth: 1,
    borderRadius: borderRadius.full,
    marginTop: spacing[2],
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderWidth: 1,
    borderRadius: borderRadius.md,
    minWidth: 120,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  activityStat: {
    flex: 1,
    alignItems: 'flex-start',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: spacing[4],
  },
  modalContent: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
  },
  modalAvatar: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
    marginTop: spacing[3],
  },
});

export default ProfileScreen;
