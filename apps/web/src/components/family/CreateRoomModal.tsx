import React, { useEffect, useState } from 'react';
import { RoomTemplate } from '../../types/gigs';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (roomName: string, roomTemplateId: number) => void;
  roomTemplates: RoomTemplate[];
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ isOpen, onClose, onConfirm, roomTemplates }) => {
  const [roomName, setRoomName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRoomName('');
      setSelectedTemplateId(roomTemplates[0]?.id ?? null);
    }
  }, [isOpen, roomTemplates]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (roomName && selectedTemplateId !== null) {
      onConfirm(roomName.trim(), selectedTemplateId);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Create New Room</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="roomName" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Room Name</label>
            <input
              type="text"
              id="roomName"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g., Living Room, John's Bedroom"
            />
          </div>
          <div>
            <label htmlFor="roomTemplate" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Based on Template</label>
            <select
              id="roomTemplate"
              value={selectedTemplateId ?? ''}
              onChange={(e) => setSelectedTemplateId(e.target.value ? parseInt(e.target.value, 10) : null)}
              className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={!roomTemplates.length}
            >
              <option value="" disabled>
                {roomTemplates.length ? 'Select a template' : 'No templates available'}
              </option>
              {roomTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            {!roomTemplates.length && (
              <p className="mt-1 text-sm text-red-500 dark:text-red-300">
                No room templates available. Please contact support.
              </p>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-4">
          <button onClick={onClose} className="text-neutral-600 dark:text-neutral-300">Cancel</button>
          <button
            onClick={handleConfirm}
            disabled={!roomName.trim() || selectedTemplateId === null}
            className="bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Create Room
          </button>
        </div>
      </div>
    </div>
  );
};
