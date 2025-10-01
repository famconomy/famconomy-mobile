import { useState, useEffect, useCallback, useRef } from 'react';
import { getMyFamily, FamilyDetails } from '../api/family';
import {
  clearStoredActiveFamilyId,
  getStoredActiveFamilyId,
  setStoredActiveFamilyId,
  subscribeToActiveFamilyChanges,
} from '../utils/activeFamilyStorage';

export const useFamily = () => {
  const [families, setFamilies] = useState<FamilyDetails[]>([]);
  const [family, setFamily] = useState<FamilyDetails | null>(null);
  const [activeFamilyId, setActiveFamilyIdState] = useState<number | null>(getStoredActiveFamilyId);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const familiesRef = useRef<FamilyDetails[]>([]);
  const suppressEventRef = useRef(false);

  const applyActiveFamily = useCallback(
    (candidateId: number | null, availableFamilies: FamilyDetails[]) => {
      if (!availableFamilies.length) {
        setActiveFamilyIdState(null);
        setFamily(null);
        try {
          suppressEventRef.current = true;
          clearStoredActiveFamilyId();
        } finally {
          suppressEventRef.current = false;
        }
        return;
      }

      let resolvedId = candidateId;
      if (resolvedId !== null && !availableFamilies.some(f => f.FamilyID === resolvedId)) {
        resolvedId = null;
      }

      if (resolvedId === null) {
        resolvedId = availableFamilies[0]?.FamilyID ?? null;
      }

      setActiveFamilyIdState(resolvedId);
      const resolvedFamily = resolvedId !== null ? availableFamilies.find(f => f.FamilyID === resolvedId) ?? null : null;
      setFamily(resolvedFamily ?? null);
      try {
        suppressEventRef.current = true;
        setStoredActiveFamilyId(resolvedId);
      } finally {
        suppressEventRef.current = false;
      }
    },
    []
  );

  const fetchFamily = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await getMyFamily();
      const fetchedFamilies = response.families ?? [];
      setFamilies(fetchedFamilies);
      familiesRef.current = fetchedFamilies;

      const storedActiveId = getStoredActiveFamilyId();
      const candidateId = storedActiveId ?? activeFamilyId ?? response.activeFamilyId ?? null;
      applyActiveFamily(candidateId, fetchedFamilies);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred while fetching family data');
      setFamilies([]);
      familiesRef.current = [];
      setFamily(null);
      setActiveFamilyIdState(null);
      try {
        suppressEventRef.current = true;
        clearStoredActiveFamilyId();
      } finally {
        suppressEventRef.current = false;
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [activeFamilyId, applyActiveFamily]);

  useEffect(() => {
    fetchFamily();
  }, [fetchFamily]);

  useEffect(() => {
    familiesRef.current = families;
  }, [families]);

  useEffect(() => {
    const unsubscribe = subscribeToActiveFamilyChanges(nextId => {
      if (suppressEventRef.current) return;
      const currentFamilies = familiesRef.current;
      if (nextId === null) {
        applyActiveFamily(null, []);
        return;
      }
      if (!currentFamilies.some(f => f.FamilyID === nextId)) {
        void fetchFamily();
        return;
      }
      applyActiveFamily(nextId, currentFamilies);
    });
    return () => {
      unsubscribe();
    };
  }, [applyActiveFamily, fetchFamily]);

  const setActiveFamilyId = useCallback(
    (nextId: number | null, options?: { families?: FamilyDetails[] }) => {
      applyActiveFamily(nextId, options?.families ?? families);
    },
    [applyActiveFamily, families]
  );

  return {
    family,
    families,
    activeFamilyId,
    setActiveFamilyId,
    isLoading,
    error,
    refetchFamily: fetchFamily,
  };
};
