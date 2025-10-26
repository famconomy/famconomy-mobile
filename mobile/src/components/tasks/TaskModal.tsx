import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { spacing, lightTheme, darkTheme, fontSize, fontWeight } from '../../theme';
import type { Task } from '../../types';
import type { CreateTaskRequest, UpdateTaskRequest } from '../../api/tasks';

interface TaskModalProps {
  visible: boolean;
  task?: Task;
  isDark?: boolean;
  onClose: () => void;
  onSave: (data: CreateTaskRequest | UpdateTaskRequest) => Promise<void>;
  familyMembers?: Array<{ userId: string; fullName: string }>;
}

const CATEGORIES = ['chores', 'homework', 'shopping', 'activities', 'other'] as const;
const RECURRENCE_OPTIONS = ['none', 'daily', 'weekly', 'monthly'] as const;
const REWARD_TYPES = ['points', 'screentime', 'currency'] as const;

export const TaskModal: React.FC<TaskModalProps> = ({
  visible,
  task,
  isDark = false,
  onClose,
  onSave,
  familyMembers = [],
}) => {
  const theme = isDark ? darkTheme : lightTheme;
  const isEditing = !!task;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState<'chores' | 'homework' | 'shopping' | 'activities' | 'other'>('chores');
  const [assignedTo, setAssignedTo] = useState('');
  const [rewardType, setRewardType] = useState<'points' | 'screentime' | 'currency'>('points');
  const [rewardValue, setRewardValue] = useState('');
  const [recurring, setRecurring] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isEditing && task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setDueDate(task.dueDate || '');
      setCategory(task.category as any);
      setAssignedTo(task.assignedToUserId || '');
      setRewardType((task.rewardType as any) || 'points');
      setRewardValue(task.rewardValue?.toString() || '');
      setRecurring((task.recurring as any) || 'none');
    } else {
      resetForm();
    }
  }, [visible, task, isEditing]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDueDate('');
    setCategory('chores');
    setAssignedTo('');
    setRewardType('points');
    setRewardValue('');
    setRecurring('none');
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Task title is required';
    }

    if (rewardValue && isNaN(Number(rewardValue))) {
      newErrors.rewardValue = 'Reward must be a number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const data: CreateTaskRequest | UpdateTaskRequest = {
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate || undefined,
        category,
        assignedToUserId: assignedTo || undefined,
        rewardType: rewardValue ? (rewardType as any) : undefined,
        rewardValue: rewardValue ? Number(rewardValue) : undefined,
        recurring,
      };

      await onSave(data);
      onClose();
      resetForm();
    } catch (error) {
      console.error('Failed to save task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}
      >
        <View style={styles.modalContent}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1 }}
          >
            {/* Header */}
            <View
              style={[
                styles.header,
                { backgroundColor: theme.surface, borderBottomColor: theme.border },
              ]}
            >
              <TouchableOpacity onPress={onClose}>
                <Text variant="body" color="primary" isDark={isDark} weight="semibold">
                  Cancel
                </Text>
              </TouchableOpacity>
              <Text variant="h4" isDark={isDark} weight="bold">
                {isEditing ? 'Edit Task' : 'New Task'}
              </Text>
              <TouchableOpacity onPress={handleSave} disabled={isLoading}>
                <Text
                  variant="body"
                  color={isLoading ? 'textTertiary' : 'primary'}
                  isDark={isDark}
                  weight="semibold"
                >
                  {isLoading ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Form */}
            <View
              style={[
                styles.form,
                { backgroundColor: theme.background },
              ]}
            >
              <Input
                label="Task Title *"
                placeholder="e.g., Clean bedroom"
                value={title}
                onChangeText={setTitle}
                containerStyle={styles.formGroup}
                error={errors.title}
                isDark={isDark}
              />

              <Input
                label="Description"
                placeholder="Add more details..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                containerStyle={styles.formGroup}
                isDark={isDark}
              />

              {/* Category Selection */}
              <View style={styles.formGroup}>
                <Text variant="label" isDark={isDark} style={styles.label}>
                  Category
                </Text>
                <View style={styles.buttonGroup}>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setCategory(cat)}
                      style={[
                        styles.categoryButton,
                        {
                          backgroundColor:
                            category === cat
                              ? theme.primary
                              : theme.surfaceVariant,
                          borderColor: category === cat ? theme.primary : theme.border,
                        },
                      ]}
                    >
                      <Text
                        variant="caption"
                        color={category === cat ? undefined : 'textSecondary'}
                        isDark={isDark}
                        style={{
                          color: category === cat ? '#fff' : undefined,
                        }}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Recurrence */}
              <View style={styles.formGroup}>
                <Text variant="label" isDark={isDark} style={styles.label}>
                  Repeat
                </Text>
                <View style={styles.buttonGroup}>
                  {RECURRENCE_OPTIONS.map((rec) => (
                    <TouchableOpacity
                      key={rec}
                      onPress={() => setRecurring(rec)}
                      style={[
                        styles.recurringButton,
                        {
                          backgroundColor:
                            recurring === rec
                              ? theme.secondary
                              : theme.surfaceVariant,
                        },
                      ]}
                    >
                      <Text
                        variant="caption"
                        isDark={isDark}
                        style={{
                          color: recurring === rec ? '#fff' : undefined,
                        }}
                      >
                        {rec}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Input
                label="Due Date"
                placeholder="YYYY-MM-DD"
                value={dueDate}
                onChangeText={setDueDate}
                containerStyle={styles.formGroup}
                isDark={isDark}
              />

              {/* Reward Section */}
              <Card isDark={isDark} style={styles.rewardSection}>
                <Text variant="label" isDark={isDark} style={styles.label}>
                  Reward (Optional)
                </Text>

                <View style={styles.rewardRow}>
                  <View style={styles.rewardTypeButtonGroup}>
                    {REWARD_TYPES.map((type) => (
                      <TouchableOpacity
                        key={type}
                        onPress={() => setRewardType(type as any)}
                        style={[
                          styles.rewardTypeButton,
                          {
                            backgroundColor:
                              rewardType === type
                                ? theme.success
                                : theme.surfaceVariant,
                          },
                        ]}
                      >
                        <Text
                          variant="caption"
                          isDark={isDark}
                          style={{
                            color: rewardType === type ? '#fff' : undefined,
                          }}
                        >
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Input
                    placeholder="Amount"
                    value={rewardValue}
                    onChangeText={setRewardValue}
                    keyboardType="number-pad"
                    style={{ flex: 1 }}
                    containerStyle={{ flex: 1 }}
                    isDark={isDark}
                    error={errors.rewardValue}
                  />
                </View>
              </Card>

              {/* Assign To */}
              {familyMembers.length > 0 && (
                <View style={styles.formGroup}>
                  <Text variant="label" isDark={isDark} style={styles.label}>
                    Assign To
                  </Text>
                  <View style={styles.assignmentButtonGroup}>
                    <TouchableOpacity
                      onPress={() => setAssignedTo('')}
                      style={[
                        styles.assignmentButton,
                        {
                          backgroundColor:
                            assignedTo === ''
                              ? theme.primary
                              : theme.surfaceVariant,
                        },
                      ]}
                    >
                      <Text
                        variant="caption"
                        isDark={isDark}
                        style={{
                          color: assignedTo === '' ? '#fff' : undefined,
                        }}
                      >
                        Unassigned
                      </Text>
                    </TouchableOpacity>

                    {familyMembers.map((member) => (
                      <TouchableOpacity
                        key={member.userId}
                        onPress={() => setAssignedTo(member.userId)}
                        style={[
                          styles.assignmentButton,
                          {
                            backgroundColor:
                              assignedTo === member.userId
                                ? theme.primary
                                : theme.surfaceVariant,
                          },
                        ]}
                      >
                        <Text
                          variant="caption"
                          isDark={isDark}
                          style={{
                            color:
                              assignedTo === member.userId ? '#fff' : undefined,
                          }}
                        >
                          {member.fullName.split(' ')[0]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View
            style={[
              styles.footer,
              { backgroundColor: theme.surface, borderTopColor: theme.border },
            ]}
          >
            {isEditing && (
              <Button
                title="Delete"
                onPress={onClose}
                variant="danger"
                isDark={isDark}
                style={{ flex: 1, marginRight: spacing[2] }}
              />
            )}
            <Button
              title={isLoading ? 'Saving...' : 'Save Task'}
              onPress={handleSave}
              loading={isLoading}
              disabled={isLoading}
              isDark={isDark}
              style={{ flex: isEditing ? 2 : 1 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '90%',
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
  form: {
    flex: 1,
    padding: spacing[4],
  },
  formGroup: {
    marginBottom: spacing[4],
  },
  label: {
    marginBottom: spacing[2],
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  categoryButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  recurringButton: {
    borderRadius: 8,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  rewardSection: {
    marginBottom: spacing[4],
    padding: spacing[3],
  },
  rewardRow: {
    flexDirection: 'row',
    gap: spacing[2],
    alignItems: 'flex-end',
    marginTop: spacing[2],
  },
  rewardTypeButtonGroup: {
    flexDirection: 'row',
    gap: spacing[1],
    flex: 1,
  },
  rewardTypeButton: {
    flex: 1,
    borderRadius: 6,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    alignItems: 'center',
  },
  assignmentButtonGroup: {
    flexDirection: 'row',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  assignmentButton: {
    borderRadius: 8,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  footer: {
    flexDirection: 'row',
    padding: spacing[4],
    gap: spacing[2],
    borderTopWidth: 1,
  },
});
