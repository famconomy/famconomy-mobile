import React, { useState, useEffect, useMemo } from 'react';
import { createDebugLogger } from "../utils/debug";
import { getGigTemplates, getFamilyGigs, getRooms, addGigToFamily, createRoom, removeFamilyGig } from '../api/gigs';
import { GigTemplate, FamilyGig, Room } from '../types/gigs';
import { useFamily } from '../hooks/useFamily';
import { Link } from 'react-router-dom';
import { SelectRoomModal } from '../components/gigs/SelectRoomModal';
import { CreateRoomModal } from '../components/gigs/CreateRoomModal';
import { Plus, Trash2 } from 'lucide-react';

export const GigsSettingsPage: React.FC = () => {
  const { family } = useFamily();
  const [templates, setTemplates] = useState<GigTemplate[]>([]);
  const [familyGigs, setFamilyGigs] = useState<FamilyGig[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSelectRoomModalOpen, setIsSelectRoomModalOpen] = useState(false);
  const [isCreateRoomModalOpen, setIsCreateRoomModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const gigsDebug = useMemo(() => createDebugLogger('gigs-settings-page'), []);

  useEffect(() => {
    if (!family) return;
    const fetchData = async () => {
      try {
        const [templatesData, familyGigsData, roomsData] = await Promise.all([
          getGigTemplates(),
          getFamilyGigs(family.FamilyID),
          getRooms(family.FamilyID),
        ]);
        setTemplates(templatesData);
        setFamilyGigs(familyGigsData);
        setRooms(roomsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [family]);

  const handleAddGigClick = (gigTemplateId: number) => {
    setSelectedTemplateId(gigTemplateId);
    setIsSelectRoomModalOpen(true);
  };

  const handleConfirmAddGig = async (roomId: number) => {
    if (!selectedTemplateId || !family) return;
    gigsDebug.log('handleConfirmAddGig: selectedTemplateId', selectedTemplateId);
    gigsDebug.log('handleConfirmAddGig: roomId', roomId);
    try {
      const newFamilyGig = await addGigToFamily(selectedTemplateId, roomId, 'daily');
      setFamilyGigs([...familyGigs, newFamilyGig]);
    } catch (error) {
      gigsDebug.error('Failed to add gig', error);
    } finally {
      setIsSelectRoomModalOpen(false);
      setSelectedTemplateId(null);
    }
  };

  const handleCreateRoom = async (name: string) => {
    if (!family) return;
    try {
      const newRoom = await createRoom(family.FamilyID, name);
      setRooms([...rooms, newRoom]);
    } catch (error) {
      gigsDebug.error('Failed to create room', error);
    } finally {
      setIsCreateRoomModalOpen(false);
    }
  };

  const handleRemoveGig = async (familyGigId: number) => {
    try {
      await removeFamilyGig(familyGigId);
      setFamilyGigs(familyGigs.filter(fg => fg.id !== familyGigId));
    } catch (error) {
      gigsDebug.error('Failed to remove gig', error);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary-600"></div></div>;
  }

  if (error) {
    return <div className="text-red-500 bg-red-100 border border-red-400 rounded-lg p-4">Error: {error}</div>;
  }

  const availableTemplates = templates.filter(
    (template) => !familyGigs.some((fg) => fg.gigTemplateId === template.id)
  );

  return (
    <div className="space-y-8 p-4 md:p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Gigs Settings</h1>
        <button
          onClick={() => setIsCreateRoomModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Create Room
        </button>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">My Gigs</h2>
        {familyGigs.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-2xl">
            <p className="text-neutral-500 dark:text-neutral-400">You haven't added any gigs yet. Add some from the list below!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {familyGigs.map((familyGig) => (
              <div key={familyGig.id} className="bg-white dark:bg-neutral-800 rounded-2xl shadow-lg overflow-hidden transition-transform hover:scale-105">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{familyGig.gigTemplate.name}</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{familyGig.familyRoom?.name ?? 'Shared Space'}</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 capitalize">{familyGig.cadenceType}</p>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-700/50 px-6 py-3 flex justify-end">
                  <button
                    onClick={() => handleRemoveGig(familyGig.id)}
                    className="text-red-500 hover:text-red-700 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Available Gigs</h2>
        {rooms.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-red-400 bg-red-50 dark:bg-red-900/20 rounded-2xl">
            <p className="text-red-600 dark:text-red-300">You need to create at least one room before you can add gigs.</p>
            <p className="text-sm text-red-500 dark:text-red-400">Click the "Create Room" button above to get started.</p>
          </div>
        ) : availableTemplates.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-2xl">
            <p className="text-neutral-500 dark:text-neutral-400">All available gigs have been added to your family.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableTemplates.map((template) => (
              <div key={template.id} className="bg-white dark:bg-neutral-800 rounded-2xl shadow-lg overflow-hidden transition-transform hover:scale-105">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{template.name}</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{template.estimatedMinutes} min</p>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-700/50 px-6 py-4 flex justify-end">
                  <button
                    onClick={() => handleAddGigClick(template.id)}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700"
                  >
                    <Plus className="h-4 w-4" />
                    Add to My Gigs
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <SelectRoomModal
        isOpen={isSelectRoomModalOpen}
        onClose={() => setIsSelectRoomModalOpen(false)}
        onConfirm={handleConfirmAddGig}
        rooms={rooms}
      />
      <CreateRoomModal
        isOpen={isCreateRoomModalOpen}
        onClose={() => setIsCreateRoomModalOpen(false)}
        onConfirm={handleCreateRoom}
      />
    </div>
  );
};
