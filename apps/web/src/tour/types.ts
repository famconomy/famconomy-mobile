import { Step } from 'react-joyride';
import { LinZChatSuggestionTone } from '../hooks/useLinZChat';

export type TourAudience = 'parent' | 'guardian' | 'child' | 'other';

export interface TourSuggestionTemplate {
  label: string;
  action: string;
  payload?: Record<string, unknown>;
  tone?: LinZChatSuggestionTone;
}

export type GuidedTourStep = Step & {
  route?: string;
  ensureSidebar?: boolean;
  message?: string;
  suggestions?: TourSuggestionTemplate[];
  moduleId?: string;
  sequenceId?: string;
};

export interface TourStepDefinition extends GuidedTourStep {
  id: string;
  message: string;
  audience?: TourAudience | 'any';
}

export interface TourModuleDefinition {
  id: string;
  title: string;
  intro?: string;
  outro?: string;
  audience?: TourAudience | 'any';
  steps: TourStepDefinition[];
}

export interface TourPlan {
  welcomeMessage: string;
  inviteMessage: string;
  modules: TourModuleDefinition[];
}
