import React, { useMemo } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Joyride from 'react-joyride';

import { MainLayout } from './layout/MainLayout';
import { DashboardPage } from '../pages/DashboardPage';
import { CalendarPage } from '../pages/CalendarPage';
import { TasksPage } from '../pages/TasksPage';
import { GigsPage } from '../pages/GigsPage';
import { GigsSettingsPage } from '../pages/GigsSettingsPage';
import { MessagesPage } from '../pages/MessagesPage';
import { ShoppingPage } from '../pages/ShoppingPage';
import { BudgetPage } from '../pages/BudgetPage';
import { FamilyPage } from '../pages/FamilyPage';
import FamilyValuesPage from '../pages/FamilyValuesPage';
import { JournalPage } from '../pages/JournalPage';
import WishlistsPage from '../pages/WishlistsPage';
import { SettingsPage } from '../pages/SettingsPage';
import { ProfilePage } from '../pages/ProfilePage';
import { LoginPage } from '../pages/LoginPage';
import { JoinPage } from '../pages/JoinPage';
import { OnboardingPage } from '../pages/OnboardingPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';
import SharedWishlistPage from '../pages/SharedWishlistPage';
import SharedProfilePage from '../pages/SharedProfilePage';
import { ResourcesPage } from '../pages/ResourcesPage';
import { RecipesPage } from '../pages/RecipesPage';

import { useAuth } from '../hooks/useAuth';
import { useOnboardingTour } from '../hooks/useOnboardingTour';
import type { GuidedTourStep } from '../hooks/useOnboardingTour';
import type { TourAudience } from '../tour/types';
import { OnboardingProvider, useOnboardingContext } from '../hooks/useOnboardingContext';
import { LinZChatProvider } from '../hooks/useLinZChat';
import { useFamily } from '../hooks/useFamily';

type OnboardingContextValue = ReturnType<typeof useOnboardingContext>;
type OnboardingState = OnboardingContextValue['state'];

interface AppShellWithTourProps {
  familyId: number | null;
  userId: string | null;
  audience: TourAudience;
  offerTrigger: boolean;
  extraSteps: GuidedTourStep[];
  onboardingState: OnboardingState;
  markCompleted: () => void;
}

const AppShellWithTour: React.FC<AppShellWithTourProps> = ({
  familyId,
  userId,
  audience,
  offerTrigger,
  extraSteps,
  onboardingState,
  markCompleted,
}) => {
  const { tourState, handleJoyrideCallback, hasSeenTour } = useOnboardingTour({
    familyId,
    userId,
    audience,
    offerTrigger,
    extraSteps,
  });

  React.useEffect(() => {
    if (onboardingState.currentStep === 'committed' && hasSeenTour === true) {
      markCompleted();
    }
  }, [hasSeenTour, markCompleted, onboardingState.currentStep]);

  return (
    <>
      <Joyride
        {...tourState}
        callback={handleJoyrideCallback}
        disableOverlayClose
        disableScrollParentFix
        spotlightClicks
        spotlightPadding={14}
        tooltipComponent={() => <div style={{ display: 'none' }} />}
        locale={{
          back: '',
          close: '',
          last: '',
          next: '',
          skip: '',
        }}
        styles={{
          options: {
            zIndex: 12000,
            overlayColor: 'rgba(17, 24, 39, 0.65)',
            primaryColor: '#6366F1',
          },
          overlay: {
            mixBlendMode: 'normal',
            pointerEvents: 'auto',
          },
          spotlight: {
            borderRadius: 16,
            boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.75)',
          },
          buttonBack: { display: 'none' },
          buttonClose: { display: 'none' },
          buttonNext: { display: 'none' },
          buttonSkip: { display: 'none' },
          tooltip: { display: 'none', background: 'transparent', boxShadow: 'none' },
          tooltipContainer: { display: 'none' },
          tooltipTitle: { display: 'none' },
          tooltipContent: { display: 'none' },
          tooltipFooter: { display: 'none' },
        }}
      />
      <MainLayout />
    </>
  );
};

