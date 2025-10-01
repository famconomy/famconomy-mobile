import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SavingsGoal } from '../../types/budget';

const NewEditSavingsGoalModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<SavingsGoal>) => void;
  editingGoal: SavingsGoal | null;
}> = ({ isOpen, onClose, onSave, editingGoal }) => {
    const [name, setName] = useState('');
    const [targetAmount, setTargetAmount] = useState('');
    const [currentAmount, setCurrentAmount] = useState('');
    const [deadline, setDeadline] = useState('');
    const [errors, setErrors] = useState<{ name?: string; target?: string; current?: string }>({});

    useEffect(() => {
        if (editingGoal) {
            setName(editingGoal.name);
            setTargetAmount(editingGoal.targetAmount.toString());
            setCurrentAmount(editingGoal.currentAmount.toString());
            setDeadline(editingGoal.deadline ? new Date(editingGoal.deadline).toISOString().split('T')[0] : '');
        } else {
            setName('');
            setTargetAmount('');
            setCurrentAmount('0');
            setDeadline('');
        }
    }, [editingGoal, isOpen]);

    const validate = () => {
        const newErrors: { name?: string; target?: string; current?: string } = {};
        if (!name.trim()) newErrors.name = 'Name is required.';
        if (isNaN(parseFloat(targetAmount)) || parseFloat(targetAmount) <= 0) newErrors.target = 'Target amount must be a positive number.';
        if (isNaN(parseFloat(currentAmount)) || parseFloat(currentAmount) < 0) newErrors.current = 'Current amount must be a non-negative number.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (validate()) {
            onSave({
                name: name,
                targetAmount: parseFloat(targetAmount),
                currentAmount: parseFloat(currentAmount),
                deadline: deadline ? deadline : undefined,
            });
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-4">{editingGoal ? 'Edit Savings Goal' : 'New Savings Goal'}</h2>
                        <div className="space-y-4">
                            <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border rounded" />
                            {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
                            <input type="number" placeholder="Target Amount" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} className="w-full p-2 border rounded" />
                            {errors.target && <p className="text-red-500 text-sm">{errors.target}</p>}
                            <input type="number" placeholder="Current Amount" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} className="w-full p-2 border rounded" />
                            {errors.current && <p className="text-red-500 text-sm">{errors.current}</p>}
                            <input type="date" placeholder="Deadline" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full p-2 border rounded" />
                        </div>
                        <div className="flex justify-end space-x-4 mt-6">
                            <button onClick={onClose} className="px-4 py-2 rounded-lg">Cancel</button>
                            <button onClick={handleSave} className="px-4 py-2 bg-primary-500 text-white rounded-lg">{editingGoal ? 'Save' : 'Create'}</button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default NewEditSavingsGoalModal;