import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Gift, Plus, User, Lock, Users as UsersIcon } from 'lucide-react-native';
import { fetchWishlists, WishList } from '../../api/wishlists';
import { useAuth } from '../../hooks/useAuth';
import { useFamily } from '../../hooks/useFamily';

const WishlistsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { family } = useFamily();
  const familyId = family?.id ? Number(family.id) : undefined;

  const [wishlists, setWishlists] = useState<WishList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWishlists = useCallback(async () => {
    if (!familyId) {
      setError('No family ID provided');
      setIsLoading(false);
      return;
    }

    try {
      const data = await fetchWishlists(familyId);
      setWishlists(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load wishlists');
      console.error('Error fetching wishlists:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [familyId]);

  useEffect(() => {
    loadWishlists();
  }, [loadWishlists]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadWishlists();
  }, [loadWishlists]);

  const handleWishlistPress = useCallback(
    (wishlist: WishList) => {
      // TODO: Navigate to WishlistDetailsScreen once created
      Alert.alert(wishlist.Title, `${wishlist.items?.length || 0} items`);
    },
    []
  );

  const getOwnerName = (wishlist: WishList) => {
    if (!wishlist.owner) return 'Unknown';
    const firstName = wishlist.owner.FirstName || '';
    const lastName = wishlist.owner.LastName || '';
    return `${firstName} ${lastName}`.trim() || 'Family Member';
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'LINK':
        return <Gift size={16} color="#6366f1" />;
      case 'PARENTS':
        return <Lock size={16} color="#f59e0b" />;
      default:
        return <UsersIcon size={16} color="#10b981" />;
    }
  };

  const getVisibilityLabel = (visibility: string) => {
    switch (visibility) {
      case 'LINK':
        return 'Shareable';
      case 'PARENTS':
        return 'Parents Only';
      default:
        return 'Family';
    }
  };

  const renderWishlistCard = useCallback(
    ({ item: wishlist }: { item: WishList }) => {
      const itemCount = wishlist.items?.length || 0;
      const reservedCount =
        wishlist.items?.filter((item) => item.Status === 'RESERVED').length || 0;
      const purchasedCount =
        wishlist.items?.filter((item) => item.Status === 'PURCHASED').length ||
        0;
      const ownerName = getOwnerName(wishlist);

      return (
        <TouchableOpacity
          style={styles.wishlistCard}
          onPress={() => handleWishlistPress(wishlist)}
          activeOpacity={0.7}
        >
          {/* Header */}
          <View style={styles.wishlistHeader}>
            <View style={styles.iconContainer}>
              <Gift size={28} color="#6366f1" />
            </View>
            <View style={styles.wishlistHeaderText}>
              <Text style={styles.wishlistTitle} numberOfLines={1}>
                {wishlist.Title}
              </Text>
              <View style={styles.ownerRow}>
                <User size={14} color="#6b7280" />
                <Text style={styles.ownerText}>{ownerName}</Text>
              </View>
            </View>
          </View>

          {/* Description */}
          {wishlist.Description && (
            <Text style={styles.description} numberOfLines={2}>
              {wishlist.Description}
            </Text>
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{itemCount}</Text>
              <Text style={styles.statLabel}>
                {itemCount === 1 ? 'Item' : 'Items'}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{reservedCount}</Text>
              <Text style={styles.statLabel}>Reserved</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{purchasedCount}</Text>
              <Text style={styles.statLabel}>Purchased</Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.wishlistFooter}>
            <View style={styles.visibilityBadge}>
              {getVisibilityIcon(wishlist.Visibility)}
              <Text style={styles.visibilityText}>
                {getVisibilityLabel(wishlist.Visibility)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [handleWishlistPress]
  );

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading wishlists...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadWishlists}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (wishlists.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Gift size={64} color="#9ca3af" />
        <Text style={styles.emptyTitle}>No Wishlists Yet</Text>
        <Text style={styles.emptyText}>
          Create a wishlist to track gifts and items you want!
        </Text>
        <TouchableOpacity style={styles.addButton}>
          <Plus size={20} color="#ffffff" />
          <Text style={styles.addButtonText}>Create Wishlist</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={wishlists}
        renderItem={renderWishlistCard}
        keyExtractor={(wishlist) => wishlist.WishListID.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#6366f1"
          />
        }
      />

      {/* Floating Add Button */}
      <TouchableOpacity style={styles.fab}>
        <Plus size={24} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  wishlistCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  wishlistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wishlistHeaderText: {
    flex: 1,
  },
  wishlistTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ownerText: {
    fontSize: 14,
    color: '#6b7280',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#e5e7eb',
  },
  wishlistFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  visibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
  },
  visibilityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#6366f1',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default WishlistsScreen;
