import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Briefcase, Clock, Star, CheckCircle, Circle } from 'lucide-react-native';
import { getFamilyGigs, claimGig, completeGig, FamilyGig } from '../../api/gigs';
import { useAuth } from '../../hooks/useAuth';
import { useFamily } from '../../hooks/useFamily';

const buildTodayKey = () => {
  const today = new Date();
  return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
};

const isGigClaimedForToday = (gig: FamilyGig, userId: string) => {
  if (!userId) return false;
  const todayKey = buildTodayKey();
  return gig.claims?.some(
    (claim: any) =>
      (claim.userId === userId || claim.user?.UserID === userId || claim.user?.id === userId) &&
      claim.periodKey === todayKey &&
      claim.status === 'claimed'
  );
};

const getOverdueStatus = (gig: FamilyGig, userId: string) => {
  const now = new Date();
  const lastClaim = gig.claims?.find(
    (claim: any) => claim.userId === userId || claim.user?.UserID === userId || claim.user?.id === userId
  );

  if (!lastClaim) {
    return 0;
  }

  const lastClaimDate = new Date(lastClaim.claimedAt ?? now);
  const diffMs = Math.abs(now.getTime() - lastClaimDate.getTime());

  switch (gig.cadenceType) {
    case 'daily':
      return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) - 1);
    case 'weekly':
      return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 7)) - 1);
    case 'monthly':
      return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 30)) - 1);
    default:
      return 0;
  }
};

