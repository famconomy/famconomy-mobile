import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { BookOpen, PlayCircle, MousePointerClick, Search, Star } from 'lucide-react-native';
import { useAppStore } from '../../store/appStore';
import { spacing, lightTheme, darkTheme, borderRadius, fontSize } from '../../theme';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Toast } from '../../components/ui/Toast';
import { resources as staticResources, searchResources, type Resource } from '../../data/resources';

type ResourceTab = 'kids' | 'parents';
type ResourceFilter = 'all' | Resource['type'];

const ICON_BY_TYPE: Record<Resource['type'], React.ReactNode> = {
  article: <BookOpen size={20} color="#6366f1" />,
  video: <PlayCircle size={20} color="#10b981" />,
  interactive: <MousePointerClick size={20} color="#f59e0b" />,
};

const ResourcesScreen: React.FC = () => {
  const { theme } = useAppStore();
  const isDark = theme === 'dark';
  const themeColors = isDark ? darkTheme : lightTheme;

  const [activeTab, setActiveTab] = useState<ResourceTab>('kids');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<ResourceFilter>('all');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);

  const filteredResources = useMemo(() => {
    const base = searchQuery
      ? searchResources(searchQuery, activeTab)
      : staticResources.filter((resource) => resource.category === activeTab);

    if (selectedType === 'all') {
      return base;
    }
    return base.filter((resource) => resource.type === selectedType);
  }, [activeTab, selectedType, searchQuery]);

  const handleFavoriteToggle = (resourceId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(resourceId)) {
        next.delete(resourceId);
        setToast({ message: 'Removed from favorites', type: 'info' });
      } else {
        next.add(resourceId);
        setToast({ message: 'Added to favorites', type: 'success' });
      }
      return next;
    });
  };

  const openExternalLink = async (resource: Resource) => {
    if (!resource.url) {
      setToast({ message: 'External link coming soon!', type: 'info' });
      return;
    }
    try {
      await Linking.openURL(resource.url);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to open link.';
      setToast({ message, type: 'error' });
    }
  };

  const renderResourceCard = (resource: Resource) => {
    const typeIcon = ICON_BY_TYPE[resource.type];
    const isFavorite = favorites.has(resource.id);

    return (
      <Card key={resource.id} isDark={isDark} style={styles.card}>
        {resource.thumbnail ? (
          <Image source={{ uri: resource.thumbnail }} style={styles.thumbnail} />
        ) : (
          <View
            style={[
              styles.thumbnail,
              {
                backgroundColor: themeColors.surfaceVariant,
              },
            ]}
          />
        )}
        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <View style={styles.typeBadge}>
              {typeIcon}
              <Text
                variant="caption"
                color="textSecondary"
                isDark={isDark}
                style={{ marginLeft: spacing[1], textTransform: 'uppercase' }}
              >
                {resource.type}
              </Text>
            </View>
            <TouchableOpacity onPress={() => handleFavoriteToggle(resource.id)} activeOpacity={0.8}>
              <Star size={20} color={isFavorite ? '#facc15' : themeColors.textSecondary} fill={isFavorite ? '#facc15' : 'transparent'} />
            </TouchableOpacity>
          </View>

          <Text variant="h4" isDark={isDark} weight="bold" style={{ marginBottom: spacing[1] }}>
            {resource.title}
          </Text>
          <Text variant="body" color="textSecondary" isDark={isDark} numberOfLines={3}>
            {resource.summary}
          </Text>

          <View style={styles.tagList}>
            {resource.tags.slice(0, 4).map((tag) => (
              <View
                key={`${resource.id}-${tag}`}
                style={[
                  styles.tag,
                  {
                    backgroundColor: themeColors.surfaceVariant,
                    borderColor: themeColors.border,
                  },
                ]}
              >
                <Text variant="caption" color="textSecondary" isDark={isDark}>
                  #{tag}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.cardActions}>
            <Button
              title="Preview"
              variant="outline"
              size="small"
              onPress={() => setSelectedResource(resource)}
              isDark={isDark}
            />
            <Button
              title={resource.url ? 'Open resource' : 'External link coming soon'}
              size="small"
              onPress={() => openExternalLink(resource)}
              disabled={!resource.url}
              isDark={isDark}
            />
          </View>
        </View>
      </Card>
    );
  };

  const renderFavoriteEmpty = () => (
    <Card isDark={isDark} style={styles.emptyCard}>
      <BookOpen size={48} color={themeColors.primary} />
      <Text variant="h3" isDark={isDark} weight="bold" style={{ marginTop: spacing[2] }}>
        No resources found
      </Text>
      <Text
        variant="body"
        color="textSecondary"
        isDark={isDark}
        style={{ marginTop: spacing[1], textAlign: 'center' }}
      >
        Try a different search or filter to explore more content.
      </Text>
    </Card>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {toast && <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />}

      <View style={styles.header}>
        <Text variant="h2" isDark={isDark} weight="bold">
          Educational Resources
        </Text>
        <Text variant="body" color="textSecondary" isDark={isDark}>
          Learn together as a family.
        </Text>
      </View>

      <View
        style={[
          styles.searchRow,
          {
            backgroundColor: themeColors.surface,
            borderColor: themeColors.border,
          },
        ]}
      >
        <Search size={18} color={themeColors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: themeColors.text }]}
          placeholder="Search resources..."
          placeholderTextColor={themeColors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={[styles.tabRow, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
        {(['kids', 'parents'] as const).map((tab) => {
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
              activeOpacity={0.8}
            >
              <Text
                variant="body"
                style={{
                  color: active ? themeColors.primary : themeColors.textSecondary,
                  fontWeight: active ? '600' : '400',
                }}
              >
                {tab === 'kids' ? 'For Kids' : 'For Parents'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: spacing[3] }}
        contentContainerStyle={{ paddingHorizontal: spacing[4], gap: spacing[2] }}
      >
        {(['all', 'article', 'video', 'interactive'] as const).map((filter) => {
          const active = selectedType === filter;
          return (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? themeColors.primaryLight : themeColors.surface,
                  borderColor: active ? themeColors.primary : themeColors.border,
                },
              ]}
              onPress={() => setSelectedType(filter)}
              activeOpacity={0.85}
            >
              <Text
                variant="body"
                style={{
                  color: active ? themeColors.primary : themeColors.textSecondary,
                  fontWeight: active ? '600' : '400',
                }}
              >
                {filter === 'all'
                  ? 'All types'
                  : `${filter.charAt(0).toUpperCase()}${filter.slice(1)}`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={{ padding: spacing[4], gap: spacing[3] }}>
        {filteredResources.length === 0
          ? renderFavoriteEmpty()
          : filteredResources.map(renderResourceCard)}
      </View>

      <Modal
        visible={Boolean(selectedResource)}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedResource(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: themeColors.surface }]}>
            <Text variant="h3" isDark={isDark} weight="bold">
              {selectedResource?.title}
            </Text>
            <Text variant="body" color="textSecondary" isDark={isDark} style={{ marginTop: spacing[2] }}>
              {selectedResource?.summary}
            </Text>
            {selectedResource?.content && (
              <ScrollView style={{ marginTop: spacing[3], maxHeight: 240 }}>
                <Text variant="body" isDark={isDark}>
                  {selectedResource.content}
                </Text>
              </ScrollView>
            )}
            <View style={styles.modalButtons}>
              <Button
                title={selectedResource?.url ? 'Open resource' : 'External link coming soon'}
                onPress={() => selectedResource && openExternalLink(selectedResource)}
                disabled={!selectedResource?.url}
                isDark={isDark}
              />
              <Button
                title="Close"
                variant="outline"
                onPress={() => setSelectedResource(null)}
                isDark={isDark}
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
  header: {
    padding: spacing[4],
    paddingBottom: spacing[2],
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing[4],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderWidth: 1,
    borderRadius: borderRadius.lg,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing[2],
    fontSize: fontSize.base,
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
  filterChip: {
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  card: {
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: 180,
  },
  cardBody: {
    padding: spacing[3],
    gap: spacing[2],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1],
  },
  tag: {
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing[6],
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
});

export default ResourcesScreen;
