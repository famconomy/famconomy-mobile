import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User } from '../../types/family';
import { Relationship } from '../../types/family';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: {
    userData: Partial<User>;
    relationshipId: number | null;
    permissions: string[];
  }) => void;
  user: User;
  relationships: Relationship[];
  availablePermissions?: { id: string; label: string; description?: string }[];
  currentPermissions?: string[];
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  onSave,
  user,
  relationships,
  availablePermissions = [],
  currentPermissions = [],
}) => {
  const [firstName, setFirstName] = useState(user.FirstName);
  const [lastName, setLastName] = useState(user.LastName);
  const [email, setEmail] = useState(user.Email);
  const [birthDate, setBirthDate] = useState(user.BirthDate ? new Date(user.BirthDate).toISOString().split('T')[0] : '');
  const [relationshipId, setRelationshipId] = useState<number | null>(user.RelationshipID ?? null);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [permissions, setPermissions] = useState<string[]>(currentPermissions);

  useEffect(() => {
    setFirstName(user.FirstName);
    setLastName(user.LastName);
    setEmail(user.Email);
    setBirthDate(user.BirthDate ? new Date(user.BirthDate).toISOString().split('T')[0] : '');
    setRelationshipId(user.RelationshipID ?? null);
    setPermissions(currentPermissions);
  }, [user, currentPermissions]);

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
            Edit Profile
          </h3>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
          >
            &times;
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Birth Date
            </label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Role
              </label>
              <select
                value={relationshipId ?? ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setRelationshipId(value ? parseInt(value, 10) : null);
                }}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
              >
                <option value="">Select role</option>
                {relationships.map((rel) => (
                  <option key={rel.RelationshipID} value={rel.RelationshipID}>
                    {rel.RelationshipName}
                  </option>
                ))}
              </select>
            </div>

            {availablePermissions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Permissions
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {availablePermissions.map((perm) => {
                    const checked = permissions.includes(perm.id);
                    return (
                      <label
                        key={perm.id}
                        className="flex items-start gap-3 rounded-xl border border-neutral-200 p-3 text-sm text-neutral-700 dark:border-neutral-700 dark:text-neutral-200"
                      >
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={checked}
                          onChange={() => {
                            setPermissions((prev) =>
                              prev.includes(perm.id)
                                ? prev.filter((id) => id !== perm.id)
                                : [...prev, perm.id]
                            );
                          }}
                        />
                        <span>
                          <span className="font-medium">{perm.label}</span>
                          {perm.description && (
                            <span className="block text-xs text-neutral-500 dark:text-neutral-400">{perm.description}</span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
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
            onClick={() =>
              onSave({
                userData: {
                  FirstName: firstName,
                  LastName: lastName,
                  Email: email,
                  BirthDate: birthDate || null,
                },
                relationshipId,
                permissions,
              })
            }
            className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 dark:hover:bg-primary-400 rounded-xl"
          >
            Save Changes
          </button>
        </div>
      </motion.div>
    </div>
  );
};
