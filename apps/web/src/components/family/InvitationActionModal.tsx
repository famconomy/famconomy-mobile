import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { User } from '../types/family'; // Assuming User type is available here
import apiClient from '../../api/apiClient'; // Import apiClient
import { createDebugLogger } from '../../utils/debug';

interface InvitationActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  onAccept: (token: string) => void;
  onDecline: (token: string) => void;
  setSearchParams: (params: URLSearchParams, options: { replace: boolean }) => void;
  currentUser: User | null; // Add currentUser prop
}

export const InvitationActionModal: React.FC<InvitationActionModalProps> = ({
  isOpen,
  onClose,
  token,
  onAccept,
  onDecline,
  setSearchParams,
  currentUser, // Destructure currentUser
}) => {
  const [invitationDetails, setInvitationDetails] = useState<{ familyName: string; inviterName: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
const invitationDebug = useMemo(() => createDebugLogger('invitation-modal'), []);

  invitationDebug.log('InvitationActionModal: isOpen', isOpen);
  invitationDebug.log('InvitationActionModal: token', token);

  useEffect(() => {
    const fetchInvitationDetails = async () => {
      if (!token) {
        setLoading(false);
        setError('No invitation token provided.');
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.get(`/invitations/details?token=${token}`);
        setInvitationDetails(response.data);
      } catch (err: any) {
        invitationDebug.error('Error fetching invitation details:', err);
        setError(err.response?.data?.message || 'Failed to fetch invitation details.');
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) { // Only fetch when the modal is open
      fetchInvitationDetails();
    }
  }, [token, isOpen, invitationDebug]); // Re-run when token or isOpen changes

  if (!isOpen) {
    invitationDebug.log('InvitationActionModal: Not rendering because isOpen is false');
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && ( // This check is redundant if we return null above, but good for clarity
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-neutral-800 rounded-2xl shadow-lg w-full max-w-md"
          >
            <div className="p-6 text-center">
              <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-4">
                {loading ? 'Loading invitation details...' :
                 error ? `Error: ${error}` :
                 invitationDetails ? `You've been invited to join ${invitationDetails.familyName} by ${invitationDetails.inviterName}!` :
                 'You have a pending family invitation!'}
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
                {loading ? '' :
                 error ? '' :
                 invitationDetails ? 'Would you like to accept or decline this invitation?' :
                 'Would you like to accept or decline this invitation?'}
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => {
                    onDecline(token);
                    onClose();
                    setSearchParams({}, { replace: true }); // Clear search params on action
                  }}
                  className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl"
                >
                  Decline
                </button>
                <button
                  onClick={() => {
                    onAccept(token);
                    onClose();
                    setSearchParams({}, { replace: true }); // Clear search params on action
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-xl"
                >
                  Accept
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};