import React, { useState } from 'react';
import { Modal, View, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import apiClient from '../../api/apiClient';
import { Text } from '../ui/Text';
import { spacing, lightTheme, darkTheme } from '../../theme';

interface CreateFamilyModalProps {
  visible: boolean;
  onClose: () => void;
  isDark?: boolean;
  onCreated?: () => Promise<void> | void;
}

export const CreateFamilyModal: React.FC<CreateFamilyModalProps> = ({ visible, onClose, isDark = false, onCreated }) => {
  const theme = isDark ? darkTheme : lightTheme;
  const [name, setName] = useState('');
  const [rewardMode, setRewardMode] = useState<'points' | 'allowance'>('points');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName('');
    setRewardMode('points');
    setError(null);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Please enter a family name.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await apiClient.post('/family', { familyName: name.trim(), rewardMode });
      if (onCreated) await onCreated();
      reset();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to create family');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
  <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
          <Text variant="h3" isDark={isDark} weight="bold">Create Family</Text>
          <Text variant="body" color="textSecondary" isDark={isDark} style={{ marginTop: spacing[1] }}>
            Choose a name for your family and reward mode.
          </Text>

          <Text variant="label" isDark={isDark} style={{ marginTop: spacing[3], marginBottom: spacing[1] }}>Family name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g., Biggers Family"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: isDark ? '#111' : '#fff' }]}
          />

          <Text variant="label" isDark={isDark} style={{ marginTop: spacing[3], marginBottom: spacing[1] }}>Reward mode</Text>
          <View style={{ flexDirection: 'row', gap: spacing[2] }}>
            {(['points', 'allowance'] as const).map((mode) => (
              <TouchableOpacity
                key={mode}
                onPress={() => setRewardMode(mode)}
                style={[styles.pill, { borderColor: theme.primary, backgroundColor: rewardMode === mode ? theme.primaryLight : 'transparent' }]}
              >
                <Text isDark={isDark} color={rewardMode === mode ? 'primary' : 'textSecondary'} style={{ fontWeight: '600' }}>
                  {mode === 'points' ? 'Points' : 'Allowance'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {error && (
            <Text variant="label" isDark={isDark} color="error" style={{ marginTop: spacing[2] }}>{error}</Text>
          )}

          <View style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[4] }}>
            <TouchableOpacity onPress={onClose} style={[styles.button, { backgroundColor: theme.surfaceVariant }]} disabled={loading}>
              <Text style={{ fontWeight: '600' }} isDark={isDark}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCreate} style={[styles.button, { backgroundColor: theme.primary }]} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '600' }}>Create</Text>}
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

export default CreateFamilyModal;
