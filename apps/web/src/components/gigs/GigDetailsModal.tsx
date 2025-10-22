import React from 'react';
import { FamilyGig } from '../../types/gigs';

interface GigDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  gig: FamilyGig | null;
}

export const GigDetailsModal: React.FC<GigDetailsModalProps> = ({ isOpen, onClose, gig }) => {
  if (!isOpen || !gig) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Gig Details</h2>
        <div className="space-y-2">
          <p><strong>Name:</strong> {gig.gigTemplate.name}</p>
          <p><strong>Room:</strong> {gig.familyRoom?.name ?? 'Shared Space'}</p>
          <p><strong>Cadence:</strong> {gig.cadenceType}</p>
          {gig.gigTemplate.estimatedMinutes && (
            <p><strong>Estimated Time:</strong> {gig.gigTemplate.estimatedMinutes} min</p>
          )}
          {gig.overridePoints && (
            <p><strong>Reward Points:</strong> {gig.overridePoints}</p>
          )}
          {gig.overrideCurrencyCents && (
            <p><strong>Reward Currency:</strong> ${(gig.overrideCurrencyCents / 100).toFixed(2)}</p>
          )}
          {gig.overrideScreenMinutes && (
            <p><strong>Reward Screen Time:</strong> {gig.overrideScreenMinutes} min</p>
          )}
          {/* Add more details as needed */}
        </div>
        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
