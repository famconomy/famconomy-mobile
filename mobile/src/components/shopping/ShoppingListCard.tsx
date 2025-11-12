import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../ui/Text';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { spacing, lightTheme, darkTheme } from '../../theme';
import type { ShoppingList } from '../../types';

interface ShoppingListCardProps {
  list: ShoppingList;
  isDark?: boolean;
  selected?: boolean;
  onSelect?: (list: ShoppingList) => void;
  onEdit?: (list: ShoppingList) => void;
  onArchive?: (list: ShoppingList) => void;
  onDelete?: (list: ShoppingList) => void;
}

export const ShoppingListCard: React.FC<ShoppingListCardProps> = ({
  list,
  isDark = false,
  selected = false,
  onSelect,
  onEdit,
  onArchive,
  onDelete,
}) => {
  const theme = isDark ? darkTheme : lightTheme;
  const accent = list.colorHex ?? theme.primary;
  const totalItems = list.items.length;
  const completedItems = list.items.filter((item) => item.completed).length;
  const progressLabel =
    totalItems > 0 ? `${completedItems}/${totalItems} completed` : 'No items yet';

  return (
    <TouchableOpacity onPress={() => onSelect?.(list)} activeOpacity={0.85}>
      <Card
        isDark={isDark}
        style={[
          styles.card,
          {
            borderColor: selected ? accent : theme.border,
            borderWidth: selected ? 2 : 1,
          },
        ]}
      >
        <View style={styles.header}>
          <Text variant="h4" isDark={isDark} weight="semibold" numberOfLines={1}>
            {list.name}
          </Text>
          {selected && (
            <View style={[styles.activePill, { backgroundColor: accent }]}>
              <Text style={styles.activeText}>Active</Text>
            </View>
          )}
        </View>
        <Text variant="caption" color="textSecondary" isDark={isDark}>
          {progressLabel}
        </Text>

        <View style={styles.footer}>
          <Button
            title="Edit"
            size="small"
            variant="outline"
            isDark={isDark}
            onPress={() => onEdit?.(list)}
          />
          <Button
            title="Archive"
            size="small"
            variant="outline"
            isDark={isDark}
            onPress={() => onArchive?.(list)}
          />
          <Button
            title="Delete"
            size="small"
            variant="danger"
            isDark={isDark}
            onPress={() => onDelete?.(list)}
          />
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: spacing[4],
    marginRight: spacing[3],
    width: 220,
    gap: spacing[2],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing[2],
  },
  activePill: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: 999,
  },
  activeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing[3],
    gap: spacing[2],
  },
});

export default ShoppingListCard;
