import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Step, CallBackProps } from 'react-joyride';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLinZChat, LinZChatSuggestion } from './useLinZChat';
import { createDebugLogger } from '../utils/debug';
import { getLinzFacts, upsertLinzFacts } from '../api/linz';
import { useAppShellControls } from './useAppShellControls';
import { buildTourPlan } from '../tour/modules';
import type { GuidedTourStep, TourAudience, TourSuggestionTemplate, TourPlan } from '../tour/types';

export type { GuidedTourStep } from '../tour/types';

type UseOnboardingTourProps = {
  familyId: number | null;
  userId: string | null;
  audience?: TourAudience;
  offerTrigger?: boolean;
  extraSteps?: GuidedTourStep[];
};

type UseOnboardingTourResult = {
  tourState: { run: boolean; steps: Step[]; stepIndex: number };
  startTour: () => void;
  skipTour: () => void;
  handleJoyrideCallback: (data: CallBackProps) => void;
  hasSeenTour: boolean | null;
  isTourRunning: boolean;
};

const DEFAULT_TEMPLATES: Record<'default' | 'final', TourSuggestionTemplate[]> = {
  default: [
    { label: 'Next stop', action: 'tour.advance', tone: 'primary' },
    { label: 'Skip tour', action: 'tour.skip', tone: 'secondary' },
  ],
  final: [
    { label: 'Finish up', action: 'tour.finish', tone: 'primary' },
    { label: 'Start over', action: 'tour.restart', tone: 'secondary' },
  ],
};

const SUGGEST_TOUR_TEMPLATES: TourSuggestionTemplate[] = [
  { label: "Let's do it", action: 'tour.accept', tone: 'primary' },
  { label: 'Maybe later', action: 'tour.dismiss', tone: 'secondary' },
];

