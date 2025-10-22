import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ConfirmationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}> = ({ isOpen, onClose, onConfirm, title, message }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">{title}</h2>
            <p>{message}</p>
            <div className="flex justify-end space-x-4 mt-6">
              <button onClick={onClose} className="px-4 py-2 rounded-lg">Cancel</button>
              <button onClick={onConfirm} className="px-4 py-2 bg-red-500 text-white rounded-lg">Confirm</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmationModal;