import React, { useState } from 'react';
import { Modal, View, TextInput, TouchableOpacity, ActivityIndicator, Text } from 'react-native';
import { spacing, lightTheme, darkTheme, borderRadius } from '../../theme';
import { getInvitationDetails, acceptInvitation } from '../../api/invitations';

interface Props {
  visible: boolean;
  onClose: () => void;
  isDark?: boolean;
  onJoined?: () => void; // call after successful accept
  initialToken?: string;
}

export const JoinByCodeModal: React.FC<Props> = ({ visible, onClose, isDark = false, onJoined, initialToken }) => {
  const theme = isDark ? darkTheme : lightTheme;
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<{ familyName: string; inviterName: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (visible && initialToken && !token) {
      setToken(initialToken);
    }
  }, [visible, initialToken]);

  const lookup = async () => {
    setError(null);
    setDetails(null);
    if (!token.trim()) return;
    try {
      setLoading(true);
      const d = await getInvitationDetails(token.trim());
      setDetails({ familyName: d.familyName, inviterName: d.inviterName });
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message || 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  };

  const accept = async () => {
    setError(null);
    try {
      setLoading(true);
      await acceptInvitation(token.trim());
      onJoined?.();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message || 'Failed to join');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', padding: spacing[4], justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: theme.surface, padding: spacing[4], borderRadius: borderRadius.lg }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text }}>Join with Code</Text>
          <Text style={{ marginTop: spacing[2], color: theme.textSecondary }}>Enter your invite code to join the family.</Text>
          <TextInput
            value={token}
            onChangeText={setToken}
            placeholder="Invitation code"
            placeholderTextColor={theme.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              marginTop: spacing[3],
              borderWidth: 1,
              borderColor: theme.border,
              padding: spacing[3],
              borderRadius: borderRadius.base,
              color: theme.text,
            }}
          />
          {error && <Text style={{ color: theme.error, marginTop: spacing[2] }}>{error}</Text>}
          {details && (
            <Text style={{ marginTop: spacing[2], color: theme.textSecondary }}>
              Invitation to {details.familyName} from {details.inviterName}
            </Text>
          )}
          <View style={{ flexDirection: 'row', gap: spacing[3], marginTop: spacing[4] }}>
            <TouchableOpacity onPress={onClose} style={{ paddingVertical: 10, paddingHorizontal: 14 }}>
              <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={lookup} style={{ borderWidth: 1, borderColor: theme.primary, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 }}>
              <Text style={{ color: theme.primary, fontWeight: '600' }}>Check</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={accept} disabled={!details || loading} style={{ backgroundColor: theme.primary, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, opacity: !details || loading ? 0.6 : 1 }}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: 'white', fontWeight: '600' }}>Join</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
