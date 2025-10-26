import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { BookOpen, PlayCircle, MousePointerClick, Search } from 'lucide-react-native';
import { resources, Resource, searchResources } from '../../data/resources';

export const ResourcesScreen = () => {
  const [activeTab, setActiveTab] = useState<'kids' | 'parents'>('kids');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | Resource['type']>('all');

  const filteredResources = searchQuery
    ? searchResources(searchQuery, activeTab)
    : resources.filter(r => {
        const matchesCategory = r.category === activeTab;
        const matchesType = selectedType === 'all' || r.type === selectedType;
        return matchesCategory && matchesType;
      });

  const handleResourcePress = (resource: Resource) => {
    // TODO: Navigate to ResourceDetailsScreen once created
    Alert.alert(
      resource.title,
      resource.summary + '\n\n' + (resource.content || 'Full content coming soon!'),
      [{ text: 'OK' }]
    );
  };

  const getTypeIcon = (type: Resource['type']) => {
    switch (type) {
      case 'article':
        return <BookOpen size={20} color="#3b82f6" />;
      case 'video':
        return <PlayCircle size={20} color="#10b981" />;
      case 'interactive':
        return <MousePointerClick size={20} color="#f59e0b" />;
    }
  };

  const getTypeColor = (type: Resource['type']) => {
    switch (type) {
      case 'article':
        return '#3b82f6';
      case 'video':
        return '#10b981';
      case 'interactive':
        return '#f59e0b';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Educational Resources</Text>
        <Text style={styles.headerSubtitle}>
          Learn together as a family
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#94a3b8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search resources..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#94a3b8"
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'kids' && styles.tabActive]}
          onPress={() => setActiveTab('kids')}
        >
          <Text style={[styles.tabText, activeTab === 'kids' && styles.tabTextActive]}>
            For Kids
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'parents' && styles.tabActive]}
          onPress={() => setActiveTab('parents')}
        >
          <Text style={[styles.tabText, activeTab === 'parents' && styles.tabTextActive]}>
            For Parents
          </Text>
        </TouchableOpacity>
      </View>

      {/* Type Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.typeFilter}
        contentContainerStyle={styles.typeFilterContent}
      >
        <TouchableOpacity
          style={[styles.typeFilterButton, selectedType === 'all' && styles.typeFilterButtonActive]}
          onPress={() => setSelectedType('all')}
        >
          <Text style={[styles.typeFilterText, selectedType === 'all' && styles.typeFilterTextActive]}>
            All Types
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeFilterButton, selectedType === 'article' && styles.typeFilterButtonActive]}
          onPress={() => setSelectedType('article')}
        >
          <BookOpen size={16} color={selectedType === 'article' ? '#fff' : '#3b82f6'} />
          <Text style={[styles.typeFilterText, selectedType === 'article' && styles.typeFilterTextActive]}>
            Articles
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeFilterButton, selectedType === 'video' && styles.typeFilterButtonActive]}
          onPress={() => setSelectedType('video')}
        >
          <PlayCircle size={16} color={selectedType === 'video' ? '#fff' : '#10b981'} />
          <Text style={[styles.typeFilterText, selectedType === 'video' && styles.typeFilterTextActive]}>
            Videos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeFilterButton, selectedType === 'interactive' && styles.typeFilterButtonActive]}
          onPress={() => setSelectedType('interactive')}
        >
          <MousePointerClick size={16} color={selectedType === 'interactive' ? '#fff' : '#f59e0b'} />
          <Text style={[styles.typeFilterText, selectedType === 'interactive' && styles.typeFilterTextActive]}>
            Interactive
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Resources List */}
      <ScrollView style={styles.content}>
        {filteredResources.length === 0 ? (
          <View style={styles.emptyState}>
            <BookOpen size={48} color="#94a3b8" />
            <Text style={styles.emptyStateText}>No resources found</Text>
            <Text style={styles.emptyStateSubtext}>
              Try a different search or filter
            </Text>
          </View>
        ) : (
          <View style={styles.resourcesList}>
            {filteredResources.map((resource) => (
              <TouchableOpacity
                key={resource.id}
                style={styles.resourceCard}
                onPress={() => handleResourcePress(resource)}
              >
                <Image
                  source={{ uri: resource.thumbnail }}
                  style={styles.resourceImage}
                  resizeMode="cover"
                />
                <View style={styles.resourceContent}>
                  <View style={styles.resourceHeader}>
                    {getTypeIcon(resource.type)}
                    <Text style={[styles.resourceType, { color: getTypeColor(resource.type) }]}>
                      {resource.type.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.resourceTitle}>{resource.title}</Text>
                  <Text style={styles.resourceSummary} numberOfLines={2}>
                    {resource.summary}
                  </Text>
                  <View style={styles.resourceTags}>
                    {resource.tags.slice(0, 3).map((tag) => (
                      <View key={tag} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
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
    borderBottomColor: '#8b5cf6',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#8b5cf6',
  },
  typeFilter: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  typeFilterContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  typeFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    marginRight: 8,
  },
  typeFilterButtonActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  typeFilterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  typeFilterTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
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
  resourcesList: {
    padding: 16,
  },
  resourceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  resourceImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#e2e8f0',
  },
  resourceContent: {
    padding: 16,
  },
  resourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  resourceType: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  resourceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  resourceSummary: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 12,
  },
  resourceTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: '#64748b',
  },
});

export default ResourcesScreen;
