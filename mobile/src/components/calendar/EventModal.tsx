import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text } from '../ui/Text';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { spacing, lightTheme, darkTheme } from '../../theme';
import type { CalendarEvent, RecurrenceType } from '../../types';
import type { CreateCalendarEventRequest, UpdateCalendarEventRequest } from '../../api/calendar';

interface EventModalProps {
  visible: boolean;
  event?: CalendarEvent;
  isDark?: boolean;
  familyId: string;
  defaultColor?: string;
  familyMembers?: Array<{ userId: string; fullName: string }>;
  onClose: () => void;
  onSubmit: (data: CreateCalendarEventRequest | UpdateCalendarEventRequest) => Promise<void>;
}

const REPEAT_OPTIONS: RecurrenceType[] = ['none', 'daily', 'weekly', 'monthly'];

const formatDateInput = (iso?: string): string => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toISOString().slice(0, 16);
};

const parseDateInput = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
};

export const EventModal: React.FC<EventModalProps> = ({
  visible,
  event,
  isDark = false,
  familyId,
  defaultColor,
  familyMembers = [],
  onClose,
  onSubmit,
}) => {
  const theme = isDark ? darkTheme : lightTheme;
  const isEditing = Boolean(event);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [repeat, setRepeat] = useState<RecurrenceType>('none');
  const [reminder, setReminder] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [color, setColor] = useState(defaultColor ?? theme.primary);
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }
    if (event) {
      setTitle(event.title);
      setDescription(event.description ?? '');
      setLocation(event.location ?? '');
      setStart(formatDateInput(event.startTime));
      setEnd(formatDateInput(event.endTime));
      setRepeat(event.repeatType ?? 'none');
      setReminder(Boolean(event.reminder));
      setIsPrivate(Boolean(event.isPrivate));
      setColor(event.color ?? theme.primary);
      setAssignedTo(event.assignedToUserId ?? '');
    } else {
      const now = new Date();
      const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
      setTitle('');
      setDescription('');
      setLocation('');
      setStart(formatDateInput(now.toISOString()));
      setEnd(formatDateInput(inOneHour.toISOString()));
      setRepeat('none');
      setReminder(false);
      setIsPrivate(false);
      setColor(defaultColor ?? theme.primary);
      setAssignedTo('');
    }
    setErrors({});
    setSaving(false);
  }, [defaultColor, event, theme.primary, visible]);

  const durationError = useMemo(() => {
    if (!start || !end) return null;
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;
    if (endDate <= startDate) {
      return 'End time must be after start time';
    }
    return null;
  }, [start, end]);

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};
    if (!title.trim()) {
      nextErrors.title = 'Event title is required';
    }
    if (!start) {
      nextErrors.start = 'Start time is required';
    }
    if (durationError) {
      nextErrors.end = durationError;
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload: CreateCalendarEventRequest | UpdateCalendarEventRequest = {
        familyId,
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        startTime: parseDateInput(start)!,
        endTime: parseDateInput(end),
        repeatType: repeat,
        reminder,
        isPrivate,
        colorHex: color,
        assignedToUserId: assignedTo || undefined,
      };
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setSaving(false);
      setErrors((prev) => ({
        ...prev,
        submit: err instanceof Error ? err.message : 'Failed to save event',
      }));
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
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
              {isEditing ? 'Edit Event' : 'New Event'}
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

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            <Input
              label="Title *"
              value={title}
              onChangeText={setTitle}
              placeholder="Family movie night"
              containerStyle={styles.field}
              isDark={isDark}
              error={errors.title}
            />
            <Input
              label="Description"
              value={description}
              onChangeText={setDescription}
              placeholder="Notes, agenda, or reminders"
              multiline
              numberOfLines={3}
              containerStyle={styles.field}
              isDark={isDark}
            />
            <Input
              label="Location"
              value={location}
              onChangeText={setLocation}
              placeholder="Home, Park, Online…"
              containerStyle={styles.field}
              isDark={isDark}
            />
            <Input
              label="Start *"
              value={start}
              onChangeText={setStart}
              placeholder="YYYY-MM-DDTHH:MM"
              keyboardType="numbers-and-punctuation"
              containerStyle={styles.field}
              isDark={isDark}
              error={errors.start}
            />
            <Input
              label="End"
              value={end}
              onChangeText={setEnd}
              placeholder="YYYY-MM-DDTHH:MM"
              keyboardType="numbers-and-punctuation"
              containerStyle={styles.field}
              isDark={isDark}
              error={errors.end}
            />

            <Card isDark={isDark} style={styles.field}>
              <Text variant="label" isDark={isDark} style={styles.sectionLabel}>
                Repeat
              </Text>
              <View style={styles.optionRow}>
                {REPEAT_OPTIONS.map((option) => {
                  const active = option === repeat;
                  return (
                    <TouchableOpacity
                      key={option}
                      onPress={() => setRepeat(option)}
                      style={[
                        styles.pillButton,
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
                        {option === 'none'
                          ? 'None'
                          : option.charAt(0).toUpperCase() + option.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Card>

            <Card isDark={isDark} style={styles.field}>
              <Text variant="label" isDark={isDark} style={styles.sectionLabel}>
                Options
              </Text>
              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setReminder((prev) => !prev)}
              >
                <View
                  style={[
                    styles.toggleIndicator,
                    { backgroundColor: reminder ? theme.primary : theme.surfaceVariant },
                  ]}
                />
                <Text variant="body" isDark={isDark}>
                  Reminder notification
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setIsPrivate((prev) => !prev)}
              >
                <View
                  style={[
                    styles.toggleIndicator,
                    { backgroundColor: isPrivate ? theme.primary : theme.surfaceVariant },
                  ]}
                />
                <Text variant="body" isDark={isDark}>
                  Private event
                </Text>
              </TouchableOpacity>
            </Card>

            <Card isDark={isDark} style={styles.field}>
              <Text variant="label" isDark={isDark} style={styles.sectionLabel}>
                Accent color
              </Text>
              <View style={styles.optionRow}>
                {['#2563eb', '#0ea5e9', '#22c55e', '#f97316', '#ef4444', '#9333ea'].map((hex) => {
                  const active = color === hex;
                  return (
                    <TouchableOpacity
                      key={hex}
                      onPress={() => setColor(hex)}
                      style={[
                        styles.colorSwatch,
                        {
                          backgroundColor: hex,
                          borderColor: active ? theme.surface : 'transparent',
                        },
                      ]}
                    />
                  );
                })}
              </View>
            </Card>

            {familyMembers.length > 0 && (
              <Card isDark={isDark} style={styles.field}>
                <Text variant="label" isDark={isDark} style={styles.sectionLabel}>
                  Assign to
                </Text>
                <View style={styles.optionRow}>
                  <TouchableOpacity
                    onPress={() => setAssignedTo('')}
                    style={[
                      styles.assignmentPill,
                      {
                        backgroundColor: assignedTo === '' ? theme.primary : theme.surfaceVariant,
                        borderColor: assignedTo === '' ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text
                      variant="caption"
                      style={{ color: assignedTo === '' ? '#fff' : theme.textSecondary }}
                    >
                      Unassigned
                    </Text>
                  </TouchableOpacity>
                  {familyMembers.map((member) => {
                    const active = assignedTo === member.userId;
                    return (
                      <TouchableOpacity
                        key={member.userId}
                        onPress={() => setAssignedTo(member.userId)}
                        style={[
                          styles.assignmentPill,
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
                          {member.fullName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Card>
            )}

            {errors.submit && (
              <Text variant="body" color="error" isDark={isDark} style={styles.errorText}>
                {errors.submit}
              </Text>
            )}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <Button
              title={saving ? 'Saving…' : isEditing ? 'Update Event' : 'Create Event'}
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
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '92%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[6],
  },
  field: {
    marginTop: spacing[3],
  },
  sectionLabel: {
    marginBottom: spacing[2],
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  pillButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
  },
  toggleIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
  },
  assignmentPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  footer: {
    padding: spacing[4],
    borderTopWidth: 1,
  },
  errorText: {
    marginTop: spacing[2],
  },
});

export default EventModal;
