/**
 * ScreenTimeSummary.tsx
 * Component displaying weekly screen time summary for all children
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';

interface ChildSummary {
  id: string;
  name: string;
  screenTimeToday: number;
  screenTimeLimit: number;
}

interface ScreenTimeSummaryProps {
  children: ChildSummary[];
}

export const ScreenTimeSummary: React.FC<ScreenTimeSummaryProps> = ({ children }) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date().getDay();

  // Mock weekly data
  const weeklyData = days.map((_, index) => ({
    day: days[index],
    total: Math.floor(Math.random() * 300) + 50,
    isToday: index === today,
  }));

  const totalThisWeek = weeklyData.reduce((sum, day) => sum + day.total, 0);
  const average = Math.round(totalThisWeek / days.length);
  const maxValue = Math.max(...weeklyData.map((d) => d.total));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Weekly Screen Time</Text>
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={styles.statValue}>{totalThisWeek}m</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Average</Text>
            <Text style={styles.statValue}>{average}m</Text>
          </View>
        </View>
      </View>

      <View style={styles.chart}>
        {weeklyData.map((day) => {
          const heightPercentage = (day.total / maxValue) * 100;
          return (
            <View key={day.day} style={styles.barContainer}>
              <View
                style={[
                  styles.bar,
                  {
                    height: `${heightPercentage}%`,
                    backgroundColor: day.isToday ? '#3b82f6' : '#bfdbfe',
                  },
                ]}
              />
              <Text style={styles.barLabel}>{day.day}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.children}>
        <Text style={styles.childrenTitle}>By Child</Text>
        {children.length === 0 ? (
          <Text style={styles.emptyText}>No children data available</Text>
        ) : (
          children.map((child) => (
            <View key={child.id} style={styles.childRow}>
              <Text style={styles.childName}>{child.name}</Text>
              <View style={styles.childStats}>
                <Text style={styles.childTime}>{child.screenTimeToday}m</Text>
                <View
                  style={[
                    styles.childIndicator,
                    {
                      backgroundColor:
                        (child.screenTimeToday / child.screenTimeLimit) > 0.8
                          ? '#ef4444'
                          : '#10b981',
                    },
                  ]}
                />
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  chart: {
    flexDirection: 'row',
    height: 120,
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  bar: {
    width: '100%',
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  children: {
    gap: 8,
  },
  childrenTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  childRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  childName: {
    fontSize: 14,
    color: '#1f2937',
    flex: 1,
  },
  childStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  childTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    minWidth: 40,
    textAlign: 'right',
  },
  childIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  emptyText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 16,
  },
});
