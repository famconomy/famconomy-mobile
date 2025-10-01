import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Budget, Transaction, BudgetCategory } from '../../types/budget';

const NewTransactionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<Transaction>) => void;
    budgets: Budget[];
}> = ({ isOpen, onClose, onSave, budgets }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState<BudgetCategory>('other');
    const [date, setDate] = useState('');
    const [recurring, setRecurring] = useState(false);
    const [recurringPeriod, setRecurringPeriod] = useState<'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly');

    const handleSave = () => {
        onSave({
            description: description,
            amount: parseFloat(amount),
            category: category,
            date: date ? date : new Date().toISOString(),
            recurring: recurring,
            recurringPeriod: recurring ? recurringPeriod : undefined,
        });
        setDescription('');
        setAmount('');
        setCategory('other');
        setDate('');
        setRecurring(false);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-4">New Transaction</h2>
                        <div className="space-y-4">
                            <input type="text" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-2 border rounded" />
                            <input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-2 border rounded" />
                            <select value={category} onChange={(e) => setCategory(e.target.value as BudgetCategory)} className="w-full p-2 border rounded">
                                <option value="">Select Budget</option>
                                {budgets.map(b => <option key={b.id} value={b.category}>{b.category}</option>)}
                            </select>
                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-2 border rounded" />
                            <div className="flex items-center space-x-2">
                                <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} id="recurring-checkbox" />
                                <label htmlFor="recurring-checkbox">Recurring</label>
                            </div>
                            {recurring && (
                                <select value={recurringPeriod} onChange={(e) => setRecurringPeriod(e.target.value as any)} className="w-full p-2 border rounded">
                                    <option value="weekly">Weekly</option>
                                    <option value="biweekly">Bi-weekly</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="quarterly">Quarterly</option>
                                    <option value="yearly">Yearly</option>
                                </select>
                            )}
                        </div>
                        <div className="flex justify-end space-x-4 mt-6">
                            <button onClick={onClose} className="px-4 py-2 rounded-lg">Cancel</button>
                            <button onClick={handleSave} className="px-4 py-2 bg-primary-500 text-white rounded-lg">Add</button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default NewTransactionModal;