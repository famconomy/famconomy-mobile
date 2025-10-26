import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import {
  Briefcase,
  Clock,
  Star,
  DollarSign,
  MapPin,
  Calendar,
  CheckCircle,
  XCircle,
  ArrowLeft,
} from 'lucide-react-native';
import { FamilyGig, claimGig, completeGig, unclaimGig } from '../../api/gigs';

type GigDetailsRouteProp = RouteProp<
  { GigDetails: { gigId: number; gig: FamilyGig } },
  'GigDetails'
>;

const GigDetailsScreen: React.FC = () => {
  const route = useRoute<GigDetailsRouteProp>();
  const navigation = useNavigation();
  const [gig, setGig] = useState<FamilyGig>(route.params.gig);
  const [isLoading, setIsLoading] = useState(false);

  const handleClaim = useCallback(async () => {
    setIsLoading(true);
    try {
      const updatedGig = await claimGig(gig.id);
      setGig(updatedGig);
      Alert.alert('Success', 'You have claimed this gig!');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to claim gig');
    } finally {
      setIsLoading(false);
    }
  }, [gig.id]);

  const handleComplete = useCallback(async () => {
    setIsLoading(true);
    try {
      const updatedGig = await completeGig(gig.id);
      setGig(updatedGig);
      Alert.alert('Success', 'Gig marked as complete!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to complete gig');
    } finally {
      setIsLoading(false);
    }
  }, [gig.id, navigation]);

  const handleUnclaim = useCallback(async () => {
    setIsLoading(true);
    try {
      const updatedGig = await unclaimGig(gig.id);
      setGig(updatedGig);
      Alert.alert('Success', 'You have unclaimed this gig');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to unclaim gig');
    } finally {
      setIsLoading(false);
    }
  }, [gig.id]);

  const reward = gig.overridePoints || 10;
  const currencyReward = gig.overrideCurrencyCents
    ? `$${(gig.overrideCurrencyCents / 100).toFixed(2)}`
    : null;
  const screenTimeReward = gig.overrideScreenMinutes
    ? `${gig.overrideScreenMinutes} min`
    : null;

  const hasClaim = gig.claims && gig.claims.length > 0;
  const lastClaim = hasClaim ? gig.claims[gig.claims.length - 1] : null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gig Details</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Title */}
        <View style={styles.titleSection}>
          <Briefcase size={32} color="#6366f1" />
          <Text style={styles.title}>{gig.gigTemplate.name}</Text>
        </View>

        {/* Key Info Cards */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Clock size={20} color="#6b7280" />
            <Text style={styles.infoLabel}>Duration</Text>
            <Text style={styles.infoValue}>
              {gig.gigTemplate.estimatedMinutes} min
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Star size={20} color="#f59e0b" />
            <Text style={styles.infoLabel}>Points</Text>
            <Text style={styles.infoValue}>{reward}</Text>
          </View>

          {currencyReward && (
            <View style={styles.infoCard}>
              <DollarSign size={20} color="#10b981" />
              <Text style={styles.infoLabel}>Reward</Text>
              <Text style={styles.infoValue}>{currencyReward}</Text>
            </View>
          )}

          {screenTimeReward && (
            <View style={styles.infoCard}>
              <Clock size={20} color="#8b5cf6" />
              <Text style={styles.infoLabel}>Screen Time</Text>
              <Text style={styles.infoValue}>{screenTimeReward}</Text>
            </View>
          )}
        </View>

        {/* Location */}
        {gig.familyRoom && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MapPin size={20} color="#6b7280" />
              <Text style={styles.sectionTitle}>Location</Text>
            </View>
            <Text style={styles.sectionText}>{gig.familyRoom.name}</Text>
          </View>
        )}

        {/* Cadence */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar size={20} color="#6b7280" />
            <Text style={styles.sectionTitle}>Frequency</Text>
          </View>
          <View style={styles.cadenceBadge}>
            <Text style={styles.cadenceBadgeText}>{gig.cadenceType}</Text>
          </View>
          {gig.maxPerDay && (
            <Text style={styles.sectionSubtext}>
              Max {gig.maxPerDay} per day
            </Text>
          )}
        </View>

        {/* Tags */}
        {gig.gigTemplate.applicableTags && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tags</Text>
            <Text style={styles.sectionText}>
              {gig.gigTemplate.applicableTags}
            </Text>
          </View>
        )}

        {/* Status */}
        {lastClaim && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Status</Text>
            <View style={styles.statusCard}>
              {lastClaim.status === 'completed' ? (
                <CheckCircle size={24} color="#10b981" />
              ) : (
                <Clock size={24} color="#f59e0b" />
              )}
              <View style={styles.statusInfo}>
                <Text style={styles.statusText}>
                  {lastClaim.status === 'completed' ? 'Completed' : 'In Progress'}
                </Text>
                <Text style={styles.statusSubtext}>
                  Claimed {new Date(lastClaim.claimedAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#6366f1" />
        ) : (
          <>
            {!hasClaim || lastClaim?.status === 'completed' ? (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleClaim}
              >
                <Text style={styles.primaryButtonText}>Claim Gig</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handleUnclaim}
                >
                  <XCircle size={20} color="#ef4444" />
                  <Text style={styles.secondaryButtonText}>Unclaim</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleComplete}
                >
                  <CheckCircle size={20} color="#ffffff" />
                  <Text style={styles.primaryButtonText}>Mark Complete</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  title: {
    flex: 1,
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  infoCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  sectionText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  sectionSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  cadenceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  cadenceBadgeText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  statusInfo: {
    flex: 1,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  statusSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  actionBar: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GigDetailsScreen;
