import React, { useEffect, useState } from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Text } from '../ui/Text';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { spacing, lightTheme, darkTheme } from '../../theme';

interface ShoppingListModalProps {
  visible: boolean;
  isDark?: boolean;
  initialName?: string;
  initialColor?: string;
  onClose: () => void;
  onSubmit: (data: { name: string; colorHex?: string }) => Promise<void>;
}

const COLOR_SWATCHES = ['#2563eb', '#0ea5e9', '#22c55e', '#f97316', '#ef4444', '#9333ea'];

export const ShoppingListModal: React.FC<ShoppingListModalProps> = ({
  visible,
  isDark = false,
  initialName = '',
  initialColor,
  onClose,
  onSubmit,
}) => {
  const theme = isDark ? darkTheme : lightTheme;
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor ?? COLOR_SWATCHES[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(initialName);
    setColor(initialColor ?? COLOR_SWATCHES[0]);
    setError(null);
    setSaving(false);
  }, [initialName, initialColor, visible]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('List name is required');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ name: name.trim(), colorHex: color });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save list');
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.overlay]}
      >
        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={onClose}>
              <Text variant="body" color="primary" isDark={isDark} weight="semibold">
                Cancel
              </Text>
            </TouchableOpacity>
            <Text variant="h4" isDark={isDark} weight="bold">
              {initialName ? 'Edit List' : 'New Shopping List'}
            </Text>
            <TouchableOpacity onPress={handleSubmit} disabled={saving}>
              <Text
                variant="body"
                color={saving ? 'textTertiary' : 'primary'}
                isDark={isDark}
                weight="semibold"
              >
                {saving ? 'Saving…' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Input
              label="List Name"
              value={name}
              placeholder="Weekly groceries"
              onChangeText={setName}
              isDark={isDark}
              containerStyle={styles.field}
              error={error ?? undefined}
            />

            <View style={styles.field}>
              <Text variant="label" isDark={isDark} style={styles.label}>
                Accent color
              </Text>
              <View style={styles.swatchRow}>
                {COLOR_SWATCHES.map((hex) => {
                  const active = hex === color;
                  return (
                    <TouchableOpacity
                      key={hex}
                      onPress={() => setColor(hex)}
                      style={[
                        styles.swatch,
                        {
                          backgroundColor: hex,
                          borderColor: active ? '#fff' : 'transparent',
                        },
                      ]}
                    />
                  );
                })}
              </View>
            </View>

            {error && (
              <Text variant="caption" color="error" isDark={isDark}>
                {error}
              </Text>
            )}
          </View>

          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <Button
              title={saving ? 'Saving…' : 'Save List'}
              onPress={handleSubmit}
              disabled={saving}
              loading={saving}
              isDark={isDark}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    maxHeight: '90%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  content: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    gap: spacing[4],
  },
  field: {
    marginBottom: spacing[2],
  },
  label: {
    marginBottom: spacing[2],
  },
  swatchRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
  },
  footer: {
    padding: spacing[4],
    borderTopWidth: 1,
  },
});

export default ShoppingListModal;
