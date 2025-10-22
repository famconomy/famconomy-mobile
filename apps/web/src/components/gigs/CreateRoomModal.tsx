import React, { useState } from 'react';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [roomName, setRoomName] = useState('');

  const handleConfirm = () => {
    if (roomName) {
      onConfirm(roomName);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-card p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Create a New Room</h2>
        <input
          type="text"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          placeholder="E.g., Kitchen, Living Room"
          className="w-full p-2 border rounded-md bg-white dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600"
        />
        <div className="mt-6 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="text-neutral-600 dark:text-neutral-300 px-4 py-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!roomName}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:bg-primary-300"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
};