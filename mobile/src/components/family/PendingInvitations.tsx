import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '../ui/Text';
import { Card } from '../ui/Card';
import { spacing, lightTheme, darkTheme } from '../../theme';
import { getPendingInvitations, acceptInvitation, declineInvitation, type PendingInvitation } from '../../api/invitations';

interface Props {
  isDark?: boolean;
  onChanged?: () => Promise<void> | void; // called after accept/decline
}

export const PendingInvitations: React.FC<Props> = ({ isDark = false, onChanged }) => {
  const theme = isDark ? darkTheme : lightTheme;
  const [items, setItems] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPendingInvitations();
      setItems(data);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAccept = async (token: string) => {
    try {
      await acceptInvitation(token);
      await load();
      if (onChanged) await onChanged();
    } catch (e) {
      // Swallow for now; could show toast if present at screen level
    }
  };

  const handleDecline = async (token: string) => {
    try {
      await declineInvitation(token);
      await load();
      if (onChanged) await onChanged();
    } catch (e) {}
  };

  if (loading) {
    return (
      <Card isDark={isDark} style={styles.card}> 
        <Text variant="label" color="textSecondary" isDark={isDark}>Loading invitations…</Text>
      </Card>
    );
  }

  if (error) {
    return (
      <Card isDark={isDark} style={styles.card}> 
        <Text variant="label" color="error" isDark={isDark}>{error}</Text>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card isDark={isDark} style={styles.card}> 
        <Text variant="label" color="textSecondary" isDark={isDark}>No pending invitations</Text>
      </Card>
    );
  }

  return (
    <View style={{ gap: spacing[2] }}>
      {items.map((inv) => (
        <Card key={inv.InvitationID} isDark={isDark} style={styles.card}>
          <Text variant="body" isDark={isDark}>
            {inv.Email} invited to {inv.Family?.FamilyName || 'a family'}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[2] }}>
            <TouchableOpacity onPress={() => handleAccept(inv.Token)} style={[styles.btn, { backgroundColor: theme.primary }]}>
              <Text style={{ color: '#fff', fontWeight: '600' }}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDecline(inv.Token)} style={[styles.btn, { backgroundColor: theme.surfaceVariant }]}>
              <Text isDark={isDark} style={{ fontWeight: '600' }}>Decline</Text>
            </TouchableOpacity>
          </View>
        </Card>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing[4],
    padding: spacing[3],
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
});

export default PendingInvitations;
