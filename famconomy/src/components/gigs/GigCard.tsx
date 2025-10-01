import React, { useEffect, useMemo, useState } from 'react';
import { Clock, Gift } from 'lucide-react';
import { FamilyGig } from '../../types/gigs';
import { claimGig, completeGig } from '../../api/gigs';
import { useAuth } from '../../hooks/useAuth';
import { createDebugLogger } from '../../utils/debug';

interface GigCardProps {
  gig: FamilyGig;
  onDetailsClick: (gig: FamilyGig) => void;
  isClaimed: boolean;
  overdueDays: number;
  onStatusChange?: (updatedGig: FamilyGig, status: 'claimed' | 'completed') => void;
}

const getRewardValue = (gig: FamilyGig) => {
  if (gig.overridePoints) {
    return `${gig.overridePoints} points`;
  }
  if (gig.overrideCurrencyCents) {
    return `$${(gig.overrideCurrencyCents / 100).toFixed(2)}`;
  }
  if (gig.overrideScreenMinutes) {
    return `${gig.overrideScreenMinutes} min screen time`;
  }
  return 'Auto reward';
};

const resolveFirstName = (value?: string | null) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.split(/\s+/)[0];
};

const resolveUserDisplayName = (user: any) => {
  const nameCandidate =
    resolveFirstName(user?.FirstName) ??
    resolveFirstName(user?.firstName) ??
    resolveFirstName(user?.fullName) ??
    resolveFirstName(user?.displayName) ??
    resolveFirstName(user?.name);
  return nameCandidate ?? 'You';
};

export const GigCard: React.FC<GigCardProps> = ({
  gig,
  onDetailsClick,
  isClaimed,
  overdueDays,
  onStatusChange,
}) => {
  const { user } = useAuth();
  const gigsDebug = useMemo(() => createDebugLogger('gig-card'), []);

  const todayKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  }, []);

  const currentClaimFromApi = gig.claims?.find((claim: any) => claim?.periodKey === todayKey && claim?.status === 'claimed');
  const initialClaimedBy = currentClaimFromApi?.user ? resolveUserDisplayName(currentClaimFromApi.user) : undefined;

  const [localClaimed, setLocalClaimed] = useState<boolean>(Boolean(currentClaimFromApi) || isClaimed);
  const [localClaimedBy, setLocalClaimedBy] = useState<string | null>(initialClaimedBy ?? null);
  const [actionState, setActionState] = useState<'idle' | 'claiming' | 'completing'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<'success' | 'error' | 'info'>('info');

  useEffect(() => {
    setLocalClaimed(Boolean(currentClaimFromApi) || isClaimed);
    setLocalClaimedBy(initialClaimedBy ?? null);
  }, [currentClaimFromApi, initialClaimedBy, isClaimed]);

  const setSuccessMessage = (message: string) => {
    setStatusKind('success');
    setStatusMessage(message);
  };

  const setErrorMessage = (message: string) => {
    setStatusKind('error');
    setStatusMessage(message);
  };

  const handleClaim = async () => {
    if (actionState !== 'idle') return;
    try {
      setActionState('claiming');
      setStatusMessage(null);
      const claimedGig = await claimGig(gig.id);
      gigsDebug.log('Gig claimed successfully:', claimedGig);

      const updatedClaim = claimedGig.claims?.find((claim: any) => claim?.periodKey === todayKey && claim?.status === 'claimed');
      const displayName = updatedClaim?.user
        ? resolveUserDisplayName(updatedClaim.user)
        : resolveUserDisplayName(user);

      setLocalClaimed(true);
      setLocalClaimedBy(displayName);
      setSuccessMessage('Gig claimed! Mark it complete once you finish.');

      onStatusChange?.(claimedGig, 'claimed');
    } catch (error: any) {
      gigsDebug.error('Failed to claim gig:', error);
      const message = error?.response?.data?.error ?? 'Failed to claim gig. Please try again.';
      setErrorMessage(message);
    } finally {
      setActionState('idle');
    }
  };

  const handleComplete = async () => {
    if (actionState !== 'idle') return;
    try {
      setActionState('completing');
      setStatusMessage(null);
      const completedGig = await completeGig(gig.id);
      gigsDebug.log('Gig completed successfully:', completedGig);

      setLocalClaimed(false);
      setLocalClaimedBy(null);
      setSuccessMessage('Great job! Gig marked as complete.');

      onStatusChange?.(completedGig, 'completed');
    } catch (error: any) {
      gigsDebug.error('Failed to complete gig:', error);
      const message = error?.response?.data?.error ?? 'Failed to complete gig. Please try again.';
      setErrorMessage(message);
    } finally {
      setActionState('idle');
    }
  };

  const roomName = gig.familyRoom?.name ?? (gig as any)?.familyRoomName ?? gig.room?.name ?? 'Shared Space';
  const isBusy = actionState !== 'idle';

  const cardClasses = `bg-white dark:bg-neutral-800 rounded-2xl shadow-card p-6 transition-opacity ${
    localClaimed ? 'opacity-90' : ''
  } ${
    overdueDays > 0 ? (overdueDays > 7 ? 'border border-red-400 dark:border-red-600' : 'border border-amber-300 dark:border-amber-500') : ''
  }`;

  return (
    <div className={cardClasses}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{gig.gigTemplate?.name ?? 'House Gig'}</h3>
        <div className="text-xs px-2 py-1 rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
          {gig.cadenceType}
        </div>
      </div>
      <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">{roomName}</div>
      {localClaimedBy && (
        <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-2">Claimed by: {localClaimedBy}</p>
      )}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center">
          <Clock size={16} className="mr-2" />
          <span>{gig.gigTemplate?.estimatedMinutes ?? gig.estimatedMinutes ?? 0} min</span>
        </div>
        <div className="flex items-center">
          <Gift size={16} className="mr-2" />
          <span>{getRewardValue(gig)}</span>
        </div>
      </div>
      <div className="mt-6 flex gap-2">
        {localClaimed ? (
          <button
            onClick={handleComplete}
            disabled={isBusy}
            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {actionState === 'completing' ? 'Completing…' : 'Complete'}
          </button>
        ) : (
          <button
            onClick={handleClaim}
            disabled={isBusy}
            className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {actionState === 'claiming' ? 'Claiming…' : 'Claim'}
          </button>
        )}
        <button
          onClick={() => onDetailsClick(gig)}
          className="flex-1 bg-neutral-200 text-neutral-800 py-2 px-4 rounded-md hover:bg-neutral-300 dark:bg-neutral-700 dark:text-white dark:hover:bg-neutral-600"
        >
          Details
        </button>
      </div>
      {statusMessage && (
        <p
          className={`mt-3 text-sm ${statusKind === 'error' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}
        >
          {statusMessage}
        </p>
      )}
    </div>
  );
};

