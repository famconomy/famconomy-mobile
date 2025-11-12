import React, { useState } from 'react';
import { Modal, View, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from '../ui/Text';
import { spacing, lightTheme, darkTheme } from '../../theme';
import { createInvitation } from '../../api/invitations';

interface InviteMemberModalProps {
  visible: boolean;
  onClose: () => void;
  familyId: string | number;
  isDark?: boolean;
  onInvited?: () => Promise<void> | void;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({ visible, onClose, familyId, isDark = false, onInvited }) => {
  const theme = isDark ? darkTheme : lightTheme;
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'parent' | 'guardian' | 'child'>('child');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const reset = () => {
    setEmail('');
    setRole('child');
    setError(null);
    setSuccess(null);
    setLoading(false);
  };

  const handleInvite = async () => {
    if (!email.trim()) {
      setError('Please enter an email.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      await createInvitation({ familyId, email: email.trim(), invitedBy: 'mobile', relationshipId: role === 'parent' ? 1 : role === 'guardian' ? 2 : 3 });
      setSuccess('Invitation sent');
      if (onInvited) await onInvited();
      // Keep modal open so they can send more; comment out to auto-close
      // onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
          <Text variant="h3" isDark={isDark} weight="bold">Invite member</Text>
          <Text variant="body" color="textSecondary" isDark={isDark} style={{ marginTop: spacing[1] }}>
            Send an email invitation to join your family.
          </Text>

          <Text variant="label" isDark={isDark} style={{ marginTop: spacing[3], marginBottom: spacing[1] }}>Email</Text>
          <TextInput
            value={email}
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="name@example.com"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: isDark ? '#111' : '#fff' }]}
          />

          <Text variant="label" isDark={isDark} style={{ marginTop: spacing[3], marginBottom: spacing[1] }}>Role</Text>
          <View style={{ flexDirection: 'row', gap: spacing[2] }}>
            {(['child', 'parent', 'guardian'] as const).map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setRole(r)}
                style={[styles.pill, { borderColor: theme.primary, backgroundColor: role === r ? theme.primaryLight : 'transparent' }]}
              >
                <Text isDark={isDark} color={role === r ? 'primary' : 'textSecondary'} style={{ fontWeight: '600' }}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {error && <Text variant="label" color="error" isDark={isDark} style={{ marginTop: spacing[2] }}>{error}</Text>}
          {success && <Text variant="label" color="success" isDark={isDark} style={{ marginTop: spacing[2] }}>{success}</Text>}

          <View style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[4] }}>
            <TouchableOpacity onPress={() => { reset(); onClose(); }} style={[styles.button, { backgroundColor: theme.surfaceVariant }]} disabled={loading}>
              <Text isDark={isDark} style={{ fontWeight: '600' }}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleInvite} style={[styles.button, { backgroundColor: theme.primary }]} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '600' }}>Send Invite</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: spacing[4],
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: spacing[3],
    paddingVertical: 10,
  },
  pill: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
});

export default InviteMemberModal;
