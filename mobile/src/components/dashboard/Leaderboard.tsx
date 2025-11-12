import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text } from '../ui/Text';
import { Card } from '../ui/Card';
import {
  spacing,
  lightTheme,
  darkTheme,
  fontSize,
  fontWeight,
  shadows,
  borderRadius,
} from '../../theme';
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
  const rankColor = getRankColor(theme, entry.rank);
  const initials = entry.userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
  const hasAvatar = Boolean(entry.avatar);
  const accentBackground =
    entry.rank === 1 ? theme.primaryLight : entry.rank === 2 ? theme.secondaryLight : theme.surfaceVariant;
  const accentColor =
    entry.rank === 1 ? theme.primary : entry.rank === 2 ? theme.secondary : theme.textSecondary;

  return (
    <View
      style={[
        styles.item,
        {
          borderBottomColor: theme.border,
          backgroundColor: isDark ? theme.surfaceVariant : theme.surface,
        },
      ]}
    >
      <View
        style={[
          styles.rankBadge,
          {
            backgroundColor: accentBackground,
          },
        ]}
      >
        <Text
          variant="body"
          weight="bold"
          style={{
            color: accentColor,
          }}
        >
          {entry.rank <= 3 ? getMedalEmoji(entry.rank) : `#${entry.rank}`}
        </Text>
      </View>
      {hasAvatar ? (
        <Image source={{ uri: entry.avatar }} style={styles.avatar} />
      ) : (
        <View
          style={[
            styles.avatarFallback,
            {
              backgroundColor: theme.surfaceVariant,
            },
          ]}
        >
          <Text variant="body" weight="semibold" style={{ color: theme.textSecondary }}>
            {initials || '?'}
          </Text>
        </View>
      )}
      <View style={styles.nameContainer}>
        <Text variant="h4" isDark={isDark} weight="semibold" numberOfLines={1}>
          {entry.userName}
        </Text>
        <Text variant="caption" color="textSecondary" isDark={isDark}>
          Total points
        </Text>
      </View>
      <View style={styles.scoreContainer}>
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
    backgroundColor: 'transparent',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderBottomWidth: 1,
    gap: spacing[3],
  },
  rankBadge: {
    minWidth: 48,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameContainer: {
    flex: 1,
    marginRight: spacing[2],
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing[6],
  },
});
