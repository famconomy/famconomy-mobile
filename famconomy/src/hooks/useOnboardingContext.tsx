import React, { createContext, useContext } from 'react';
import { useOnboarding } from './useOnboarding';

type UseOnboardingReturn = ReturnType<typeof useOnboarding>;

interface OnboardingProviderProps {
  familyId: number | null;
  userId: string | null;
  children: React.ReactNode;
}

const OnboardingContext = createContext<UseOnboardingReturn | null>(null);

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ familyId, userId, children }) => {
  const onboarding = useOnboarding({ familyId, userId });
  return <OnboardingContext.Provider value={onboarding}>{children}</OnboardingContext.Provider>;
};

export const useOnboardingContext = () => {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboardingContext must be used within an OnboardingProvider');
  }
  return ctx;
};
