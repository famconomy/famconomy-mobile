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
import { Star, Plus, ThumbsUp, ThumbsDown, X, Save } from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import { useFamily } from '../../hooks/useFamily';
import {
  fetchGuidelines,
  createGuideline,
  approveGuideline,
  GuidelineNode,
  GuidelineType,
} from '../../api/guidelines';

export const ValuesScreen = () => {
  const { user } = useAuth();
  const { family } = useFamily();

  const [activeTab, setActiveTab] = useState<GuidelineType>('VALUE');
  const [valuesData, setValuesData] = useState<{ active: GuidelineNode[]; pending: GuidelineNode[] } | null>(null);
  const [rulesData, setRulesData] = useState<{ active: GuidelineNode[]; pending: GuidelineNode[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const loadGuidelines = useCallback(async (type: GuidelineType, isRefresh = false) => {
    if (!family) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const data = await fetchGuidelines(family.id, type);

      if (type === 'VALUE') {
        setValuesData(data);
      } else {
        setRulesData(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load guidelines');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [family]);

  useEffect(() => {
    loadGuidelines('VALUE');
    loadGuidelines('RULE');
  }, [loadGuidelines]);

  const onRefresh = () => {
    loadGuidelines(activeTab, true);
  };

  const handleCreateGuideline = async () => {
    if (!family || !newTitle.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    try {
      setCreating(true);
      await createGuideline(family.id, {
        type: activeTab,
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
      });

      setShowCreateModal(false);
      setNewTitle('');
      setNewDescription('');
      loadGuidelines(activeTab);
      Alert.alert('Success', `${activeTab === 'VALUE' ? 'Value' : 'Rule'} suggestion submitted!`);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create suggestion');
    } finally {
      setCreating(false);
    }
  };

  const handleVote = async (guidelineId: number, approved: boolean) => {
    if (!family) return;

    try {
      await approveGuideline(family.id, guidelineId, approved);
      loadGuidelines(activeTab);
      Alert.alert('Success', approved ? 'Approved!' : 'Vote recorded');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to vote');
    }
  };

  const renderGuidelineCard = (guideline: GuidelineNode, isPending: boolean) => {
    const approvals = guideline.approvals || [];
    const approvedCount = approvals.filter(a => a.Approved).length;
    const totalCount = approvals.length;
    const userVote = approvals.find(a => a.UserID === user?.id);

    return (
      <View key={guideline.GuidelineID} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <Star size={20} color="#3b82f6" />
            <Text style={styles.cardTitle}>{guideline.Title}</Text>
          </View>
          {isPending && (
            <View style={styles.voteCount}>
              <Text style={styles.voteCountText}>
                {approvedCount}/{totalCount}
              </Text>
            </View>
          )}
        </View>

        {guideline.Description && (
          <Text style={styles.cardDescription}>{guideline.Description}</Text>
        )}

        {isPending && (
          <View style={styles.voteButtons}>
            <TouchableOpacity
              style={[
                styles.voteButton,
                userVote?.Approved && styles.voteButtonApproved,
              ]}
              onPress={() => handleVote(guideline.GuidelineID, true)}
            >
              <ThumbsUp size={18} color={userVote?.Approved ? '#fff' : '#10b981'} />
              <Text style={[styles.voteButtonText, userVote?.Approved && styles.voteButtonTextActive]}>
                Approve
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.voteButton,
                userVote && !userVote.Approved && styles.voteButtonRejected,
              ]}
              onPress={() => handleVote(guideline.GuidelineID, false)}
            >
              <ThumbsDown size={18} color={userVote && !userVote.Approved ? '#fff' : '#ef4444'} />
              <Text style={[styles.voteButtonText, userVote && !userVote.Approved && styles.voteButtonTextActive]}>
                Pass
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {!isPending && guideline.children && guideline.children.length > 0 && (
          <View style={styles.childrenContainer}>
            {guideline.children.map(child => (
              <Text key={child.GuidelineID} style={styles.childItem}>
                • {child.Title}
              </Text>
            ))}
          </View>
        )}
      </View>
    );
  };

  const currentData = activeTab === 'VALUE' ? valuesData : rulesData;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Family {activeTab === 'VALUE' ? 'Values' : 'Rules'}</Text>
          <Text style={styles.headerSubtitle}>
            {family?.name || 'Your Family'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'VALUE' && styles.tabActive]}
          onPress={() => setActiveTab('VALUE')}
        >
          <Text style={[styles.tabText, activeTab === 'VALUE' && styles.tabTextActive]}>
            Values
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'RULE' && styles.tabActive]}
          onPress={() => setActiveTab('RULE')}
        >
          <Text style={[styles.tabText, activeTab === 'RULE' && styles.tabTextActive]}>
            Rules
          </Text>
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
        ) : (
          <>
            {/* Pending Section */}
            {currentData && currentData.pending.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Under Review</Text>
                <Text style={styles.sectionSubtitle}>
                  Vote on suggestions to make them official
                </Text>
                {currentData.pending.map(item => renderGuidelineCard(item, true))}
              </View>
            )}

            {/* Active Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Agreed {activeTab === 'VALUE' ? 'Values' : 'Rules'}
              </Text>
              {currentData && currentData.active.length > 0 ? (
                currentData.active.map(item => renderGuidelineCard(item, false))
              ) : (
                <View style={styles.emptyState}>
                  <Star size={48} color="#94a3b8" />
                  <Text style={styles.emptyStateText}>
                    No {activeTab === 'VALUE' ? 'values' : 'rules'} yet
                  </Text>
                  <Text style={styles.emptyStateSubtext}>
                    Tap the + button to suggest one
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Create Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Suggest a {activeTab === 'VALUE' ? 'Value' : 'Rule'}
              </Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder={`${activeTab === 'VALUE' ? 'Value' : 'Rule'} title`}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholderTextColor="#94a3b8"
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              value={newDescription}
              onChangeText={setNewDescription}
              multiline
              numberOfLines={4}
              placeholderTextColor="#94a3b8"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowCreateModal(false)}
                disabled={creating}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleCreateGuideline}
                disabled={creating || !newTitle.trim()}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Save size={18} color="#fff" />
                    <Text style={styles.modalButtonTextSave}>Submit</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#3b82f6',
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
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#3b82f6',
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
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  card: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  cardDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 12,
  },
  voteCount: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  voteCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0284c7',
  },
  voteButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  voteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  voteButtonApproved: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  voteButtonRejected: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  voteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  voteButtonTextActive: {
    color: '#fff',
  },
  childrenContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  childItem: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
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
    maxHeight: '80%',
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
    height: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
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
    backgroundColor: '#3b82f6',
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

export default ValuesScreen;
