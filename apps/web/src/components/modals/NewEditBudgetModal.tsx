import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Budget, BudgetCategory } from '../../types/budget';

const categoryColors: Record<string, string> = {
  housing: 'bg-blue-100 text-blue-800',
  utilities: 'bg-yellow-100 text-yellow-800',
  groceries: 'bg-green-100 text-green-800',
  transportation: 'bg-indigo-100 text-indigo-800',
  healthcare: 'bg-red-100 text-red-800',
  education: 'bg-purple-100 text-purple-800',
  entertainment: 'bg-pink-100 text-pink-800',
  savings: 'bg-teal-100 text-teal-800',
  other: 'bg-gray-100 text-gray-800',
};

const NewEditBudgetModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Budget>) => void;
  editingBudget: Budget | null;
}> = ({ isOpen, onClose, onSave, editingBudget }) => {
  const [category, setCategory] = useState<BudgetCategory>('other');
  const [amount, setAmount] = useState('');
  const [errors, setErrors] = useState<{ category?: string; amount?: string }>({});

  useEffect(() => {
    if (editingBudget) {
      setCategory(editingBudget.category);
      setAmount(editingBudget.amount.toString());
    } else {
      setCategory('other');
      setAmount('');
    }
  }, [editingBudget, isOpen]);

  const validate = () => {
    const newErrors: { category?: string; amount?: string } = {};
    if (!category.trim()) newErrors.category = 'Category is required.';
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) newErrors.amount = 'Amount must be a positive number.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave({
        category: category,
        amount: parseFloat(amount),
      });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">{editingBudget ? 'Edit Budget' : 'New Budget'}</h2>
            <div className="space-y-4">
              <select value={category} onChange={(e) => setCategory(e.target.value as BudgetCategory)} className="w-full p-2 border rounded">
                {Object.keys(categoryColors).map(cat => <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>)}
              </select>
              {errors.category && <p className="text-red-500 text-sm">{errors.category}</p>}
              <input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-2 border rounded" />
              {errors.amount && <p className="text-red-500 text-sm">{errors.amount}</p>}
            </div>
            <div className="flex justify-end space-x-4 mt-6">
              <button onClick={onClose} className="px-4 py-2 rounded-lg">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-primary-500 text-white rounded-lg">{editingBudget ? 'Save' : 'Create'}</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default NewEditBudgetModal;