
import React, { useState } from 'react';
import { createFamily } from '../../api/family';

interface CreateFamilyProps {
  onFamilyCreated: () => void;
}

export const CreateFamily: React.FC<CreateFamilyProps> = ({ onFamilyCreated }) => {
  const [familyName, setFamilyName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyName.trim()) {
      setError('Family name is required.');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      await createFamily(familyName);
      onFamilyCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="max-w-md w-full bg-white dark:bg-neutral-800 p-8 rounded-2xl shadow-lg">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Create Your Family Circle</h2>
        <p className="text-neutral-500 dark:text-neutral-400 mb-6">
          Start by giving your family a name. You can invite members later.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="familyName" className="sr-only">Family Name</label>
            <input
              id="familyName"
              type="text"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder="e.g., The Smiths"
              className="w-full px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={isCreating}
            />
          </div>
          {error && <p className="text-error-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full px-4 py-3 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-600 transition-colors disabled:bg-primary-300"
            disabled={isCreating}
          >
            {isCreating ? 'Creating...' : 'Create Family'}
          </button>
        </form>
      </div>
    </div>
  );
};
