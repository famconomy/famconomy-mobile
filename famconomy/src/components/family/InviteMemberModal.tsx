import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

import { Relationship } from '../../types/family';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (email: string, relationshipId: number) => void;
  relationships: Relationship[];
  initialEmail?: string;
  initialRelationshipId?: number;
  inviteeName?: string;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  onInvite,
  relationships,
  initialEmail,
  initialRelationshipId,
  inviteeName,
}) => {
  const [email, setEmail] = useState(initialEmail ?? '');
  const [relationshipId, setRelationshipId] = useState(initialRelationshipId ?? relationships[0]?.RelationshipID ?? 0);

  useEffect(() => {
    if (isOpen) {
      setEmail(initialEmail ?? '');
      setRelationshipId(initialRelationshipId ?? relationships[0]?.RelationshipID ?? 0);
    }
  }, [isOpen, initialEmail, initialRelationshipId, relationships]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-neutral-800 rounded-2xl shadow-lg w-full max-w-lg my-8"
      >
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
          <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
            Invite Family Member
          </h3>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
          >
            &times;
          </button>
        </div>

        <div className="p-4 space-y-4">
          {inviteeName && (
            <div className="rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-200 px-3 py-2 text-sm">
              Replace the placeholder for <strong>{inviteeName}</strong> by sending them an invitation.
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
              placeholder="Enter email address"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Role
            </label>
            <select
              value={relationshipId}
              onChange={(e) => setRelationshipId(parseInt(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
            >
              {relationships.map((rel) => (
                <option key={rel.RelationshipID} value={rel.RelationshipID}>
                  {rel.RelationshipName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end p-4 border-t border-neutral-200 dark:border-neutral-700 space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl"
          >
            Cancel
          </button>
          <button
            onClick={() => onInvite(email, relationshipId)}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 dark:hover:bg-primary-400 rounded-xl"
          >
            Send Invitation
          </button>
        </div>
      </motion.div>
    </div>
  );
};