const ProtectedRouteWrapper: React.FC<{ children: React.ReactNode; hasExistingFamily?: boolean; isFamilyContextReady?: boolean }> = ({ children, hasExistingFamily: _hasExistingFamily = false, isFamilyContextReady = false }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const { state: onboardingState } = useOnboardingContext();
  const location = useLocation();
  const [hydrationReady, setHydrationReady] = React.useState(false);

  React.useEffect(() => {
    if (onboardingState.hydrated) {
      setHydrationReady(true);
    }
  }, [onboardingState.hydrated]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!hydrationReady || onboardingState.loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (!isFamilyContextReady) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const onboardingComplete = onboardingState.currentStep === 'committed' || onboardingState.currentStep === 'completed';
  const shouldForceOnboarding = !onboardingComplete && !_hasExistingFamily && location.pathname !== '/onboarding';

  if (shouldForceOnboarding) {
    return <Navigate to="/onboarding" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};

interface AppContentRoutesProps {
  familyId: number | null;
  hasExistingFamily: boolean;
  isFamilyContextReady: boolean;
}

const AppContentRoutes: React.FC<AppContentRoutesProps> = ({ familyId, hasExistingFamily, isFamilyContextReady }) => {
  const auth = useAuth();
  const user = auth.user;
  const isAuthenticated = auth.isAuthenticated;
  const authLoading = Boolean(auth.isLoading);
  const location = useLocation();
  const navigate = useNavigate();
  const userId = user?.id ?? (user as any)?.UserID ?? null;

  const onboarding = useOnboardingContext();
  const { state: onboardingState, markCompleted } = onboarding;

  const hasPlaceholderMembers = onboardingState.members.some(member => {
    const email = member.email?.toLowerCase();
    return !email || email.endsWith('@famc.local');
  });

  const extraTourSteps = useMemo<GuidedTourStep[]>(
    () => (hasPlaceholderMembers
      ? [{
          target: '#placeholder-members-callout',
          content: 'These placeholders were added during onboarding. Tap “Send Invitation” to replace them with real accounts.',
          ensureSidebar: false,
        }]
      : []),
    [hasPlaceholderMembers]
  );

  const resolvedAudience = useMemo<TourAudience>(() => {
    const authRole = (user as any)?.role ?? (user as any)?.Role ?? (user as any)?.UserRole;
    if (typeof authRole === 'string') {
      const normal = authRole.toLowerCase();
      if (normal.includes('child') || normal.includes('kid')) return 'child';
      if (normal.includes('guardian')) return 'guardian';
    }

    const onboardingMatch = onboardingState.members.find(member => {
      if (!member.email || !user?.email) return false;
      return member.email.toLowerCase() === user.email.toLowerCase();
    });
    const onboardingRole = onboardingMatch?.role?.toLowerCase();
    if (onboardingRole) {
      if (onboardingRole.includes('child') || onboardingRole.includes('kid')) return 'child';
      if (onboardingRole.includes('guardian')) return 'guardian';
    }

    return 'parent';
  }, [onboardingState.members, user]);

  const isAppShell = React.useMemo(() => {
    const path = location.pathname;
    return path === '/' || path === '/app' || path.startsWith('/app/');
  }, [location.pathname]);

  const shouldOfferTour = useMemo(
    () => isAppShell && ['committed', 'completed'].includes(onboardingState.currentStep),
    [isAppShell, onboardingState.currentStep]
  );

  const shouldRedirectToOnboarding = useMemo(() => {
    // Wait for both auth and family context to finish loading
    if (!isAuthenticated || authLoading) {
      console.log('🔄 Onboarding redirect: waiting for auth', { isAuthenticated, authLoading });
      return false;
    }
    if (!isAppShell) return false;
    if (!onboardingState.hydrated || onboardingState.loading) {
      console.log('🔄 Onboarding redirect: waiting for onboarding state', { 
        hydrated: onboardingState.hydrated, 
        loading: onboardingState.loading 
      });
      return false;
    }
    // Wait for family context to finish loading - this is critical to prevent race conditions
    if (!isFamilyContextReady) {
      console.log('🔄 Onboarding redirect: waiting for family context', { isFamilyContextReady });
      return false;
    }
    
    // Skip onboarding redirect if user is already on an app route - this prevents redirect loops on refresh
    if (location.pathname !== '/' && location.pathname !== '/app') {
      console.log('✅ Onboarding redirect: user on specific app route, staying', { pathname: location.pathname });
      return false;
    }
    
    // If user has an existing family, they should never be redirected to onboarding
    // This handles the case where users have families but don't have onboarding status set correctly
    if (hasExistingFamily) {
      console.log('✅ Onboarding redirect: user has existing family, staying on current page', { 
        hasExistingFamily, 
        familyId
      });
      return false;
    }
    
    const onboardingComplete = onboardingState.currentStep === 'committed' || onboardingState.currentStep === 'completed';
    if (onboardingComplete) {
      console.log('✅ Onboarding redirect: onboarding complete', { currentStep: onboardingState.currentStep });
      return false;
    }
    
    if (location.pathname.startsWith('/onboarding')) return false;
    
    console.log('⚠️ Redirecting to onboarding', {
      hasExistingFamily,
      familyId,
      onboardingStep: onboardingState.currentStep,
      pathname: location.pathname
    });
    return true;
  }, [hasExistingFamily, isAppShell, isAuthenticated, authLoading, onboardingState.currentStep, onboardingState.hydrated, onboardingState.loading, location.pathname, isFamilyContextReady, familyId]);

  React.useEffect(() => {
    if (shouldRedirectToOnboarding) {
      navigate('/onboarding', { replace: true });
    }
  }, [shouldRedirectToOnboarding, navigate]);

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/share/wishlists/:token" element={<SharedWishlistPage />} />
        <Route path="/share/profiles/:token" element={<SharedProfilePage />} />
        
        <Route
          path="/"
          element={
            <ProtectedRouteWrapper hasExistingFamily={hasExistingFamily} isFamilyContextReady={isFamilyContextReady}>
              <AppShellWithTour
                familyId={familyId}
                userId={userId}
                audience={resolvedAudience}
                offerTrigger={shouldOfferTour}
                extraSteps={extraTourSteps}
                onboardingState={onboardingState}
                markCompleted={markCompleted}
              />
            </ProtectedRouteWrapper>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="gigs" element={<GigsPage />} />
          <Route path="gigs/settings" element={<GigsSettingsPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="recipes" element={<RecipesPage />} />
          <Route path="shopping" element={<ShoppingPage />} />
          <Route path="wishlists" element={<WishlistsPage />} />
          <Route path="budget" element={<BudgetPage />} />
          <Route path="family" element={<FamilyPage />} />
          <Route path="family/values" element={<FamilyValuesPage />} />
          <Route path="journal" element={<JournalPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="resources" element={<ResourcesPage />} />
        </Route>
        <Route
          path="/app"
          element={
            <ProtectedRouteWrapper hasExistingFamily={hasExistingFamily} isFamilyContextReady={isFamilyContextReady}>
              <AppShellWithTour
                familyId={familyId}
                userId={userId}
                audience={resolvedAudience}
                offerTrigger={shouldOfferTour}
                extraSteps={extraTourSteps}
                onboardingState={onboardingState}
                markCompleted={markCompleted}
              />
            </ProtectedRouteWrapper>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="gigs" element={<GigsPage />} />
          <Route path="gigs/settings" element={<GigsSettingsPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="recipes" element={<RecipesPage />} />
          <Route path="shopping" element={<ShoppingPage />} />
          <Route path="wishlists" element={<WishlistsPage />} />
          <Route path="budget" element={<BudgetPage />} />
          <Route path="family" element={<FamilyPage />} />
          <Route path="family/values" element={<FamilyValuesPage />} />
          <Route path="journal" element={<JournalPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="resources" element={<ResourcesPage />} />
        </Route>
      </Routes>
    </>
  );
};

export const AppContent: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id ?? (user as any)?.UserID ?? null;
  const { activeFamilyId, family, families, isLoading: isFamilyLoading } = useFamily();
  const fallbackFamilyId = user?.familyId ?? (user as any)?.FamilyID ?? null;
  const effectiveFamilyId = activeFamilyId ?? family?.FamilyID ?? fallbackFamilyId ?? null;
  const hasExistingFamily = Boolean(effectiveFamilyId) || (families?.length ?? 0) > 0;
  const isFamilyContextReady = !isFamilyLoading;

  return (
    <LinZChatProvider familyId={effectiveFamilyId} userId={userId}>
      <OnboardingProvider familyId={effectiveFamilyId} userId={userId}>
        <AppContentRoutes familyId={effectiveFamilyId} hasExistingFamily={hasExistingFamily} isFamilyContextReady={isFamilyContextReady} />
      </OnboardingProvider>
    </LinZChatProvider>
  );
};
