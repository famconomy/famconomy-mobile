import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlaidAccount } from '../../types/budget';

const EditAccountNameModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (customName: string) => void;
  account: PlaidAccount | null;
}> = ({ isOpen, onClose, onSave, account }) => {
  const [name, setName] = useState('');

  useEffect(() => {
    if (account) {
      setName(account.customName || account.name);
    }
  }, [account, isOpen]);

  const handleSave = () => {
    onSave(name);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Edit Account Name</h2>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border rounded" />
            <div className="flex justify-end space-x-4 mt-6">
              <button onClick={onClose} className="px-4 py-2 rounded-lg">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-primary-500 text-white rounded-lg">Save</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default EditAccountNameModal;