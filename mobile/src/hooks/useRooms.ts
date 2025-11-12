import { useCallback, useEffect, useState } from 'react';
import * as roomsApi from '../api/rooms';
import type { FamilyRoom } from '../types';

interface UseRoomsOptions {
  familyId?: number | null;
  autoFetch?: boolean;
}

interface UseRoomsReturn {
  rooms: FamilyRoom[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addRoom: (name: string) => Promise<void>;
  removeRoom: (roomId: number) => Promise<void>;
  resetRooms: () => Promise<void>;
}

export const useRooms = (options: UseRoomsOptions): UseRoomsReturn => {
  const { familyId, autoFetch = true } = options;
  const [rooms, setRooms] = useState<FamilyRoom[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canFetch = typeof familyId === 'number' && Number.isFinite(familyId);

  const fetchRooms = useCallback(async () => {
    if (!canFetch) {
      setRooms([]);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const data = await roomsApi.getRooms(familyId);
      setRooms(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load rooms.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [canFetch, familyId]);

  const addRoom = useCallback(
    async (name: string) => {
      if (!canFetch) return;
      const created = await roomsApi.createRoom({ familyId, name });
      setRooms((prev) => [created, ...prev]);
    },
    [canFetch, familyId],
  );

  const removeRoom = useCallback(async (roomId: number) => {
    if (!canFetch) return;
    await roomsApi.deleteRoom(roomId);
    setRooms((prev) => prev.filter((room) => room.id !== roomId));
  }, [canFetch]);

  const resetRooms = useCallback(async () => {
    if (!canFetch) return;
    const data = await roomsApi.resetRooms(familyId);
    setRooms(data);
  }, [canFetch, familyId]);

  useEffect(() => {
    if (autoFetch) {
      fetchRooms().catch(() => {
        // error already captured in state
      });
    } else if (!canFetch) {
      setRooms([]);
    }
  }, [autoFetch, fetchRooms, canFetch]);

  return {
    rooms,
    isLoading,
    error,
    refetch: fetchRooms,
    addRoom,
    removeRoom,
    resetRooms,
  };
};
