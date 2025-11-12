import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../ui/Text';
import { Card } from '../ui/Card';
import { spacing, lightTheme, darkTheme, borderRadius } from '../../theme';
import type { CalendarEvent } from '../../types';

interface EventCardProps {
  event: CalendarEvent;
  isDark?: boolean;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const formatTimeRange = (event: CalendarEvent): string => {
  const start = new Date(event.startTime);
  if (Number.isNaN(start.getTime())) {
    return event.startTime;
  }
  const end = event.endTime ? new Date(event.endTime) : null;
  const startStr = start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (!end || Number.isNaN(end.getTime())) {
    return startStr;
  }
  const sameDay = start.toDateString() === end.toDateString();
  const endStr = end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return sameDay ? `${startStr} – ${endStr}` : `${startStr} – ${end.toLocaleDateString()} ${endStr}`;
};

const formatDay = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

const formatRepeat = (event: CalendarEvent): string | null => {
  switch (event.repeatType) {
    case 'daily':
      return 'Repeats daily';
    case 'weekly':
      return 'Repeats weekly';
    case 'monthly':
      return 'Repeats monthly';
    default:
      return null;
  }
};

export const EventCard: React.FC<EventCardProps> = ({
  event,
  isDark = false,
  onPress,
  onEdit,
  onDelete,
}) => {
  const theme = isDark ? darkTheme : lightTheme;
  const color = event.color ?? theme.primary;
  const repeatLabel = formatRepeat(event);
  const timeRange = formatTimeRange(event);
  const assignedLabel = event.assignedToName ?? event.assignedToUserId ?? null;

  return (
    <Card
      isDark={isDark}
      style={styles.card}
      onPress={onPress}
    >
      <View style={styles.row}>
        <View style={[styles.indicator, { backgroundColor: color }]} />
        <View style={styles.content}>
          <Text variant="caption" color="textSecondary" isDark={isDark}>
            {formatDay(event.startTime)}
          </Text>
          <Text variant="h4" isDark={isDark} weight="semibold" style={styles.title}>
            {event.title}
          </Text>
          <Text variant="caption" color="textSecondary" isDark={isDark}>
            {timeRange}
          </Text>
          {event.location && (
            <Text variant="caption" color="textSecondary" isDark={isDark} style={styles.meta}>
              📍 {event.location}
            </Text>
          )}
          {repeatLabel && (
            <Text variant="caption" color="textSecondary" isDark={isDark} style={styles.meta}>
              🔁 {repeatLabel}
            </Text>
          )}
          {event.reminder && (
            <Text variant="caption" color="textSecondary" isDark={isDark} style={styles.meta}>
              ⏰ Reminder enabled
            </Text>
          )}
          {assignedLabel && (
            <Text variant="caption" color="textSecondary" isDark={isDark} style={styles.meta}>
              👤 {assignedLabel}
            </Text>
          )}
        </View>
      </View>
      {(onEdit || onDelete) && (
        <View style={styles.actions}>
          {onEdit && (
            <TouchableOpacity onPress={onEdit} style={[styles.actionButton, { borderColor: theme.primary }]}>
              <Text style={{ color: theme.primary, fontWeight: '600' }}>Edit</Text>
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity onPress={onDelete} style={[styles.actionButton, { borderColor: theme.error }]}>
              <Text style={{ color: theme.error, fontWeight: '600' }}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: spacing[3],
    marginBottom: spacing[3],
  },
  row: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  indicator: {
    width: 6,
    borderRadius: borderRadius.full,
  },
  content: {
    flex: 1,
  },
  title: {
    marginVertical: spacing[1],
  },
  meta: {
    marginTop: spacing[1],
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  actionButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
});

export default EventCard;
