import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Star, ThumbsUp, ThumbsDown, Plus } from 'lucide-react-native';
import { useAppStore } from '../../store/appStore';
import { useAuth } from '../../hooks/useAuth';
import { useFamily } from '../../hooks/useFamily';
import {
  fetchGuidelines,
  createGuideline,
  approveGuideline,
  type GuidelineNode,
  type GuidelineType,
} from '../../api/guidelines';
import { spacing, lightTheme, darkTheme, borderRadius, fontSize } from '../../theme';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Toast } from '../../components/ui/Toast';
import { Alert } from '../../components/ui/Alert';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

type GuidelineGroup = { active: GuidelineNode[]; pending: GuidelineNode[] };

const DEFAULT_GROUP: GuidelineGroup = { active: [], pending: [] };

const ValuesScreen: React.FC = () => {
  const { theme } = useAppStore();
  const { user } = useAuth();
  const { family } = useFamily();

  const isDark = theme === 'dark';
  const themeColors = isDark ? darkTheme : lightTheme;

  const [activeTab, setActiveTab] = useState<GuidelineType>('VALUE');
  const [valuesGroup, setValuesGroup] = useState<GuidelineGroup>(DEFAULT_GROUP);
  const [rulesGroup, setRulesGroup] = useState<GuidelineGroup>(DEFAULT_GROUP);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [suggestionTitle, setSuggestionTitle] = useState('');
  const [suggestionDescription, setSuggestionDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadGuidelines = useCallback(
    async (isRefresh = false) => {
      if (!family) {
        setValuesGroup(DEFAULT_GROUP);
        setRulesGroup(DEFAULT_GROUP);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      try {
        if (isRefresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }
        setError(null);

        const [values, rules] = await Promise.all([
          fetchGuidelines(family.id, 'VALUE'),
          fetchGuidelines(family.id, 'RULE'),
        ]);

        setValuesGroup(values ?? DEFAULT_GROUP);
        setRulesGroup(rules ?? DEFAULT_GROUP);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load family values right now.';
        setError(message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [family],
  );

  useEffect(() => {
    loadGuidelines().catch(() => {
      // error state handled above
    });
  }, [loadGuidelines]);

  const handleRefresh = () => {
    loadGuidelines(true).catch(() => {
      // error already captured
    });
  };

  const currentGroup = useMemo(
    () => (activeTab === 'VALUE' ? valuesGroup : rulesGroup),
    [activeTab, valuesGroup, rulesGroup],
  );

  const handleCreateGuideline = async () => {
    if (!family) {
      setToast({ message: 'Join a family to share suggestions.', type: 'info' });
      return;
    }
    if (!suggestionTitle.trim()) {
      setToast({ message: 'Please give your suggestion a title.', type: 'info' });
      return;
    }

    try {
      setIsSubmitting(true);
      await createGuideline(family.id, {
        type: activeTab,
        title: suggestionTitle.trim(),
        description: suggestionDescription.trim() || undefined,
      });
      setToast({ message: 'Suggestion submitted for review', type: 'success' });
      setCreateModalOpen(false);
      setSuggestionTitle('');
      setSuggestionDescription('');
      await loadGuidelines(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to submit suggestion.';
      setToast({ message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVote = async (guideline: GuidelineNode, approved: boolean) => {
    if (!family) return;
    try {
      await approveGuideline(family.id, guideline.GuidelineID, approved);
      setToast({ message: approved ? 'Approved!' : 'Vote recorded', type: 'success' });
      await loadGuidelines(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to record vote.';
      setToast({ message, type: 'error' });
    }
  };

  const renderGuidelineCard = (node: GuidelineNode, isPending: boolean) => {
    const approvals = node.approvals ?? [];
    const approvedCount = approvals.filter((vote) => vote.Approved).length;
    const totalVotes = approvals.length;
    const userVote = approvals.find((vote) => vote.UserID === user?.id);

    return (
      <Card key={node.GuidelineID} isDark={isDark} style={styles.guidelineCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Star size={20} color={themeColors.primary} />
            <Text variant="h4" isDark={isDark} weight="bold" style={{ marginLeft: spacing[2], flex: 1 }}>
              {node.Title}
            </Text>
          </View>
          {isPending && (
            <View style={styles.voteCount}>
              <Text variant="caption" color="textSecondary" isDark={isDark}>
                {approvedCount}/{totalVotes}
              </Text>
            </View>
          )}
        </View>

        {!!node.Description && (
          <Text variant="body" color="textSecondary" isDark={isDark} style={{ marginTop: spacing[2] }}>
            {node.Description}
          </Text>
        )}

        {isPending ? (
          <View style={styles.voteRow}>
            <Button
              title="Approve"

              onPress={() => handleVote(node, true)}
              size="small"
              variant={userVote?.Approved ? 'primary' : 'outline'}
              isDark={isDark}
              style={{ flex: 1 }}
            />
            <Button
              title="Pass"

              onPress={() => handleVote(node, false)}
              size="small"
              variant={!userVote?.Approved && userVote ? 'primary' : 'outline'}
              isDark={isDark}
              style={{ flex: 1 }}
            />
          </View>
        ) : (
          node.children?.length ? (
            <View style={{ marginTop: spacing[2], paddingLeft: spacing[2] }}>
              {node.children.map((child) => (
                <Text key={child.GuidelineID} variant="body" color="textSecondary" isDark={isDark}>
                  • {child.Title}
                </Text>
              ))}
            </View>
          ) : null
        )}
      </Card>
    );
  };

  if (!family) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: themeColors.background }]}>
        <Card isDark={isDark} style={styles.emptyCard}>
          <Text variant="h3" isDark={isDark} weight="bold">
            Join a family to see shared values
          </Text>
          <Text variant="body" color="textSecondary" isDark={isDark} style={{ marginTop: spacing[2], textAlign: 'center' }}>
            Accept an invitation or create a family to start collaborating on values and rules together.
          </Text>
        </Card>
      </View>
    );
  }

  if (isLoading) {
    return <LoadingSpinner isDark={isDark} message="Loading family values…" />;
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      refreshControl={undefined}
      showsVerticalScrollIndicator={false}
    >
      {toast && <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />}

      <View style={styles.header}>
        <View>
          <Text variant="h2" isDark={isDark} weight="bold">
            Family Values & Rules
          </Text>
          <Text variant="body" color="textSecondary" isDark={isDark}>
            {family.name}
          </Text>
        </View>
        <Button
          title="Suggest"

          onPress={() => setCreateModalOpen(true)}
          isDark={isDark}
        />
      </View>

      <View style={[styles.tabRow, { borderColor: themeColors.border }]}>
        {(['VALUE', 'RULE'] as const).map((tab) => {
          const active = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabButton,
                {
                  borderBottomColor: active ? themeColors.primary : 'transparent',
                },
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                variant="body"
                style={{
                  color: active ? themeColors.primary : themeColors.textSecondary,
                  fontWeight: active ? '600' : '400',
                }}
              >
                {tab === 'VALUE' ? 'Values' : 'Rules'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.refreshRow}>
        <Button
          title="Refresh"
          size="small"
          variant="outline"
          onPress={handleRefresh}
          disabled={isRefreshing}
          isDark={isDark}
        />
      </View>

      {error && (
        <Alert
          type="warning"
          title="Unable to load values"
          message={error}
          isDark={isDark}
          style={{ marginHorizontal: spacing[4], marginBottom: spacing[2] }}
        />
      )}

      <View style={{ padding: spacing[4], gap: spacing[3] }}>
        <Text variant="h3" isDark={isDark} weight="bold">
          Pending approval
        </Text>
        {currentGroup.pending.length === 0 ? (
          <Card isDark={isDark} style={styles.emptyCard}>
            <Text variant="body" color="textSecondary" isDark={isDark}>
              No pending suggestions right now.
            </Text>
          </Card>
        ) : (
          currentGroup.pending.map((node) => renderGuidelineCard(node, true))
        )}

        <Text variant="h3" isDark={isDark} weight="bold" style={{ marginTop: spacing[2] }}>
          Active {activeTab === 'VALUE' ? 'values' : 'rules'}
        </Text>
        {currentGroup.active.length === 0 ? (
          <Card isDark={isDark} style={styles.emptyCard}>
            <Text variant="body" color="textSecondary" isDark={isDark}>
              No active items yet. Share a suggestion to get started!
            </Text>
          </Card>
        ) : (
          currentGroup.active.map((node) => renderGuidelineCard(node, false))
        )}
      </View>

      <Modal
        visible={createModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setCreateModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: themeColors.surface }]}>
            <Text variant="h3" isDark={isDark} weight="bold" style={{ marginBottom: spacing[2] }}>
              Suggest a {activeTab === 'VALUE' ? 'Value' : 'Rule'}
            </Text>
            <Text variant="body" color="textSecondary" isDark={isDark} style={{ marginBottom: spacing[3] }}>
              Share an idea with your family. Suggestions are pending until everyone votes.
            </Text>
            <Input
              label="Title"
              value={suggestionTitle}
              onChangeText={setSuggestionTitle}
              isDark={isDark}
              placeholder="Share a family mantra or rule"
              containerStyle={{ marginBottom: spacing[3] }}
            />
            <Input
              label="Description"
              value={suggestionDescription}
              onChangeText={setSuggestionDescription}
              isDark={isDark}
              placeholder="Add optional context"
              multiline
            />
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setCreateModalOpen(false)}
                isDark={isDark}
                disabled={isSubmitting}
              />
              <Button
                title={isSubmitting ? 'Submitting…' : 'Submit'}
                onPress={handleCreateGuideline}
                isDark={isDark}
                disabled={isSubmitting}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <View style={{ height: spacing[8] }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing[4],
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[4],
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 2,
  },
  refreshRow: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing[4],
    marginTop: spacing[2],
  },
  guidelineCard: {
    padding: spacing[3],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing[2],
  },
  voteCount: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.base,
  },
  voteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: spacing[4],
  },
  modalContent: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  tag: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    marginRight: spacing[1],
  },
});

export default ValuesScreen;
