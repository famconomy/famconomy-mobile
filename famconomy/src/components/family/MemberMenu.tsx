import React from 'react';
import { motion } from 'framer-motion';
import { User, Edit, Trash2 } from 'lucide-react';

interface MemberMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onView: () => void;
  onEdit: () => void;
  onRemove: () => void;
}

export const MemberMenu: React.FC<MemberMenuProps> = ({ isOpen, onClose, onView, onEdit, onRemove }) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute top-12 right-0 bg-white dark:bg-neutral-700 rounded-xl shadow-lg w-48 z-10"
    >
      <ul className="py-2">
        <li
          onClick={() => {
            onView();
            onClose();
          }}
          className="flex items-center px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600 cursor-pointer"
        >
          <User size={16} className="mr-2" />
          View Profile
        </li>
        <li 
          onClick={onEdit}
          className="flex items-center px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600 cursor-pointer"
        >
          <Edit size={16} className="mr-2" />
          Edit Profile
        </li>
        <li 
          onClick={onRemove}
          className="flex items-center px-4 py-2 text-sm text-error-600 hover:bg-error-50 dark:hover:bg-error-900/30 cursor-pointer"
        >
          <Trash2 size={16} className="mr-2" />
          Remove from Family
        </li>
      </ul>
    </motion.div>
  );
};
