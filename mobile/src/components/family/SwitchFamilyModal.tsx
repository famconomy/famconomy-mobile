import React from 'react';
import { Modal, View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '../ui/Text';
import { Card } from '../ui/Card';
import { spacing, lightTheme, darkTheme } from '../../theme';
import type { Family } from '../../hooks/useFamily';

interface Props {
  visible: boolean;
  onClose: () => void;
  families: Family[];
  activeId: string | null;
  isDark?: boolean;
  onSelect: (id: string) => void;
}

export const SwitchFamilyModal: React.FC<Props> = ({ visible, onClose, families, activeId, isDark = false, onSelect }) => {
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
          <Text variant="h3" isDark={isDark} weight="bold">Switch family</Text>
          <Text variant="body" color="textSecondary" isDark={isDark} style={{ marginTop: spacing[1], marginBottom: spacing[2] }}>
            Choose an active family for your session.
          </Text>

          {families.map((f) => (
            <Card key={f.id} isDark={isDark} style={{ marginBottom: spacing[2], padding: spacing[2], borderWidth: f.id === activeId ? 2 : 1, borderColor: f.id === activeId ? theme.primary : theme.border }}>
              <TouchableOpacity onPress={() => { onSelect(f.id); onClose(); }}>
                <Text variant="h4" isDark={isDark}>
                  {f.name}
                </Text>
                <Text variant="caption" color="textSecondary" isDark={isDark}>
                  {f.members.length} member{f.members.length === 1 ? '' : 's'}
                </Text>
              </TouchableOpacity>
            </Card>
          ))}

          <TouchableOpacity onPress={onClose} style={[styles.button, { backgroundColor: theme.surfaceVariant }]}>
            <Text isDark={isDark} style={{ fontWeight: '600' }}>Close</Text>
          </TouchableOpacity>
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
  button: {
    marginTop: spacing[3],
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: spacing[3],
    borderRadius: 10,
  },
});

export default SwitchFamilyModal;
