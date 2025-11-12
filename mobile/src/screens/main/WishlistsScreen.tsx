import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  RefreshControl,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Gift,
  Plus,
  Lock,
  Users as UsersIcon,
  Link,
} from 'lucide-react-native';
import { useAppStore } from '../../store/appStore';
import { useAuth } from '../../hooks/useAuth';
import { useFamily } from '../../hooks/useFamily';
import {
  fetchWishlists,
  createWishlist,
  WishList,
  WishListVisibility,
} from '../../api/wishlists';
import { spacing, lightTheme, darkTheme, borderRadius, fontSize } from '../../theme';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Toast } from '../../components/ui/Toast';
import { Alert } from '../../components/ui/Alert';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

const VISIBILITY_OPTIONS: Array<{ value: WishListVisibility; label: string; icon: React.ReactNode }> = [
  { value: 'FAMILY', label: 'Family', icon: <UsersIcon size={16} color="#10b981" /> },
  { value: 'PARENTS', label: 'Parents only', icon: <Lock size={16} color="#f59e0b" /> },
  { value: 'LINK', label: 'Shareable', icon: <Link size={16} color="#6366f1" /> },
];

const WishlistsScreen: React.FC = () => {
  const { theme } = useAppStore();
  const { user } = useAuth();
  const { family } = useFamily();
  const familyId = family?.id ? Number(family.id) : null;

  const isDark = theme === 'dark';
  const themeColors = isDark ? darkTheme : lightTheme;

  const [wishlists, setWishlists] = useState<WishList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ownerId, setOwnerId] = useState<string | undefined>(user?.id);
  const [visibility, setVisibility] = useState<WishListVisibility>('FAMILY');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const members = family?.members ?? [];
  const canManage = useMemo(
    () => user?.role === 'parent' || user?.role === 'guardian' || user?.role === 'admin',
    [user?.role],
  );

  const loadWishlists = useCallback(async () => {
    if (!familyId) {
      setWishlists([]);
      setError(null);
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      setError(null);
      const data = await fetchWishlists(familyId);
      setWishlists(Array.isArray(data) ? data : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load wishlists.';
      setError(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [familyId]);

  useEffect(() => {
    loadWishlists().catch(() => {
      // error already captured
    });
  }, [loadWishlists]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadWishlists().catch(() => {
      // error already captured
    });
  }, [loadWishlists]);

  const formatOwnerName = useCallback((wishlist: WishList) => {
    const owner = wishlist.owner;
    if (!owner) return 'Family Member';
    const first = owner.FirstName ?? '';
    const last = owner.LastName ?? '';
    const composed = `${first} ${last}`.trim();
    return composed || 'Family Member';
  }, []);

  const countByStatus = useCallback((wishlist: WishList, status: string) => {
    if (!Array.isArray(wishlist.items)) return 0;
    return wishlist.items.filter((item) => item.Status === status).length;
  }, []);

  const totalItems = useCallback((wishlist: WishList) => wishlist.items?.length ?? 0, []);

  const handleCreateWishlist = async () => {
    if (!familyId) {
      setToast({ message: 'Join a family to create wishlists.', type: 'info' });
      return;
    }
    if (!title.trim()) {
      setToast({ message: 'Give your wishlist a title.', type: 'info' });
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createWishlist(familyId, {
        Title: title.trim(),
        Description: description.trim() || undefined,
        OwnerUserID: ownerId,
        Visibility: visibility,
      });
      setWishlists((prev) => [created, ...prev]);
      setToast({ message: 'Wishlist created', type: 'success' });
      setCreateModalOpen(false);
      setTitle('');
      setDescription('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create wishlist.';
      setToast({ message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderWishlistCard = useCallback(
    (wishlist: WishList) => {
      const itemCount = totalItems(wishlist);
      const reservedCount = countByStatus(wishlist, 'RESERVED');
      const purchasedCount = countByStatus(wishlist, 'PURCHASED');
      const ownerName = formatOwnerName(wishlist);
      const visibilityMeta = VISIBILITY_OPTIONS.find((option) => option.value === wishlist.Visibility);

      return (
        <Card key={wishlist.WishListID} isDark={isDark} style={styles.wishlistCard}>
          <View style={styles.cardHeader}>
            <View style={styles.iconBadge}>
              <Gift size={24} color="#6366f1" />
            </View>
            <View style={{ flex: 1, marginLeft: spacing[3] }}>
              <Text variant="h4" isDark={isDark} weight="bold" numberOfLines={1}>
                {wishlist.Title}
              </Text>
              <Text variant="caption" color="textSecondary" isDark={isDark} style={{ marginTop: spacing[1] }}>
                Owner · {ownerName}
              </Text>
            </View>
          </View>

          {wishlist.Description && (
            <Text variant="body" color="textSecondary" isDark={isDark} style={{ marginTop: spacing[2] }} numberOfLines={2}>
              {wishlist.Description}
            </Text>
          )}

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text variant="h3" isDark={isDark} weight="bold">
                {itemCount}
              </Text>
              <Text variant="caption" color="textSecondary" isDark={isDark}>
                {itemCount === 1 ? 'Item' : 'Items'}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="h3" isDark={isDark} weight="bold">
                {reservedCount}
              </Text>
              <Text variant="caption" color="textSecondary" isDark={isDark}>
                Reserved
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="h3" isDark={isDark} weight="bold">
                {purchasedCount}
              </Text>
              <Text variant="caption" color="textSecondary" isDark={isDark}>
                Purchased
              </Text>
            </View>
          </View>

          <View style={styles.footerRow}>
            <View
              style={[
                styles.visibilityBadge,
                {
                  backgroundColor: themeColors.surfaceVariant,
                  borderColor: themeColors.border,
                },
              ]}
            >
              {visibilityMeta?.icon}
              <Text variant="caption" color="textSecondary" isDark={isDark} style={{ marginLeft: spacing[1] }}>
                {visibilityMeta?.label ?? 'Family'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.showDetailsButton}
              onPress={() =>
                setToast({
                  message: 'Wishlist details coming soon!',
                  type: 'info',
                })
              }
            >
              <Text variant="caption" color="textSecondary" isDark={isDark}>
                View details
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
      );
    },
    [countByStatus, formatOwnerName, isDark, themeColors.border, themeColors.surfaceVariant, totalItems],
  );

  if (!familyId) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: themeColors.background }]}>
        <Card isDark={isDark} style={styles.emptyCard}>
          <Gift size={48} color={themeColors.primary} />
          <Text variant="h3" isDark={isDark} weight="bold" style={{ marginTop: spacing[2] }}>
            Join a family to view wishlists
          </Text>
          <Text variant="body" color="textSecondary" isDark={isDark} style={{ marginTop: spacing[1], textAlign: 'center' }}>
            Invite your family or accept an invitation to start sharing wishlists.
          </Text>
        </Card>
      </View>
    );
  }

  if (isLoading) {
    return <LoadingSpinner isDark={isDark} message="Loading wishlists…" />;
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={themeColors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {toast && <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />}

      <View style={styles.header}>
        <View>
          <Text variant="h2" isDark={isDark} weight="bold">
            Wishlists
          </Text>
          <Text variant="body" color="textSecondary" isDark={isDark}>
            Track gift ideas and surprises for your family.
          </Text>
        </View>
        {canManage && (
          <Button
            title="New wishlist"
            onPress={() => setCreateModalOpen(true)}
            size="small"
            isDark={isDark}

          />
        )}
      </View>

      {error && (
        <Alert
          type="warning"
          title="Unable to load wishlists"
          message={error}
          isDark={isDark}
          style={{ marginBottom: spacing[3] }}
        />
      )}

      {wishlists.length === 0 ? (
        <Card isDark={isDark} style={styles.emptyCard}>
          <Gift size={48} color={themeColors.primary} />
          <Text variant="h3" isDark={isDark} weight="bold" style={{ marginTop: spacing[2] }}>
            No wishlists yet
          </Text>
          <Text variant="body" color="textSecondary" isDark={isDark} style={{ marginTop: spacing[1], textAlign: 'center' }}>
            Create a wishlist to start tracking gift ideas and surprises.
          </Text>
          {canManage && (
            <Button
              title="Create wishlist"
              onPress={() => setCreateModalOpen(true)}
              style={{ marginTop: spacing[3] }}
              isDark={isDark}

            />
          )}
        </Card>
      ) : (
        wishlists.map(renderWishlistCard)
      )}

      <View style={{ height: spacing[8] }} />

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
            <Text variant="h3" isDark={isDark} weight="bold" style={{ marginBottom: spacing[3] }}>
              New wishlist
            </Text>
            <Input
              label="Title"
              value={title}
              onChangeText={setTitle}
              isDark={isDark}
              placeholder="Birthday ideas, Holiday gifts..."
              containerStyle={{ marginBottom: spacing[3] }}
            />
            <Input
              label="Description (optional)"
              value={description}
              onChangeText={setDescription}
              isDark={isDark}
              placeholder="Add notes about this wishlist"
              containerStyle={{ marginBottom: spacing[3] }}
            />

            {members.length > 0 && (
              <View style={{ marginBottom: spacing[3] }}>
                <Text variant="label" color="textSecondary" isDark={isDark} style={{ marginBottom: spacing[2] }}>
                  Owner
                </Text>
                <View style={styles.selectorGrid}>
                  {members.map((member) => {
                    const name = (`${member.firstName ?? ''} ${member.lastName ?? ''}`.trim() || member.email) ?? 'Family member';
                    const active = ownerId === member.id;
                    return (
                      <TouchableOpacity
                        key={member.id}
                        style={[
                          styles.selectorChip,
                          {
                            backgroundColor: active ? themeColors.primaryLight : themeColors.surfaceVariant,
                            borderColor: active ? themeColors.primary : themeColors.border,
                          },
                        ]}
                        onPress={() => setOwnerId(member.id)}
                      >
                        <Text
                          variant="body"
                          style={{
                            color: active ? themeColors.primary : themeColors.textSecondary,
                            fontWeight: active ? '600' : '400',
                          }}
                        >
                          {name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={{ marginBottom: spacing[3] }}>
              <Text variant="label" color="textSecondary" isDark={isDark} style={{ marginBottom: spacing[2] }}>
                Visibility
              </Text>
              <View style={styles.selectorGrid}>
                {VISIBILITY_OPTIONS.map((option) => {
                  const active = visibility === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.selectorChip,
                        {
                          backgroundColor: active ? themeColors.primaryLight : themeColors.surfaceVariant,
                          borderColor: active ? themeColors.primary : themeColors.border,
                        },
                      ]}
                      onPress={() => setVisibility(option.value)}
                    >
                      {option.icon}
                      <Text
                        variant="body"
                        style={{
                          color: active ? themeColors.primary : themeColors.textSecondary,
                          marginLeft: spacing[1],
                          fontWeight: active ? '600' : '400',
                        }}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => {
                  setCreateModalOpen(false);
                  setTitle('');
                  setDescription('');
                  setOwnerId(user?.id);
                  setVisibility('FAMILY');
                }}
                isDark={isDark}
                disabled={isSubmitting}
              />
              <Button
                title={isSubmitting ? 'Creating…' : 'Create'}
                onPress={handleCreateWishlist}
                isDark={isDark}
                disabled={isSubmitting}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  wishlistCard: {
    marginBottom: spacing[3],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing[3],
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[3],
  },
  visibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.base,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  showDetailsButton: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
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
  selectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  selectorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.base,
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
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

export default WishlistsScreen;
