import React, { useState, useEffect } from 'react';

interface EditRoomModalProps {
  isOpen: boolean;
  initialName: string;
  onClose: () => void;
  onSave: (newName: string) => void;
}

export const EditRoomModal: React.FC<EditRoomModalProps> = ({ isOpen, initialName, onClose, onSave }) => {
  const [roomName, setRoomName] = useState(initialName);

  useEffect(() => {
    if (isOpen) {
      setRoomName(initialName);
    }
  }, [initialName, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!roomName.trim()) return;
    onSave(roomName.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg dark:bg-neutral-800">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Rename Room</h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Update how this room appears across your household.
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="roomName" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Room name
            </label>
            <input
              id="roomName"
              type="text"
              value={roomName}
              onChange={(event) => setRoomName(event.target.value)}
              className="w-full rounded-md border border-neutral-300 bg-neutral-100 px-4 py-2 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-700 dark:text-white"
              placeholder="e.g., Upstairs Loft"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditRoomModal;
