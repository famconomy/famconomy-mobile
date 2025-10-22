import React, { useEffect } from 'react'; // Keep React and useEffect
import { Invitation } from '../../types/family';
import { URLSearchParams } from 'url'; // Import URLSearchParams type

interface PendingInvitationsProps {
  invitations: Invitation[];
  onAccept: (token: string) => void;
  onDecline: (token: string) => void;
  searchParams: URLSearchParams; // ADDED
  setSearchParams: (params: URLSearchParams, options: { replace: boolean }) => void; // ADDED
}

export const PendingInvitations: React.FC<PendingInvitationsProps> = ({ invitations, onAccept, onDecline, searchParams, setSearchParams }) => { // ADDED searchParams and setSearchParams to destructuring

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      const matchingInvitation = invitations.find(inv => inv.Token === token);
      if (matchingInvitation) {
        onAccept(token);
        // Remove token from URL after successful processing
        setSearchParams({}, { replace: true }); // Clear all search params
      } else {
        // If token is in URL but no matching invitation, remove it
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, invitations, onAccept, setSearchParams]); // Dependencies remain the same

  if (invitations.length === 0) {
    return null;
  }

  return (
    <div className="bg-primary-100 dark:bg-primary-900/50 p-4 rounded-2xl space-y-4">
      <h3 className="text-lg font-medium text-primary-800 dark:text-primary-200">Pending Invitations</h3>
      <div className="space-y-3">
        {invitations.map((invitation) => (
          <div key={invitation.InvitationID} className="flex items-center justify-between bg-white dark:bg-neutral-800 p-3 rounded-lg">
            <div>
              <p className="font-medium text-neutral-900 dark:text-white">You have been invited to join the <span className="font-bold">{invitation.Family.FamilyName}</span> family.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => onAccept(invitation.Token)}
                className="px-3 py-1 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg"
              >
                Accept
              </button>
              <button
                onClick={() => onDecline(invitation.Token)}
                className="px-3 py-1 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg"
              >
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};