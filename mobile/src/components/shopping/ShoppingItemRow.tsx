import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { spacing, lightTheme, darkTheme, borderRadius } from '../../theme';
import type { ShoppingItem } from '../../types';

interface ShoppingItemRowProps {
  item: ShoppingItem;
  isDark?: boolean;
  onToggle?: (item: ShoppingItem) => void;
  onEdit?: (item: ShoppingItem) => void;
  onDelete?: (item: ShoppingItem) => void;
}

const categoryLabel = (category?: string) => {
  if (!category) return 'Uncategorized';
  return category.charAt(0).toUpperCase() + category.slice(1);
};

export const ShoppingItemRow: React.FC<ShoppingItemRowProps> = ({
  item,
  isDark = false,
  onToggle,
  onEdit,
  onDelete,
}) => {
  const theme = isDark ? darkTheme : lightTheme;
  const quantityLabel = item.unit ? `${item.quantity} ${item.unit}` : String(item.quantity ?? 1);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? theme.surfaceVariant : '#fff',
          borderColor: theme.border,
        },
      ]}
    >
      <TouchableOpacity
        onPress={() => onToggle?.(item)}
        style={[
          styles.checkbox,
          {
            borderColor: item.completed ? theme.success : theme.border,
            backgroundColor: item.completed ? theme.success : 'transparent',
          },
        ]}
      >
        {item.completed && <Text style={styles.checkboxTick}>✓</Text>}
      </TouchableOpacity>
      <View style={styles.details}>
        <Text
          variant="body"
          isDark={isDark}
          weight="medium"
          style={item.completed ? styles.completedText : undefined}
        >
          {item.name}
        </Text>
        <View style={styles.metaRow}>
          <Text variant="caption" color="textSecondary" isDark={isDark}>
            {quantityLabel}
          </Text>
          <View style={[styles.categoryChip, { backgroundColor: theme.surface }]}>
            <Text variant="caption" color="textSecondary" isDark={isDark}>
              {categoryLabel(item.category)}
            </Text>
          </View>
        </View>
        {item.notes && (
          <Text variant="caption" color="textSecondary" isDark={isDark}>
            {item.notes}
          </Text>
        )}
      </View>
      <View style={styles.actions}>
        <Button
          title="Edit"
          size="small"
          variant="outline"
          isDark={isDark}
          onPress={() => onEdit?.(item)}
        />
        <Button
          title="Delete"
          size="small"
          variant="danger"
          isDark={isDark}
          onPress={() => onDelete?.(item)}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    marginBottom: spacing[2],
    gap: spacing[3],
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[1],
  },
  checkboxTick: {
    color: '#fff',
    fontWeight: '700',
  },
  details: {
    flex: 1,
    gap: spacing[1],
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing[2],
    alignItems: 'center',
  },
  categoryChip: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: 999,
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  actions: {
    gap: spacing[1],
  },
});

export default ShoppingItemRow;
