/**
 * useFamily.ts
 * React hook for family data management in mobile app
 * Mirrors web app useFamily hook
 */

import { useState, useEffect, useCallback } from 'react';

export interface FamilyMember {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role: 'parent' | 'guardian' | 'child' | 'admin';
  joinedAt?: number;
}

export interface Family {
  id: string;
  name: string;
  members: FamilyMember[];
  createdAt: number;
  settings?: {
    screenTimeAlertThreshold?: number;
    approvalRequired?: boolean;
  };
}

interface UseFamilyReturn {
  family: Family | null;
  families: Family[];
  activeFamilyId: string | null;
  setActiveFamilyId: (id: string) => void;
  isLoading: boolean;
  error: string | null;
  refetchFamily: () => Promise<void>;
}

export function useFamily(): UseFamilyReturn {
  const [family, setFamily] = useState<Family | null>(null);
  const [families, setFamilies] = useState<Family[]>([]);
  const [activeFamilyId, setActiveFamilyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetchFamily = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // TODO: Call API to fetch family data
      // const response = await getMyFamily(activeFamilyId);
      // setFamily(response);

      // Mock data for now
      if (!family) {
        setFamily({
          id: activeFamilyId || 'default-family',
          name: 'Johnson Family',
          members: [
            {
              id: '1',
              email: 'parent@example.com',
              firstName: 'John',
              lastName: 'Johnson',
              role: 'parent',
              joinedAt: Date.now() - 365 * 24 * 60 * 60 * 1000,
            },
          ],
          createdAt: Date.now() - 365 * 24 * 60 * 60 * 1000,
          settings: {
            screenTimeAlertThreshold: 80,
            approvalRequired: true,
          },
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load family');
    } finally {
      setIsLoading(false);
    }
  }, [activeFamilyId, family]);

  useEffect(() => {
    refetchFamily();
  }, [refetchFamily]);

  return {
    family,
    families,
    activeFamilyId,
    setActiveFamilyId,
    isLoading,
    error,
    refetchFamily,
  };
}