const makeSuggestionId = (action: string) => `${action}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const NAVIGATION_DELAY_MS = 2000;
const SIDEBAR_RETRY_DELAY_MS = 400;
const APP_SHELL_OPEN_SIDEBAR_EVENT = 'app-shell:openSidebar';
const APP_SHELL_CLOSE_SIDEBAR_EVENT = 'app-shell:closeSidebar';

const normalizeAudience = (audience?: TourAudience): TourAudience => {
  if (!audience) return 'parent';
  if (audience === 'guardian') return 'parent';
  return audience;
};

const extractSeenStatus = (raw: unknown): { seen: boolean; status?: 'completed' | 'skipped'; seenAt?: string } => {
  if (raw === true) {
    return { seen: true, status: 'completed' };
  }
  if (typeof raw === 'object' && raw !== null) {
    const value = raw as Record<string, unknown>;
    const status = typeof value.status === 'string' ? (value.status as 'completed' | 'skipped') : undefined;
    const fallback = typeof value.value === 'string' ? (value.value as 'completed' | 'skipped') : undefined;
    const resolvedStatus = status ?? fallback;
    const seenAt = typeof value.seenAt === 'string' ? value.seenAt : undefined;
    if (resolvedStatus === 'completed' || resolvedStatus === 'skipped') {
      return { seen: true, status: resolvedStatus, seenAt };
    }
  }
  return { seen: false };
};

export const useOnboardingTour = ({
  familyId,
  userId,
  audience,
  offerTrigger = false,
  extraSteps = [],
}: UseOnboardingTourProps): UseOnboardingTourResult => {
  const resolvedAudience = normalizeAudience(audience);
  const plan = useMemo<TourPlan>(() => buildTourPlan(resolvedAudience), [resolvedAudience]);
  const defaultSuggestions = useMemo(() => DEFAULT_TEMPLATES.default, []);
  const finalSuggestions = useMemo(() => DEFAULT_TEMPLATES.final, []);

  const baseSteps = useMemo<GuidedTourStep[]>(() => {
    const modules = plan.modules;
    return modules.flatMap(module =>
      module.steps.map((step, index) => ({
        ...step,
        moduleId: module.id,
        sequenceId: `${module.id}-${index}`,
        content: step.content ?? step.message,
      }))
    );
  }, [plan.modules]);

  const annotatedExtraSteps = useMemo<GuidedTourStep[]>(() =>
    extraSteps.map((step, index) => ({
      ...step,
      moduleId: step.moduleId ?? 'extra',
      sequenceId: step.sequenceId ?? `extra-${index}`,
      content: step.content ?? step.message ?? (typeof step.content === 'string' ? step.content : ''),
    })),
  [extraSteps]);

  const mergedSteps = useMemo<GuidedTourStep[]>(() => {
    if (!annotatedExtraSteps.length) {
      return baseSteps;
    }
    return [...baseSteps, ...annotatedExtraSteps];
  }, [baseSteps, annotatedExtraSteps]);

  const moduleMap = useMemo(() => {
    const map = new Map<string, { intro?: string; outro?: string; title: string }>();
    plan.modules.forEach(module => {
      map.set(module.id, { intro: module.intro, outro: module.outro, title: module.title });
    });
    return map;
  }, [plan.modules]);

  const [hasSeenTour, setHasSeenTour] = useState<boolean | null>(null);
  const [tourStatus, setTourStatus] = useState<'unknown' | 'completed' | 'skipped'>('unknown');
  const [isTourRunning, setIsTourRunning] = useState(false);
  const [tourState, setTourState] = useState<{ run: boolean; steps: Step[]; stepIndex: number }>(
    { run: false, steps: mergedSteps, stepIndex: 0 }
  );

  const lastMessagedIndexRef = useRef<number | null>(null);
  const announcedModulesRef = useRef<Set<string>>(new Set());
  const hasOfferedTourRef = useRef(false);
  const sidebarOpenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepRetryCountsRef = useRef<Record<number, number>>({});

  const controls = useAppShellControls();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    appendLinZMessage,
    openChat,
    registerActionHandler,
  } = useLinZChat();

  const tourDebug = useMemo(() => createDebugLogger('onboarding-tour'), []);

  const openSidebar = useCallback(
    (delay?: number) => {
      if (!controls) {
        tourDebug.log('openSidebar: controls unavailable, dispatching event', { delay });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent(APP_SHELL_OPEN_SIDEBAR_EVENT, {
              detail: { delay: delay ?? 0 },
            })
          );
        }
        return;
      }

      const activate = () => {
        tourDebug.log('openSidebar: activating controls');
        controls.ensureSidebarExpanded?.();
        if (controls.isMobile) {
          tourDebug.log('openSidebar: invoking openMobileMenu');
          controls.openMobileMenu?.();
        }
      };

      if (delay && delay > 0) {
        tourDebug.log('openSidebar: scheduling with delay', { delay });
        if (sidebarOpenTimeoutRef.current) {
          clearTimeout(sidebarOpenTimeoutRef.current);
        }
        sidebarOpenTimeoutRef.current = setTimeout(() => {
          activate();
          sidebarOpenTimeoutRef.current = null;
        }, delay);
      } else {
        tourDebug.log('openSidebar: immediate activation');
        activate();
      }
    },
    [controls, tourDebug]
  );

  const closeSidebar = useCallback(
    (delay?: number) => {
      if (!controls) {
        tourDebug.log('closeSidebar: controls unavailable, dispatching event', { delay });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent(APP_SHELL_CLOSE_SIDEBAR_EVENT, {
              detail: { delay: delay ?? 0 },
            })
          );
        }
        return;
      }

      const deactivate = () => {
        tourDebug.log('closeSidebar: collapsing sidebar');
        controls.setSidebarCollapsed?.(true);
        if (controls.isMobile) {
          tourDebug.log('closeSidebar: closing mobile menu');
          controls.closeMobileMenu?.();
        }
      };

      if (delay && delay > 0) {
        tourDebug.log('closeSidebar: scheduling with delay', { delay });
        if (sidebarOpenTimeoutRef.current) {
          clearTimeout(sidebarOpenTimeoutRef.current);
        }
        sidebarOpenTimeoutRef.current = setTimeout(() => {
          deactivate();
          sidebarOpenTimeoutRef.current = null;
        }, delay);
      } else {
        tourDebug.log('closeSidebar: immediate');
        deactivate();
      }
    },
    [controls, tourDebug]
  );

  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightedElementRef = useRef<HTMLElement | null>(null);

  const clearHighlight = useCallback(() => {
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }
    if (highlightRetryTimeoutRef.current) {
      clearTimeout(highlightRetryTimeoutRef.current);
      highlightRetryTimeoutRef.current = null;
    }
    if (highlightedElementRef.current) {
      highlightedElementRef.current.classList.remove('tour-highlight');
      highlightedElementRef.current = null;
    }
  }, []);

  const highlightTargetElement = useCallback((step: GuidedTourStep, attempt = 0) => {
    if (typeof document === 'undefined') return;
    if (!step?.target) return;

    let element: HTMLElement | null = null;
    if (typeof step.target === 'string') {
      const selector = step.target.trim();
      if (!selector || selector === 'body') return;
      element = document.querySelector(selector) as HTMLElement | null;
    } else if (step.target instanceof HTMLElement) {
      element = step.target;
    }

    if (element) {
      if (highlightedElementRef.current && highlightedElementRef.current !== element) {
        highlightedElementRef.current.classList.remove('tour-highlight');
      }
      highlightedElementRef.current = element;
      element.classList.add('tour-highlight');
      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    } else if (attempt < 12) {
      if (highlightRetryTimeoutRef.current) {
        clearTimeout(highlightRetryTimeoutRef.current);
      }
      highlightRetryTimeoutRef.current = setTimeout(() => {
        highlightTargetElement(step, attempt + 1);
      }, 150);
    }
  }, []);

  const scheduleHighlight = useCallback((step: GuidedTourStep, delay = 0) => {
    clearHighlight();
    if (!step?.target) return;
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
    highlightTimeoutRef.current = setTimeout(() => {
      highlightTargetElement(step);
    }, Math.max(delay, 0));
  }, [clearHighlight, highlightTargetElement]);

  const isSidebarClosed = useCallback(() => {
    if (!controls) {
      tourDebug.log('isSidebarClosed: controls unavailable');
      return true;
    }
    const state = {
      isMobile: controls.isMobile,
      isMobileMenuOpen: controls.isMobileMenuOpen,
      isSidebarCollapsed: controls.isSidebarCollapsed,
    };
    tourDebug.log('isSidebarClosed: controls state', state);
    if (controls.isMobile) {
      return !controls.isMobileMenuOpen;
    }
    return controls.isSidebarCollapsed;
  }, [controls, tourDebug]);

  const ensureStepContext = useCallback(
    (index: number) => {
      const step = mergedSteps[index];
      if (!step) return;

      const needsSidebar = step.ensureSidebar !== false;
      const reopenDelay = controls?.isMobile ? 250 : 0;
      const targetRoute = step.route ? (step.route.startsWith('/') ? step.route : '/' + step.route) : undefined;

      tourDebug.log('ensureStepContext: evaluating step context', { index, needsSidebar, route: targetRoute });

      if (needsSidebar) {
        tourDebug.log('ensureStepContext: opening sidebar for step', { index });
        openSidebar();
      } else {
        tourDebug.log('ensureStepContext: closing sidebar for step', { index });
        closeSidebar();
      }

      if (targetRoute && location.pathname !== targetRoute) {
        if (navigationTimeoutRef.current) {
          clearTimeout(navigationTimeoutRef.current);
          navigationTimeoutRef.current = null;
        }

        if (needsSidebar) {
          tourDebug.log('ensureStepContext: delaying navigation for sidebar step', { targetRoute, delay: NAVIGATION_DELAY_MS });
          navigationTimeoutRef.current = setTimeout(() => {
            tourDebug.log('ensureStepContext: navigating to route', { targetRoute });
            navigate(targetRoute);
            tourDebug.log('ensureStepContext: reopening sidebar after navigation', { reopenDelay });
            openSidebar(reopenDelay);
            scheduleHighlight(step, 200);
            navigationTimeoutRef.current = null;
          }, NAVIGATION_DELAY_MS);
        } else {
          tourDebug.log('ensureStepContext: immediate navigation for content step', { targetRoute });
          navigate(targetRoute);
          scheduleHighlight(step, 200);
        }
      } else {
        const highlightDelay = needsSidebar ? 200 : 120;
        scheduleHighlight(step, highlightDelay);
      }
    },
    [closeSidebar, controls?.isMobile, location.pathname, mergedSteps, navigate, openSidebar, scheduleHighlight, tourDebug]
  );

  const createSuggestions = useCallback((templates?: TourSuggestionTemplate[], fallback: 'default' | 'final' = 'default'): LinZChatSuggestion[] => {
    const source = templates && templates.length ? templates : fallback === 'final' ? finalSuggestions : defaultSuggestions;
    return source.map(template => ({
      id: makeSuggestionId(template.action),
      label: template.label,
      action: template.action,
      payload: template.payload,
      tone: template.tone,
    }));
  }, [defaultSuggestions, finalSuggestions]);

  const markTourStatus = useCallback(async (status: 'completed' | 'skipped') => {
    if (!familyId || !userId) return;
    try {
      await upsertLinzFacts([
        {
          familyId,
          userId,
          key: 'onboarding.tour_seen',
          value: { status, seenAt: new Date().toISOString() },
          confidence: 1,
          source: 'onboarding-tour',
        },
      ]);
      setTourStatus(status);
      setHasSeenTour(true);
    } catch (error) {
      tourDebug.error('Failed to persist tour status', error);
    }
  }, [familyId, userId, tourDebug]);

  useEffect(() => {
    let isMounted = true;

    const fetchTourStatus = async () => {
      if (!familyId || !userId) {
        if (isMounted) {
          setHasSeenTour(false);
          setTourStatus('unknown');
        }
        return;
      }

      try {
        const facts = await getLinzFacts(familyId, { userId, keys: ['onboarding.tour_seen'] });
        const seenFact = facts.find(fact => fact.key === 'onboarding.tour_seen');
        if (!isMounted) return;
        const derived = extractSeenStatus(seenFact?.value);
        setHasSeenTour(derived.seen);
        setTourStatus(derived.status ?? 'unknown');
      } catch (error) {
        tourDebug.error('Failed to fetch tour status', error);
        if (isMounted) {
          setHasSeenTour(true);
          setTourStatus('unknown');
        }
      }
    };

    void fetchTourStatus();

    return () => {
      isMounted = false;
    };
  }, [familyId, userId, tourDebug]);

  useEffect(() => {
    setTourState(prev => ({ ...prev, steps: mergedSteps }));
  }, [mergedSteps]);

  const sendModuleIntroIfNeeded = useCallback((moduleId?: string) => {
    if (!moduleId) return;
    if (announcedModulesRef.current.has(moduleId)) return;
    const moduleInfo = moduleMap.get(moduleId);
    if (!moduleInfo?.intro) return;
    announcedModulesRef.current.add(moduleId);
    appendLinZMessage(moduleInfo.intro, {
      autoOpen: true,
      suggestions: createSuggestions(undefined, 'default'),
      meta: { source: 'tour', module: moduleId, type: 'intro' },
    });
  }, [moduleMap, appendLinZMessage, createSuggestions]);

  const sendStepMessage = useCallback((index: number) => {
    const step = mergedSteps[index];
    if (!step) return;
    ensureStepContext(index);
    sendModuleIntroIfNeeded(step.moduleId);
    const message = step.message ?? (typeof step.content === 'string' ? step.content : '');
    if (!message?.trim()) return;
    const isFinalStep = index === mergedSteps.length - 1;
    const suggestions = createSuggestions(step.suggestions, isFinalStep ? 'final' : 'default');
    appendLinZMessage(message, {
      autoOpen: true,
      suggestions,
      meta: {
        source: 'tour',
        step: step.id ?? step.sequenceId ?? index,
        module: step.moduleId,
      },
    });
  }, [appendLinZMessage, createSuggestions, ensureStepContext, mergedSteps, sendModuleIntroIfNeeded]);

  const resetTourRefs = useCallback(() => {
    announcedModulesRef.current.clear();
    lastMessagedIndexRef.current = null;
    stepRetryCountsRef.current = {};
    clearHighlight();
    if (sidebarOpenTimeoutRef.current) {
      clearTimeout(sidebarOpenTimeoutRef.current);
      sidebarOpenTimeoutRef.current = null;
    }
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
      navigationTimeoutRef.current = null;
    }
  }, [clearHighlight]);

  const initializeTour = useCallback((startingIndex = 0) => {
    if (!mergedSteps.length) return;
    resetTourRefs();
    const safeIndex = Math.max(0, Math.min(startingIndex, mergedSteps.length - 1));
    setIsTourRunning(true);
    setTourState({ run: true, steps: mergedSteps, stepIndex: safeIndex });
  }, [mergedSteps, resetTourRefs]);

  const finishTour = useCallback(() => {
    if (!isTourRunning) return;
    setIsTourRunning(false);
    setTourState(prev => ({ ...prev, run: false, stepIndex: 0 }));
    resetTourRefs();
    void markTourStatus('completed');
    appendLinZMessage("That's the grand tour! Ask me anytime if you want to revisit a section.", {
      autoOpen: true,
      suggestions: createSuggestions([
        { label: 'Replay tour', action: 'tour.restart', tone: 'primary' },
        { label: 'Ask a question', action: 'chat.open', tone: 'secondary' },
      ], 'final'),
      meta: { source: 'tour', type: 'complete' },
    });
  }, [appendLinZMessage, createSuggestions, isTourRunning, markTourStatus, resetTourRefs]);

  const skipTour = useCallback(() => {
    if (isTourRunning) {
      setIsTourRunning(false);
      setTourState(prev => ({ ...prev, run: false, stepIndex: 0 }));
    }
    resetTourRefs();
    void markTourStatus('skipped');
    appendLinZMessage("No problem! I'll be here if you want the walkthrough later.", {
      autoOpen: true,
      suggestions: createSuggestions([
        { label: 'Start the tour', action: 'tour.restart', tone: 'primary' },
      ], 'default'),
      meta: { source: 'tour', type: 'skipped' },
    });
  }, [appendLinZMessage, createSuggestions, isTourRunning, markTourStatus, resetTourRefs]);

  const startTour = useCallback(() => {
    initializeTour(0);
  }, [initializeTour]);

  const advanceStep = useCallback(() => {
    const nextIndex = tourState.stepIndex + 1;
    if (nextIndex >= mergedSteps.length) {
      finishTour();
      return;
    }

    const nextStep = mergedSteps[nextIndex];
    const needsSidebar = nextStep?.ensureSidebar !== false;
    
    if (needsSidebar && isSidebarClosed()) {
      tourDebug.log('advanceStep: sidebar closed, attempting to open', { nextIndex });
      openSidebar();
      setTimeout(() => {
        tourDebug.log('advanceStep: moving to next step after sidebar open attempt', { nextIndex });
        setTourState(prev => ({ ...prev, stepIndex: nextIndex }));
      }, 500);
    } else {
      if (!needsSidebar) {
        tourDebug.log('advanceStep: closing sidebar for next step', { nextIndex });
        closeSidebar();
      }
      tourDebug.log('advanceStep: advancing immediately', { nextIndex });
      setTourState(prev => ({ ...prev, stepIndex: nextIndex }));
    }
  }, [closeSidebar, finishTour, mergedSteps, tourState.stepIndex, isSidebarClosed, openSidebar]);

  const restartTour = useCallback(() => {
    initializeTour(0);
  }, [initializeTour]);

  useEffect(() => {
    if (!tourState.run || !isTourRunning) return;
    const index = tourState.stepIndex;
    if (lastMessagedIndexRef.current === index) return;
    lastMessagedIndexRef.current = index;
    sendStepMessage(index);
  }, [tourState.run, tourState.stepIndex, isTourRunning, sendStepMessage]);

  const offerTour = useCallback(() => {
    if (hasOfferedTourRef.current) return;
    if (hasSeenTour) return;
    hasOfferedTourRef.current = true;
    openChat({ greet: false });
    appendLinZMessage(plan.welcomeMessage, {
      autoOpen: true,
      suggestions: createSuggestions(SUGGEST_TOUR_TEMPLATES, 'default'),
      meta: { source: 'tour', type: 'invite' },
    });
    if (plan.inviteMessage) {
      appendLinZMessage(plan.inviteMessage, {
        autoOpen: false,
        meta: { source: 'tour', type: 'invite-followup' },
      });
    }
  }, [appendLinZMessage, createSuggestions, hasSeenTour, openChat, plan.inviteMessage, plan.welcomeMessage]);

  useEffect(() => {
    const unsubscribes = [
      registerActionHandler('tour.accept', () => {
        hasOfferedTourRef.current = true;
        startTour();
      }),
      registerActionHandler('tour.dismiss', () => {
        hasOfferedTourRef.current = true;
        skipTour();
      }),
      registerActionHandler('tour.offer', () => {
        offerTour();
      }),
      registerActionHandler('tour.advance', () => {
        if (!isTourRunning) {
          startTour();
        } else {
          advanceStep();
        }
      }),
      registerActionHandler('tour.skip', () => {
        skipTour();
      }),
      registerActionHandler('tour.finish', () => {
        finishTour();
      }),
      registerActionHandler('tour.restart', () => {
        restartTour();
      }),
      registerActionHandler('chat.open', () => {
        openChat({ greet: true });
      }),
    ];

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [advanceStep, finishTour, isTourRunning, offerTour, registerActionHandler, restartTour, skipTour, startTour]);

  useEffect(() => {
    if (!offerTrigger) return;
    if (hasSeenTour === null) return;
    if (hasSeenTour) return;
    offerTour();
  }, [offerTrigger, hasSeenTour, offerTour]);

  useEffect(() => () => {
    setIsTourRunning(false);
    setTourState(prev => ({ ...prev, run: false, stepIndex: 0 }));
    resetTourRefs();
    clearHighlight();
  }, [clearHighlight, resetTourRefs]);

  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status, type, index, action } = data;

    tourDebug.log('handleJoyrideCallback: received event', { type, status, index, action });

    if (type === 'error:target_not_found') {
      const step = mergedSteps[index];
      const needsSidebar = step?.ensureSidebar !== false;
      const targetRoute = step?.route ? (step.route.startsWith('/') ? step.route : '/' + step.route) : undefined;
      const navigationPending = Boolean(
        navigationTimeoutRef.current &&
        targetRoute &&
        location.pathname !== targetRoute
      );

      if (navigationPending) {
        tourDebug.log('handleJoyrideCallback: navigation pending, waiting', { index, targetRoute });
        return;
      }
      const sidebarClosed = needsSidebar && isSidebarClosed();
      const retries = stepRetryCountsRef.current[index] ?? 0;
      const maxRetries = 4;
      const shouldRetry = sidebarClosed || retries < maxRetries;

      if (shouldRetry) {
        const attempt = retries + 1;
        stepRetryCountsRef.current[index] = attempt;
        const delay = sidebarClosed ? SIDEBAR_RETRY_DELAY_MS : 600;
        tourDebug.log('handleJoyrideCallback: retrying step', {
          index,
          attempt,
          sidebarClosed,
          delay,
        });
        ensureStepContext(index);
        setTimeout(() => {
          tourDebug.log('handleJoyrideCallback: re-checking step after retry delay', { index, attempt, delay });
          setTourState(prev => ({ ...prev, stepIndex: index }));
        }, delay);
        return;
      }

      delete stepRetryCountsRef.current[index];
      const nextIndex = action === 'prev' ? Math.max(0, index - 1) : Math.min(mergedSteps.length - 1, index + 1);
      tourDebug.log('handleJoyrideCallback: retries exhausted, moving on', { from: index, to: nextIndex });
      setTourState(prev => ({ ...prev, stepIndex: nextIndex }));
      return;
    }

    if (status === 'skipped') {
      tourDebug.log('handleJoyrideCallback: tour skipped');
      skipTour();
      return;
    }

    if (status === 'finished') {
      tourDebug.log('handleJoyrideCallback: tour finished');
      finishTour();
      return;
    }
  }, [ensureStepContext, finishTour, isSidebarClosed, location.pathname, mergedSteps, skipTour, tourDebug]);

  return {
    tourState,
    startTour,
    skipTour,
    handleJoyrideCallback,
    hasSeenTour,
    isTourRunning,
  };
};
