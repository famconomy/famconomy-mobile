import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Family } from '../../types/family';

interface FamilySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (familyName: string, familyMantra: string) => void;
  onLeaveFamily: () => void;
  onCreateNewFamily: () => void;
  family: Family;
}

export const FamilySettingsModal: React.FC<FamilySettingsModalProps> = ({ isOpen, onClose, onSave, onLeaveFamily, onCreateNewFamily, family }) => {
  const [familyName, setFamilyName] = useState('');
  const [familyMantra, setFamilyMantra] = useState('');

  useEffect(() => {
    if (family) {
      setFamilyName(family.FamilyName);
      setFamilyMantra(family.FamilyMantra || '');
    }
  }, [family]);

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
            Family Settings
          </h3>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
          >
            &times;
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Family Name
            </label>
            <input
              type="text"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Family Mantra
            </label>
            <textarea
              rows={3}
              value={familyMantra}
              onChange={(e) => setFamilyMantra(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border-t border-neutral-200 dark:border-neutral-700 space-y-3 sm:space-y-0 sm:space-x-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
            <button
              onClick={onLeaveFamily}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl"
            >
              Leave Family
            </button>
            <button
              onClick={onCreateNewFamily}
              className="px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl"
            >
              Create Another Household
            </button>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(familyName, familyMantra)}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 dark:hover:bg-primary-400 rounded-xl"
            >
              Save Changes
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
