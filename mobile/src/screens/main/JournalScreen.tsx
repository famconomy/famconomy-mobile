import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { Heart, Plus, Lock, Globe, X, Save, Trash2, Edit } from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import { useFamily } from '../../hooks/useFamily';
import {
  getJournalEntries,
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
  JournalEntry,
} from '../../api/journal';
import { format } from 'date-fns';

export const JournalScreen = () => {
  const { user } = useAuth();
  const { family } = useFamily();

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  
  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadEntries = useCallback(async (isRefresh = false) => {
    if (!family) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const data = await getJournalEntries(family.id);
      setEntries(data.sort((a, b) => 
        new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime()
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load journal entries');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [family]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const onRefresh = () => {
    loadEntries(true);
  };

  const openCreateModal = () => {
    setTitle('');
    setContent('');
    setIsPrivate(false);
    setShowCreateModal(true);
  };

  const openEditModal = (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setTitle(entry.Title);
    setContent(entry.EntryText);
    setIsPrivate(entry.IsPrivate);
    setShowEditModal(true);
  };

  const handleCreateEntry = async () => {
    if (!family || !user || !title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    try {
      setSaving(true);
      await createJournalEntry({
        FamilyID: Number(family.id),
        Title: title.trim(),
        EntryText: content.trim(),
        IsPrivate: isPrivate,
      });

      setShowCreateModal(false);
      loadEntries();
      Alert.alert('Success', 'Journal entry created!');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create entry');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateEntry = async () => {
    if (!selectedEntry || !title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    try {
      setSaving(true);
      await updateJournalEntry(selectedEntry.EntryID, {
        Title: title.trim(),
        EntryText: content.trim(),
        IsPrivate: isPrivate,
      });

      setShowEditModal(false);
      setSelectedEntry(null);
      loadEntries();
      Alert.alert('Success', 'Journal entry updated!');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update entry');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = (entry: JournalEntry) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this journal entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteJournalEntry(entry.EntryID);
              loadEntries();
              Alert.alert('Success', 'Entry deleted');
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  const renderEntry = (entry: JournalEntry) => {
    const isOwner = entry.CreatedByUserID === user?.id;
    const date = format(new Date(entry.CreatedAt), 'MMM d, yyyy');
    const preview = entry.EntryText.slice(0, 150) + (entry.EntryText.length > 150 ? '...' : '');

    return (
      <View key={entry.EntryID} style={styles.entryCard}>
        <View style={styles.entryHeader}>
          <View style={styles.entryTitleRow}>
            {entry.IsPrivate ? (
              <Lock size={18} color="#64748b" />
            ) : (
              <Globe size={18} color="#64748b" />
            )}
            <Text style={styles.entryTitle}>{entry.Title}</Text>
          </View>
          {isOwner && (
            <View style={styles.entryActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => openEditModal(entry)}
              >
                <Edit size={18} color="#3b82f6" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDeleteEntry(entry)}
              >
                <Trash2 size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={styles.entryDate}>{date}</Text>

        {entry.EntryText && (
          <Text style={styles.entryPreview}>{preview}</Text>
        )}

        <View style={styles.entryFooter}>
          <Text style={styles.entryPrivacyLabel}>
            {entry.IsPrivate ? 'Private' : 'Shared with family'}
          </Text>
        </View>
      </View>
    );
  };

  const renderModal = (isEdit: boolean) => (
    <Modal
      visible={isEdit ? showEditModal : showCreateModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => isEdit ? setShowEditModal(false) : setShowCreateModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {isEdit ? 'Edit Entry' : 'New Journal Entry'}
            </Text>
            <TouchableOpacity 
              onPress={() => isEdit ? setShowEditModal(false) : setShowCreateModal(false)}
            >
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Entry title"
            value={title}
            onChangeText={setTitle}
            placeholderTextColor="#94a3b8"
          />

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Write your thoughts..."
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={8}
            placeholderTextColor="#94a3b8"
          />

          <TouchableOpacity
            style={styles.privacyToggle}
            onPress={() => setIsPrivate(!isPrivate)}
          >
            {isPrivate ? (
              <Lock size={20} color="#3b82f6" />
            ) : (
              <Globe size={20} color="#10b981" />
            )}
            <Text style={styles.privacyToggleText}>
              {isPrivate ? 'Private (only you)' : 'Shared with family'}
            </Text>
          </TouchableOpacity>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={() => isEdit ? setShowEditModal(false) : setShowCreateModal(false)}
              disabled={saving}
            >
              <Text style={styles.modalButtonTextCancel}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonSave]}
              onPress={isEdit ? handleUpdateEntry : handleCreateEntry}
              disabled={saving || !title.trim()}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Save size={18} color="#fff" />
                  <Text style={styles.modalButtonTextSave}>
                    {isEdit ? 'Update' : 'Create'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Journal</Text>
          <Text style={styles.headerSubtitle}>
            {family?.name || 'Your Family'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={openCreateModal}
        >
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Heart size={48} color="#94a3b8" />
            <Text style={styles.emptyStateText}>No journal entries yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Tap the + button to write your first entry
            </Text>
          </View>
        ) : (
          <View style={styles.entriesList}>
            {entries.map(renderEntry)}
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      {renderModal(false)}
      {renderModal(true)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#ec4899',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorContainer: {
    padding: 16,
    margin: 16,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
  },
  errorText: {
    color: '#dc2626',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    marginTop: 64,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
  },
  entriesList: {
    padding: 16,
  },
  entryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  entryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  entryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  entryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  entryDate: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 12,
  },
  entryPreview: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 12,
  },
  entryFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  entryPrivacyLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#1e293b',
    marginBottom: 16,
  },
  textArea: {
    height: 150,
    textAlignVertical: 'top',
  },
  privacyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    marginBottom: 16,
  },
  privacyToggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  modalButtonCancel: {
    backgroundColor: '#f1f5f9',
  },
  modalButtonSave: {
    backgroundColor: '#ec4899',
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  modalButtonTextSave: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default JournalScreen;
