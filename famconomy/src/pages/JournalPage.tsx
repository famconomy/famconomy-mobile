import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Book, Search, ChevronLeft, Trash2, Smile, Meh, Frown, ChevronsUp, ChevronsDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useFamily } from '../hooks/useFamily';
import { getJournalEntries, createJournalEntry, updateJournalEntry, deleteJournalEntry } from '../api/journal';
import { JournalEntry, JournalMood, JournalTag } from '../types/journal';

const moodIcons: Record<JournalMood, React.ReactNode> = {
  happy: <Smile className="text-success-500" />,
  good: <Smile className="text-primary-500" />,
  neutral: <Meh className="text-neutral-500" />,
  sad: <Frown className="text-warning-500" />,
  stressed: <Frown className="text-error-500" />,
};

const tagColors: Record<JournalTag, { bg: string; text: string }> = {
  family: { bg: 'bg-primary-100', text: 'text-primary-800' },
  personal: { bg: 'bg-secondary-100', text: 'text-secondary-800' },
  work: { bg: 'bg-accent-100', text: 'text-accent-800' },
  health: { bg: 'bg-success-100', text: 'text-success-800' },
  goals: { bg: 'bg-warning-100', text: 'text-warning-800' },
  memories: { bg: 'bg-info-100', text: 'text-info-800' },
  gratitude: { bg: 'bg-highlight-purple/20', text: 'text-highlight-purple' },
};

export const JournalPage: React.FC = () => {
  const { user } = useAuth();
  const { family } = useFamily();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchEntries = useCallback(async () => {
    if (!family) return;
    try {
      setIsLoading(true);
      const entriesData = await getJournalEntries(family.FamilyID.toString());
      setEntries(entriesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [family]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleCreateEntry = async (title: string, isPrivate: boolean) => {
    if (!family || !user) return;
    try {
      const newEntry = await createJournalEntry({ 
        FamilyID: family.FamilyID,
        Title: title,
        EntryText: '',
        IsPrivate: isPrivate,
        CreatedByUserID: user.id
      } as any);
      await fetchEntries();
      setSelectedEntry(newEntry);
      setShowNewEntryModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create entry');
    }
  };

  const handleUpdateEntry = async (id: number, data: Partial<JournalEntry>) => {
    try {
      await updateJournalEntry(id.toString(), data);
      fetchEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update entry');
    }
  };

  const handleDeleteEntry = async (id: number) => {
    try {
      await deleteJournalEntry(id.toString());
      fetchEntries();
      setSelectedEntry(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete entry');
    }
  };

  if (isLoading) return <div>Loading journal entries...</div>;
  if (error) return <div className="text-error-500">Error: {error}</div>;

  return (
    <div
      id="journal-board"
      className={`h-full flex ${isFullScreen ? 'fixed inset-0 z-50 bg-white dark:bg-neutral-800' : 'bg-white dark:bg-neutral-800 rounded-2xl shadow-card'}`}
    >
      <div className={`${isMobile && selectedEntry && !isFullScreen ? 'hidden' : 'w-full lg:w-1/3'} ${isFullScreen && selectedEntry ? 'hidden lg:flex' : 'flex'} flex-col border-r border-neutral-200 dark:border-neutral-700`}>
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Journal Entries</h2>
          <button 
            onClick={() => setShowNewEntryModal(true)}
            className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400"
          >
            <Plus size={20} />
          </button>
        </div>
        <div className="p-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input 
              type="text"
              placeholder="Search entries..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {entries.map(entry => (
            <div 
              key={entry.EntryID}
              onClick={() => setSelectedEntry(entry)}
              className={`px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 cursor-pointer ${
                selectedEntry?.EntryID === entry.EntryID ? 'bg-primary-50 dark:bg-primary-900/30' : 'hover:bg-neutral-50 dark:hover:bg-neutral-700/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-neutral-900 dark:text-white">{entry.Title}</h3>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">{new Date(entry.CreatedAt).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                {entry.EntryText || 'No content'}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className={`${isMobile && !selectedEntry ? 'hidden' : 'w-full lg:w-2/3'} ${isFullScreen ? 'w-full' : 'lg:w-2/3'} flex flex-col`}>
        {selectedEntry ? (
          <div className="flex-1 flex flex-col h-full">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => { setSelectedEntry(null); setIsFullScreen(false); }}
                  className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 lg:hidden"
                >
                  <ChevronLeft size={18} />
                </button>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">{selectedEntry.Title}</h2>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsFullScreen(!isFullScreen)}
                  className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400"
                >
                  {isFullScreen ? <ChevronsDown size={18} /> : <ChevronsUp size={18} />}
                </button>
                <button 
                  onClick={() => handleDeleteEntry(selectedEntry.EntryID)}
                  className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              <textarea 
                value={selectedEntry.EntryText}
                onChange={(e) => setSelectedEntry({ ...selectedEntry, EntryText: e.target.value })}
                onBlur={() => handleUpdateEntry(selectedEntry.EntryID, { EntryText: selectedEntry.EntryText })}
                className="w-full h-full bg-transparent text-neutral-800 dark:text-neutral-200 focus:outline-none resize-none"
              />
            </div>
          </div>
        ) : (
          <div className={`${isMobile ? 'hidden' : 'flex'} flex-1 items-center justify-center text-center`}>
            <div>
              <Book size={48} className="mx-auto text-neutral-300 dark:text-neutral-600" />
              <h3 className="mt-4 text-lg font-medium text-neutral-900 dark:text-white">Select an entry</h3>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Choose an entry from the list to view or edit it, or create a new one.</p>
            </div>
          </div>
        )}
      </div>

      <NewEntryModal 
        isOpen={showNewEntryModal}
        onClose={() => setShowNewEntryModal(false)}
        onCreate={handleCreateEntry}
      />
    </div>
  );
};

interface NewEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, isPrivate: boolean) => void;
}

const NewEntryModal: React.FC<NewEntryModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [title, setTitle] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const handleCreate = () => {
    onCreate(title, isPrivate);
    setTitle('');
    setIsPrivate(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-neutral-800 rounded-2xl shadow-lg max-w-lg w-full"
        >
          <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
            <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
              New Journal Entry
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
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter a title for your entry"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="rounded border-neutral-300 dark:border-neutral-600 text-primary-500 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-neutral-700 dark:text-neutral-300">
                  Make this entry private
                </span>
              </label>
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
              onClick={handleCreate}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 dark:hover:bg-primary-400 rounded-xl"
            >
              Create Entry
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
