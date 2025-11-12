import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  SectionList,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useAppStore } from '../../store/appStore';
import { useFamily } from '../../hooks/useFamily';
import { useAuth } from '../../hooks/useAuth';
import { useCalendar } from '../../hooks/useCalendar';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Alert } from '../../components/ui/Alert';
import { Toast } from '../../components/ui/Toast';
import { EventCard } from '../../components/calendar/EventCard';
import { EventModal } from '../../components/calendar/EventModal';
import { spacing, lightTheme, darkTheme } from '../../theme';
import type { CalendarEvent } from '../../types';
import type { CreateCalendarEventRequest, UpdateCalendarEventRequest } from '../../api/calendar';
import {
  useCalendarFiltersStore,
  type CalendarTimeframe,
} from '../../store/calendarFiltersStore';

const TIMEFRAME_OPTIONS: Array<{ id: CalendarTimeframe; label: string }> = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'all', label: 'All' },
  { id: 'past', label: 'Past' },
];

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CalendarScreen: React.FC = () => {
  const { theme } = useAppStore();
  const { family } = useFamily();
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | undefined>();
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);
  const timeframe = useCalendarFiltersStore((state) => state.timeframe);
  const setTimeframe = useCalendarFiltersStore((state) => state.setTimeframe);
  const memberId = useCalendarFiltersStore((state) => state.memberId);
  const setMemberId = useCalendarFiltersStore((state) => state.setMemberId);
  const showPrivateOnly = useCalendarFiltersStore((state) => state.showPrivateOnly);
  const togglePrivateOnly = useCalendarFiltersStore((state) => state.togglePrivateOnly);
  const showRemindersOnly = useCalendarFiltersStore((state) => state.showRemindersOnly);
  const toggleRemindersOnly = useCalendarFiltersStore((state) => state.toggleRemindersOnly);
  const isDark = theme === 'dark';
  const themeColors = isDark ? darkTheme : lightTheme;

  const familyId = family?.id;
  const members = family?.members ?? [];
  const memberNameMap = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((member) => {
      const fullName =
        (member.firstName || member.lastName)
          ? `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim()
          : member.email || 'Member';
      map.set(member.id, fullName);
    });
    return map;
  }, [members]);

  const {
    events,
    filteredEvents,
    groupedEvents,
    nextEvent,
    isLoading,
    isRefreshing,
    error,
    refetch,
    createEvent,
    updateEvent,
    deleteEvent,
  } = useCalendar({
    familyId,
    timeframe,
    memberId,
    showPrivateOnly,
    showRemindersOnly,
  });

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'info') => {
      setToast({ message, type });
    },
    []
  );

  const handleCreateOrUpdate = useCallback(
    async (data: CreateCalendarEventRequest | UpdateCalendarEventRequest) => {
      if (!familyId || !user?.id) {
        throw new Error('Family and user must be selected');
      }
      if (selectedEvent) {
        await updateEvent(selectedEvent.eventId, {
          ...data,
          familyId,
          createdByUserId: selectedEvent.createdByUserId ?? user.id,
        });
        showToast('Event updated', 'success');
      } else {
        await createEvent({
          ...data,
          title: data.title ?? '',
          startTime: data.startTime ?? '',
          familyId,
          createdByUserId: user.id,
        });
        showToast('Event created', 'success');
      }
    },
    [createEvent, familyId, selectedEvent, showToast, updateEvent, user?.id]
  );

  const handleDelete = useCallback(
    async (eventId: number) => {
      await deleteEvent(eventId);
      showToast('Event deleted', 'success');
    },
    [deleteEvent, showToast]
  );

  const openCreateModal = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedEvent(undefined);
    setModalVisible(true);
  }, []);

  const openEditModal = useCallback((event: CalendarEvent) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedEvent(event);
    setModalVisible(true);
  }, []);

  const calendarSummary = useMemo(() => {
    if (!nextEvent) {
      return {
        title: 'No upcoming events',
        subtitle: 'You’re all clear—schedule something new!',
      };
    }
    const start = new Date(nextEvent.startTime);
    const when = start.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    return {
      title: nextEvent.title,
      subtitle: `Next up on ${when}`,
      color: nextEvent.color ?? themeColors.primary,
    };
  }, [nextEvent, themeColors.primary]);

  const enrichedGroupedEvents = useMemo(
    () =>
      groupedEvents.map((group) => ({
        ...group,
        data: group.events.map((evt) => {
          if (evt.assignedToName || !evt.assignedToUserId) return evt;
          const resolvedName = memberNameMap.get(evt.assignedToUserId);
          return resolvedName ? { ...evt, assignedToName: resolvedName } : evt;
        }),
      })),
    [groupedEvents, memberNameMap]
  );

  const totalFiltered = filteredEvents.length;

  if (isLoading && !events?.length) {
    return <LoadingSpinner isDark={isDark} message="Loading calendar…" />;
  }

  return (
    <View style={[styles.screen, { backgroundColor: themeColors.background }]}>
      {toast && (
        <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />
      )}

      <SectionList
        sections={enrichedGroupedEvents}
        keyExtractor={(item) => item.eventId.toString()}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text variant="h2" isDark={isDark} weight="bold">
                Calendar
              </Text>
              <Button
                title="+ Add"
                size="small"
                onPress={openCreateModal}
                isDark={isDark}
              />
            </View>

            {error && (
              <Alert
                type="warning"
                title="Unable to load calendar"
                message={error.message}
                isDark={isDark}
                style={styles.errorAlert}
              />
            )}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.timeframeRow}
            >
              {TIMEFRAME_OPTIONS.map((option) => {
                const active = timeframe === option.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    onPress={() => {
                      if (timeframe === option.id) return;
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setTimeframe(option.id);
                    }}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: active ? themeColors.primary : themeColors.surfaceVariant,
                        borderColor: active ? themeColors.primary : themeColors.border,
                      },
                    ]}
                  >
                    <Text
                      variant="caption"
                      style={{ color: active ? '#fff' : themeColors.textSecondary }}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {members.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.memberRow}
              >
                <TouchableOpacity
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setMemberId(undefined);
                  }}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: !memberId ? themeColors.secondary : themeColors.surfaceVariant,
                      borderColor: !memberId ? themeColors.secondary : themeColors.border,
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    style={{ color: !memberId ? '#fff' : themeColors.textSecondary }}
                  >
                    Everyone
                  </Text>
                </TouchableOpacity>
                {members.map((member) => {
                  const id = member.id;
                  const active = memberId === id;
                  const label =
                    (member.firstName || member.lastName)
                      ? `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim()
                      : member.email || 'Member';
                  return (
                    <TouchableOpacity
                      key={id}
                      onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setMemberId(active ? undefined : id);
                      }}
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: active ? themeColors.secondary : themeColors.surfaceVariant,
                          borderColor: active ? themeColors.secondary : themeColors.border,
                        },
                      ]}
                    >
                      <Text
                        variant="caption"
                        style={{ color: active ? '#fff' : themeColors.textSecondary }}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <View style={styles.toggleRow}>
              <TouchableOpacity
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  togglePrivateOnly();
                }}
                style={[
                  styles.toggleChip,
                  {
                    backgroundColor: showPrivateOnly ? themeColors.primary : themeColors.surfaceVariant,
                    borderColor: showPrivateOnly ? themeColors.primary : themeColors.border,
                  },
                ]}
              >
                <Text
                  variant="caption"
                  style={{ color: showPrivateOnly ? '#fff' : themeColors.textSecondary }}
                >
                  Private only
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  toggleRemindersOnly();
                }}
                style={[
                  styles.toggleChip,
                  {
                    backgroundColor: showRemindersOnly ? themeColors.primary : themeColors.surfaceVariant,
                    borderColor: showRemindersOnly ? themeColors.primary : themeColors.border,
                  },
                ]}
              >
                <Text
                  variant="caption"
                  style={{ color: showRemindersOnly ? '#fff' : themeColors.textSecondary }}
                >
                  Reminders only
                </Text>
              </TouchableOpacity>
              <Text variant="caption" color="textSecondary" isDark={isDark}>
                {totalFiltered} event{totalFiltered === 1 ? '' : 's'}
              </Text>
            </View>

            <Card
              isDark={isDark}
              style={[
                styles.heroCard,
                { borderLeftColor: calendarSummary.color ?? themeColors.primary },
              ]}
            >
              <Text variant="label" color="textSecondary" isDark={isDark}>
                Next event
              </Text>
              <Text variant="h3" isDark={isDark} weight="bold" style={styles.heroTitle}>
                {calendarSummary.title}
              </Text>
              <Text variant="body" color="textSecondary" isDark={isDark}>
                {calendarSummary.subtitle}
              </Text>
            </Card>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text variant="label" color="textSecondary" isDark={isDark} style={styles.sectionHeader}>
            {formatSectionDate(section.date)}
          </Text>
        )}
            renderItem={({ item }) => (
              <EventCard
                event={item}
                isDark={isDark}
                onPress={() => openEditModal(item)}
                onEdit={() => openEditModal(item)}
                onDelete={() => handleDelete(item.eventId)}
              />
            )}
        ListEmptyComponent={
          <Card isDark={isDark} style={styles.emptyState}>
            <Text variant="body" color="textSecondary" isDark={isDark}>
              {events.length === 0
                ? 'No events scheduled yet. Tap “Add” to create your first event.'
                : 'No events match your current filters.'}
            </Text>
          </Card>
        }
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refetch}
            tintColor={themeColors.primary}
          />
        }
      />

      {familyId && (
        <EventModal
          visible={modalVisible}
          event={selectedEvent}
          isDark={isDark}
          familyId={familyId}
          defaultColor={themeColors.primary}
          familyMembers={members.map((member) => ({
            userId: member.id,
            fullName:
              (member.firstName || member.lastName)
                ? `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim()
                : member.email || 'Member',
          }))}
          onClose={() => setModalVisible(false)}
          onSubmit={handleCreateOrUpdate}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeframeRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[3],
    paddingRight: spacing[4],
  },
  memberRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[2],
    paddingRight: spacing[4],
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  toggleChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  errorAlert: {
    marginTop: spacing[3],
  },
  heroCard: {
    marginTop: spacing[4],
    padding: spacing[4],
    borderLeftWidth: 4,
  },
  heroTitle: {
    marginVertical: spacing[1],
  },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[6],
  },
  sectionHeader: {
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  emptyState: {
    padding: spacing[6],
    marginTop: spacing[4],
    alignItems: 'center',
  },
});

const formatSectionDate = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
};

export default CalendarScreen;
