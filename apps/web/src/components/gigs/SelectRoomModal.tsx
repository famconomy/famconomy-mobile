import React, { useState } from 'react';
import { Room } from '../../types/gigs';

interface SelectRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (roomId: number) => void;
  rooms: Room[];
}

export const SelectRoomModal: React.FC<SelectRoomModalProps> = ({ isOpen, onClose, onConfirm, rooms }) => {
  const [selectedRoom, setSelectedRoom] = useState<string>('');

  const handleConfirm = () => {
    if (selectedRoom) {
      onConfirm(parseInt(selectedRoom, 10));
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-card p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Select a Room</h2>
        <select
          value={selectedRoom}
          onChange={(e) => setSelectedRoom(e.target.value)}
          className="w-full p-2 border rounded-md bg-white dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600"
        >
          <option value="" disabled>Select a room</option>
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name}
            </option>
          ))}
        </select>
        <div className="mt-6 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="text-neutral-600 dark:text-neutral-300 px-4 py-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedRoom}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:bg-primary-300"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};