const GigsScreen: React.FC = () => {
  const { user } = useAuth();
  const { family } = useFamily();
  const familyId = family?.id ? Number(family.id) : undefined;
  const userId = user?.id ? String(user.id) : '';
  const navigation = useNavigation();
  const [gigs, setGigs] = useState<FamilyGig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortGigsForUser = useCallback(
    (gigList: FamilyGig[]) => {
      if (!userId) {
        return [...gigList];
      }

      return [...gigList].sort((a, b) => {
        const aClaimed = isGigClaimedForToday(a, userId);
        const bClaimed = isGigClaimedForToday(b, userId);
        if (aClaimed && !bClaimed) return -1;
        if (!aClaimed && bClaimed) return 1;

        const aOverdue = getOverdueStatus(a, userId);
        const bOverdue = getOverdueStatus(b, userId);
        return bOverdue - aOverdue;
      });
    },
    [userId]
  );

  const fetchGigs = useCallback(async () => {
    if (!familyId) {
      setError('No family ID provided');
      setIsLoading(false);
      return;
    }

    try {
      const fetchedGigs = await getFamilyGigs(familyId);
      setGigs(sortGigsForUser(fetchedGigs));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load gigs');
      console.error('Error fetching gigs:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [familyId, sortGigsForUser]);

  useEffect(() => {
    fetchGigs();
  }, [fetchGigs]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchGigs();
  }, [fetchGigs]);

  const handleClaimGig = useCallback(
    async (gig: FamilyGig) => {
      try {
        const updatedGig = await claimGig(gig.id);
        setGigs((prev) =>
          sortGigsForUser(prev.map((g) => (g.id === gig.id ? updatedGig : g)))
        );
        Alert.alert('Success', `You claimed "${gig.gigTemplate.name}"!`);
      } catch (err) {
        Alert.alert('Error', err instanceof Error ? err.message : 'Failed to claim gig');
        console.error('Error claiming gig:', err);
      }
    },
    [sortGigsForUser]
  );

  const handleCompleteGig = useCallback(
    async (gig: FamilyGig) => {
      try {
        const updatedGig = await completeGig(gig.id);
        setGigs((prev) =>
          sortGigsForUser(prev.map((g) => (g.id === gig.id ? updatedGig : g)))
        );
        Alert.alert('Success', `You completed "${gig.gigTemplate.name}"!`);
      } catch (err) {
        Alert.alert('Error', err instanceof Error ? err.message : 'Failed to complete gig');
        console.error('Error completing gig:', err);
      }
    },
    [sortGigsForUser]
  );

  const handleGigPress = useCallback(
    (gig: FamilyGig) => {
      navigation.navigate('GigDetails', { gigId: gig.id, gig });
    },
    [navigation]
  );

  const groupedGigs = useMemo(() => {
    const grouped: { [key: string]: FamilyGig[] } = {};
    gigs.forEach((gig) => {
      const roomName = gig.familyRoom?.name || 'Unassigned';
      if (!grouped[roomName]) {
        grouped[roomName] = [];
      }
      grouped[roomName].push(gig);
    });
    return grouped;
  }, [gigs]);

  const renderGigCard = useCallback(
    ({ item: gig }: { item: FamilyGig }) => {
      const isClaimed = userId ? isGigClaimedForToday(gig, userId) : false;
      const overdueDays = userId ? getOverdueStatus(gig, userId) : 0;
      const reward = gig.overridePoints || 10; // Default to 10 points
      const estimatedMinutes = gig.gigTemplate.estimatedMinutes || 15;

      return (
        <TouchableOpacity
          style={[
            styles.gigCard,
            isClaimed && styles.gigCardClaimed,
            overdueDays > 0 && styles.gigCardOverdue,
          ]}
          onPress={() => handleGigPress(gig)}
          activeOpacity={0.7}
        >
          <View style={styles.gigCardHeader}>
            <View style={styles.gigCardTitleRow}>
              <Briefcase size={20} color="#6366f1" />
              <Text style={styles.gigTitle} numberOfLines={1}>
                {gig.gigTemplate.name}
              </Text>
            </View>
            {isClaimed ? (
              <CheckCircle size={20} color="#10b981" />
            ) : (
              <Circle size={20} color="#9ca3af" />
            )}
          </View>

          <View style={styles.gigCardInfo}>
            <View style={styles.infoRow}>
              <Clock size={16} color="#6b7280" />
              <Text style={styles.infoText}>{estimatedMinutes} min</Text>
            </View>
            <View style={styles.infoRow}>
              <Star size={16} color="#f59e0b" />
              <Text style={styles.infoText}>{reward} points</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.cadenceBadge}>{gig.cadenceType}</Text>
            </View>
          </View>

          {overdueDays > 0 && (
            <View style={styles.overdueBar}>
              <Text style={styles.overdueText}>
                {overdueDays} {overdueDays === 1 ? 'day' : 'days'} overdue
              </Text>
            </View>
          )}

          <View style={styles.gigCardActions}>
            {!isClaimed ? (
              <TouchableOpacity
                style={styles.claimButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleClaimGig(gig);
                }}
              >
                <Text style={styles.claimButtonText}>Claim</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.completeButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleCompleteGig(gig);
                }}
              >
                <Text style={styles.completeButtonText}>Mark Complete</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      );
    },
    [userId, handleGigPress, handleClaimGig, handleCompleteGig]
  );

  const renderRoomSection = useCallback(
    ({ item: roomName }: { item: string }) => {
      const roomGigs = groupedGigs[roomName];
      return (
        <View style={styles.roomSection}>
          <View style={styles.roomHeader}>
            <Text style={styles.roomTitle}>{roomName}</Text>
            <Text style={styles.roomCount}>
              {roomGigs.length} {roomGigs.length === 1 ? 'gig' : 'gigs'}
            </Text>
          </View>
          {roomGigs.map((gig) => (
            <View key={gig.id}>{renderGigCard({ item: gig })}</View>
          ))}
        </View>
      );
    },
    [groupedGigs, renderGigCard]
  );

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading gigs...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchGigs}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (gigs.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Briefcase size={64} color="#9ca3af" />
        <Text style={styles.emptyTitle}>No Gigs Yet</Text>
        <Text style={styles.emptyText}>
          Ask a parent to add gigs to your family!
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={Object.keys(groupedGigs)}
      renderItem={renderRoomSection}
      keyExtractor={(roomName) => roomName}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor="#6366f1"
        />
      }
    />
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
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
  },
  roomSection: {
    marginBottom: 24,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  roomTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  roomCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  gigCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  gigCardClaimed: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  gigCardOverdue: {
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  gigCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  gigCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  gigTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  gigCardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
  },
  cadenceBadge: {
    fontSize: 12,
    color: '#6366f1',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  overdueBar: {
    backgroundColor: '#fee2e2',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  overdueText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
    textAlign: 'center',
  },
  gigCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  claimButton: {
    flex: 1,
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  claimButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  completeButton: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GigsScreen;
