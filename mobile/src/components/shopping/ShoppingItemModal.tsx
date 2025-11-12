import React, { useEffect, useState } from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Text } from '../ui/Text';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { spacing, lightTheme, darkTheme } from '../../theme';
import type { ShoppingItem } from '../../types';

interface ShoppingItemModalProps {
  visible: boolean;
  isDark?: boolean;
  initialItem?: ShoppingItem | null;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    quantity?: number | string;
    unit?: string;
    category?: string;
    notes?: string;
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
}

const CATEGORY_OPTIONS = ['groceries', 'household', 'personal', 'school', 'other'];

export const ShoppingItemModal: React.FC<ShoppingItemModalProps> = ({
  visible,
  isDark = false,
  initialItem = null,
  onClose,
  onSubmit,
  onDelete,
}) => {
  const theme = isDark ? darkTheme : lightTheme;
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState<string>('1');
  const [unit, setUnit] = useState('');
  const [category, setCategory] = useState<string>('groceries');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialItem) {
      setName(initialItem.name);
      setQuantity(String(initialItem.quantity ?? 1));
      setUnit(initialItem.unit ?? '');
      setCategory(initialItem.category ?? 'groceries');
      setNotes(initialItem.notes ?? '');
    } else {
      setName('');
      setQuantity('1');
      setUnit('');
      setCategory('groceries');
      setNotes('');
    }
    setSaving(false);
    setError(null);
  }, [initialItem, visible]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Item name is required');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        quantity: quantity.trim(),
        unit: unit.trim() || undefined,
        category,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save item');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setSaving(true);
    try {
      await onDelete();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={onClose}>
              <Text variant="body" color="primary" isDark={isDark} weight="semibold">
                Cancel
              </Text>
            </TouchableOpacity>
            <Text variant="h4" isDark={isDark} weight="bold">
              {initialItem ? 'Edit Item' : 'New Item'}
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
              label="Item name"
              value={name}
              onChangeText={setName}
              placeholder="Milk"
              isDark={isDark}
              containerStyle={styles.field}
              error={error ?? undefined}
            />
            <View style={styles.row}>
              <Input
                label="Quantity"
                value={quantity}
                onChangeText={setQuantity}
                placeholder="1"
                keyboardType="numeric"
                isDark={isDark}
                containerStyle={{ ...styles.field, ...styles.half }}
              />
              <Input
                label="Unit"
                value={unit}
                onChangeText={setUnit}
                placeholder="gal, lb, box…"
                isDark={isDark}
                containerStyle={{ ...styles.field, ...styles.half }}
              />
            </View>

            <View style={styles.field}>
              <Text variant="label" isDark={isDark} style={styles.label}>
                Category
              </Text>
              <View style={styles.categoryRow}>
                {CATEGORY_OPTIONS.map((option) => {
                  const active = option === category;
                  return (
                    <TouchableOpacity
                      key={option}
                      onPress={() => setCategory(option)}
                      style={[
                        styles.categoryPill,
                        {
                          backgroundColor: active ? theme.primary : theme.surfaceVariant,
                          borderColor: active ? theme.primary : theme.border,
                        },
                      ]}
                    >
                      <Text
                        variant="caption"
                        style={{ color: active ? '#fff' : theme.textSecondary }}
                      >
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <Input
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="Brand preference, store aisle..."
              isDark={isDark}
              containerStyle={styles.field}
              multiline
              numberOfLines={2}
            />

            {error && (
              <Text variant="body" color="error" isDark={isDark}>
                {error}
              </Text>
            )}
          </View>

          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            {initialItem && onDelete && (
              <Button
                title="Delete"
                variant="danger"
                onPress={handleDelete}
                isDark={isDark}
                style={styles.footerButton}
              />
            )}
            <Button
              title={saving ? 'Saving…' : initialItem ? 'Update Item' : 'Add Item'}
              onPress={handleSubmit}
              disabled={saving}
              loading={saving}
              isDark={isDark}
              style={styles.footerButton}
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
    maxHeight: '92%',
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
    padding: spacing[4],
    gap: spacing[3],
  },
  field: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  half: {
    flex: 1,
  },
  label: {
    marginBottom: spacing[2],
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  categoryPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  footer: {
    flexDirection: 'row',
    padding: spacing[4],
    gap: spacing[2],
    borderTopWidth: 1,
  },
  footerButton: {
    flex: 1,
  },
});

export default ShoppingItemModal;
