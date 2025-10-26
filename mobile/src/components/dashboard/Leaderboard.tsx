import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text } from '../ui/Text';
import { Card } from '../ui/Card';
import { spacing, lightTheme, darkTheme, fontSize, fontWeight, shadows } from '../../theme';
import type { LeaderboardEntry } from '../../api/dashboard';
import type { Theme } from '../../theme';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  isDark?: boolean;
  maxItems?: number;
}

const getMedalEmoji = (rank: number): string => {
  switch (rank) {
    case 1:
      return '🥇';
    case 2:
      return '🥈';
    case 3:
      return '🥉';
    default:
      return `#${rank}`;
  }
};

const getRankColor = (theme: Theme, rank: number): string => {
  if (rank === 1) return theme.warning; // Gold
  if (rank === 2) return '#c0c0c0'; // Silver
  if (rank === 3) return '#cd7f32'; // Bronze
  return theme.textSecondary;
};

const LeaderboardItem: React.FC<{
  entry: LeaderboardEntry;
  isDark?: boolean;
}> = ({ entry, isDark = false }) => {
  const theme = isDark ? darkTheme : lightTheme;
  const medal = getMedalEmoji(entry.rank);
  const rankColor = getRankColor(theme, entry.rank);

  return (
    <View
      style={[
        styles.item,
        {
          backgroundColor: theme.surfaceVariant,
          borderBottomColor: theme.border,
        },
      ]}
    >
      <Text
        style={{
          fontSize: 24,
          marginRight: spacing[3],
          color: rankColor,
          minWidth: 40,
        }}
      >
        {medal}
      </Text>
      <View style={styles.nameContainer}>
        <Text variant="h4" isDark={isDark} weight="semibold">
          {entry.userName}
        </Text>
      </View>
      <Text
        variant="h3"
        isDark={isDark}
        weight="bold"
        style={{ color: theme.primary }}
      >
        {entry.points}
      </Text>
      <Text variant="caption" color="textSecondary" isDark={isDark}>
        pts
      </Text>
    </View>
  );
};

export const Leaderboard: React.FC<LeaderboardProps> = ({
  entries,
  isDark = false,
  maxItems = 10,
}) => {
  const theme = isDark ? darkTheme : lightTheme;
  const displayEntries = entries.slice(0, maxItems);

  if (displayEntries.length === 0) {
    return (
      <Card isDark={isDark} style={styles.emptyContainer}>
        <Text variant="body" color="textSecondary" isDark={isDark}>
          No leaderboard data available
        </Text>
      </Card>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
    >
      {displayEntries.map((entry) => (
        <LeaderboardItem key={entry.userId} entry={entry} isDark={isDark} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.card,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderBottomWidth: 1,
  },
  nameContainer: {
    flex: 1,
    marginRight: spacing[2],
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing[6],
  },
});
