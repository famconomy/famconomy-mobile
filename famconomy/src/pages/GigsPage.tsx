import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useFamily } from '../hooks/useFamily';
import { useAuth } from '../hooks/useAuth';
import { GigCard } from '../components/gigs/GigCard';
import { GigDetailsModal } from '../components/gigs/GigDetailsModal';
import { FamilyGig } from '../types/gigs';

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
  const gigAny = gig as any;
  const lastClaim = gig.claims?.find(
    (claim: any) => claim.userId === userId || claim.user?.UserID === userId || claim.user?.id === userId
  );

  if (!lastClaim) {
    const referenceDateRaw = gigAny.claimedAt ?? gigAny.createdAt;
    const referenceDate = referenceDateRaw ? new Date(referenceDateRaw) : now;
    const diffTime = Math.abs(now.getTime() - referenceDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }

  const lastClaimDate = new Date(lastClaim.claimedAt ?? lastClaim.createdAt ?? now);
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

export const GigsPage: React.FC = () => {
  const { family, isLoading: isFamilyLoading, error: familyError } = useFamily();
  const { user } = useAuth();
  const [gigs, setGigs] = useState<FamilyGig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedGigForDetails, setSelectedGigForDetails] = useState<FamilyGig | null>(null);

  const currentUserId = useMemo(() => {
    const idCandidate = user?.id ?? (user as any)?.UserID ?? (user as any)?.userId ?? null;
    return idCandidate ? String(idCandidate) : '';
  }, [user]);

  const sortGigsForUser = useCallback(
    (gigList: FamilyGig[]) => {
      if (!currentUserId) {
        return [...gigList];
      }

      return [...gigList].sort((a, b) => {
        const aClaimed = isGigClaimedForToday(a, currentUserId);
        const bClaimed = isGigClaimedForToday(b, currentUserId);
        if (aClaimed && !bClaimed) return -1;
        if (!aClaimed && bClaimed) return 1;

        const aOverdue = getOverdueStatus(a, currentUserId);
        const bOverdue = getOverdueStatus(b, currentUserId);
        return bOverdue - aOverdue;
      });
    },
    [currentUserId]
  );

  const applyGigUpdate = useCallback(
    (updatedGig: FamilyGig) => {
      setGigs(prev => {
        const exists = prev.some(g => g.id === updatedGig.id);
        const next = exists ? prev.map(g => (g.id === updatedGig.id ? updatedGig : g)) : [...prev, updatedGig];
        return sortGigsForUser(next);
      });
    },
    [sortGigsForUser]
  );

  useEffect(() => {
    if (!family) return;
    const fetchGigs = async () => {
      try {
        setIsLoading(true);
        const response = await apiClient.get(`/gigs?familyId=${family.FamilyID}`);
        const fetchedGigs: FamilyGig[] = response.data;
        setGigs(sortGigsForUser(fetchedGigs));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGigs();
  }, [family, sortGigsForUser]);

  const handleDetailsClick = (gig: FamilyGig) => {
    setSelectedGigForDetails(gig);
    setShowDetailsModal(true);
  };

  const handleGigStatusChange = useCallback(
    (updatedGig: FamilyGig, _status: 'claimed' | 'completed') => {
      applyGigUpdate(updatedGig);
    },
    [applyGigUpdate]
  );

  if (isFamilyLoading) {
    return <div>Loading family data...</div>;
  }

  if (familyError) {
    return <div className="text-error-500">Error loading family data: {familyError}</div>;
  }

  if (isLoading) {
    return <div>Loading gigs...</div>;
  }

  if (error) {
    return <div className="text-error-500">Error: {error}</div>;
  }

  return (
    <div id="gigs-board" className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gigs</h1>
        <Link
          id="cta-manage-gigs"
          to="/gigs/settings"
          className="bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700"
        >
          Manage Gigs
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {gigs.map(gig => (
          <GigCard
            key={gig.id}
            gig={gig}
            onDetailsClick={handleDetailsClick}
            isClaimed={currentUserId ? isGigClaimedForToday(gig, currentUserId) : false}
            overdueDays={currentUserId ? getOverdueStatus(gig, currentUserId) : 0}
            onStatusChange={handleGigStatusChange}
          />
        ))}
      </div>
      <GigDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        gig={selectedGigForDetails}
      />
    </div>
  );
};
