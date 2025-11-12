/**
 * useFamily.ts
 * React hook for family data management in mobile app
 * Mirrors web app useFamily hook
 */

import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/apiClient';

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
  const [activeFamilyId, setActiveFamilyIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetchFamily = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Call API to fetch families for current user
      const { data } = await apiClient.get('/family');
      // Expected shape from backend: { families: [...], activeFamilyId }
      const { families: serverFamilies = [], activeFamilyId: serverActiveId } = data || {};

      // Map to local types
      const mappedFamilies: Family[] = (serverFamilies as any[]).map((f: any) => ({
        id: String(f.FamilyID ?? f.id ?? f.familyId),
        name: String(f.FamilyName ?? f.name ?? 'Family'),
        members: (f.members || f.FamilyUsers || []).map((m: any) => ({
          id: String(m.UserID ?? m.id ?? m.userId),
          email: m.Email ?? m.email ?? '',
          firstName: m.FirstName ?? m.firstName,
          lastName: m.LastName ?? m.lastName,
          avatar: m.ProfilePhotoUrl ?? m.avatar,
          role: (m.role ?? m.RoleName ?? 'child').toLowerCase(),
          joinedAt: Date.parse(m.CreatedDate ?? m.joinedAt ?? new Date().toISOString()),
        })),
        createdAt: Date.parse(f.CreatedDate ?? f.createdAt ?? new Date().toISOString()),
        settings: {
          screenTimeAlertThreshold: f.settings?.screenTimeAlertThreshold,
          approvalRequired: f.settings?.approvalRequired,
        },
      }));

  setFamilies(mappedFamilies);
  const resolvedActiveId = serverActiveId ? String(serverActiveId) : (mappedFamilies[0]?.id ?? null);
  setActiveFamilyIdState(resolvedActiveId);
  const active = mappedFamilies.find((fam) => fam.id === resolvedActiveId) || mappedFamilies[0] || null;
  setFamily(active);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load family');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Run once on mount
    refetchFamily();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setActiveFamilyId = useCallback((id: string) => {
    setActiveFamilyIdState(id);
    const active = families.find((f) => f.id === id) || null;
    setFamily(active);
  }, [families]);

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
