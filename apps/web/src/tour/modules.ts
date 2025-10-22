import { TourPlan, TourModuleDefinition, TourSuggestionTemplate, TourAudience } from './types';
import { GuidedTourStep } from './types';
import { TourStepDefinition } from './types';

const baseSuggestions: TourSuggestionTemplate[] = [
  { label: 'Next stop', action: 'tour.advance', tone: 'primary' },
  { label: 'Skip tour', action: 'tour.skip', tone: 'secondary' },
];

const finalizeSuggestions: TourSuggestionTemplate[] = [
  { label: 'Wrap up', action: 'tour.finish', tone: 'primary' },
  { label: 'Start over', action: 'tour.restart', tone: 'secondary' },
];

const parentModules: TourModuleDefinition[] = [
  {
    id: 'orientation',
    title: 'Getting Around',
    intro: "Let me show you how the FamConomy home base is laid out.",
    steps: [
      {
        id: 'welcome-intro',
        target: 'body',
        placement: 'center',
        disableBeacon: true,
        message: "Welcome to FamConomy! I'll point out the spots that keep your crew organized.",
        suggestions: baseSuggestions,
        ensureSidebar: false,
      },
      {
        id: 'orientation-sidebar',
        target: '#nav-dashboard',
        route: '/',
        message: 'The sidebar is your launchpad. Dashboard brings you back to home at any time.',
        suggestions: baseSuggestions,
        ensureSidebar: true,
      },
      {
        id: 'orientation-dashboard',
        target: '#dashboard-overview',
        route: '/',
        message: "Your dashboard summarizes today's wins, tasks, and quick jumps into each feature.",
        suggestions: baseSuggestions,
        ensureSidebar: false,
      },
    ],
  },
  {
    id: 'family',
    title: 'Family Setup',
    intro: "Let's make sure everyone's invited and organized.",
    steps: [
      {
        id: 'family-nav',
        target: '#nav-family',
        route: '/family',
        message: 'Head to the Family hub to invite members, assign roles, and manage households.',
        suggestions: baseSuggestions,
        ensureSidebar: true,
      },
      {
        id: 'family-members-panel',
        target: '#family-members-panel',
        route: '/family',
        message: 'This panel lists everyone in your household along with their roles and access.',
        suggestions: baseSuggestions,
        ensureSidebar: false,
      },
    ],
  },
  {
    id: 'tasks',
    title: 'Tasks & Gigs',
    intro: "Let's organize chores and rewards.",
    steps: [
      {
        id: 'tasks-nav',
        target: '#nav-tasks',
        route: '/tasks',
        message: 'Tasks keeps assignments organized by person—great for quick check-ins.',
        suggestions: baseSuggestions,
        ensureSidebar: true,
      },
      {
        id: 'tasks-board',
        target: '#tasks-board',
        route: '/tasks',
        message: 'Create, assign, and review progress here. Tap a task to edit details or approve completions.',
        suggestions: baseSuggestions,
        ensureSidebar: false,
      },
      {
        id: 'gigs-nav',
        target: '#nav-gigs',
        route: '/gigs',
        message: 'Gigs layer in cadence, rewards, and who claims each responsibility.',
        suggestions: baseSuggestions,
        ensureSidebar: true,
      },
      {
        id: 'gigs-board',
        target: '#gigs-board',
        route: '/gigs',
        message: 'Use gigs to define repeating jobs, payouts, and claim rules for your crew.',
        suggestions: baseSuggestions,
        ensureSidebar: false,
      },
    ],
  },
  {
    id: 'money',
    title: 'Finance & Shopping',
    intro: 'Time to check on the family finances and lists.',
    steps: [
      {
        id: 'budget-nav',
        target: '#nav-budget',
        route: '/budget',
        message: 'The Finance area tracks allowance, savings goals, and spending trends.',
        suggestions: baseSuggestions,
        ensureSidebar: true,
      },
      {
        id: 'budget-overview',
        target: '#budget-overview',
        route: '/budget',
        message: 'Review categories, see progress, and plan upcoming expenses here.',
        suggestions: baseSuggestions,
        ensureSidebar: false,
      },
      {
        id: 'shopping-nav',
        target: '#nav-shopping',
        route: '/shopping',
        message: 'Shopping lists keep errands in sync so nothing gets missed.',
        suggestions: baseSuggestions,
        ensureSidebar: true,
      },
      {
        id: 'shopping-lists',
        target: '#shopping-lists-panel',
        route: '/shopping',
        message: 'Create lists, assign items, and check things off together in real time.',
        suggestions: baseSuggestions,
        ensureSidebar: false,
      },
    ],
  },
  {
    id: 'planning',
    title: 'Plan & Communicate',
    intro: 'Stay aligned with schedules and conversations.',
    steps: [
      {
        id: 'calendar-nav',
        target: '#nav-calendar',
        route: '/calendar',
        message: 'The shared calendar keeps practices, appointments, and reminders lined up.',
        suggestions: baseSuggestions,
        ensureSidebar: true,
      },
      {
        id: 'calendar-board',
        target: '#calendar-board',
        route: '/calendar',
        message: 'Switch between views, add events, and approve suggestions in this workspace.',
        suggestions: baseSuggestions,
        ensureSidebar: false,
      },
      {
        id: 'messages-nav',
        target: '#nav-messages',
        route: '/messages',
        message: 'Messages gather family chats, announcements, and assistant updates in one feed.',
        suggestions: baseSuggestions,
        ensureSidebar: true,
      },
      {
        id: 'messages-thread',
        target: '#messages-thread',
        route: '/messages',
        message: 'Use threads to keep conversations tidy. Pin important chats so everyone sees them.',
        suggestions: baseSuggestions,
        ensureSidebar: false,
      },
    ],
  },
  {
    id: 'reflection',
    title: 'Journal & Feedback',
    intro: "Capture memories and share what's working.",
    steps: [
      {
        id: 'journal-nav',
        target: '#nav-journal',
        route: '/journal',
        message: 'The family journal is perfect for milestones, gratitude, and reflections.',
        suggestions: baseSuggestions,
        ensureSidebar: true,
      },
      {
        id: 'journal-board',
        target: '#journal-board',
        route: '/journal',
        message: 'Start entries, add comments, and keep private notes as needed.',
        suggestions: baseSuggestions,
        ensureSidebar: false,
      },
      {
        id: 'feedback-entry',
        target: '#sidebar-feedback',
        route: '/',
        message: 'Tap Feedback anytime to share ideas or flag bugs—everything reaches the FamConomy team.',
        suggestions: baseSuggestions,
        ensureSidebar: true,
      },
    ],
  },
  {
    id: 'assistant',
    title: 'LinZ at Your Side',
    intro: 'Last stop—your co-pilot.',
    steps: [
      {
        id: 'linz-toggle',
        target: '#linz-chat-toggle',
        route: '/',
        message: 'Ping me from this button—I can revisit parts of the tour or answer questions anytime.',
        suggestions: finalizeSuggestions,
        ensureSidebar: false,
      },
    ],
  },
];

const childModules: TourModuleDefinition[] = [
  {
    id: 'orientation-child',
    title: 'Getting Started',
    intro: "Here's what matters most for you.",
    steps: [
      {
        id: 'child-dashboard',
        target: '#nav-dashboard',
        route: '/',
        message: 'Dashboard shows your day at a glance—tasks, rewards, and quick wins.',
        suggestions: baseSuggestions,
        ensureSidebar: true,
      },
      {
        id: 'child-dashboard-widgets',
        target: '#dashboard-overview',
        route: '/',
        message: 'Jump into tasks, messages, or journal entries from these tiles.',
        suggestions: baseSuggestions,
        ensureSidebar: false,
      },
    ],
  },
  {
    id: 'child-tasks',
    title: 'Tasks & Gigs',
    intro: "Stay on top of what's assigned to you.",
    steps: [
      {
        id: 'child-tasks-nav',
        target: '#nav-tasks',
        route: '/tasks',
        message: "Tasks lists everything you need to complete. Filter by what's due next.",
        suggestions: baseSuggestions,
        ensureSidebar: true,
      },
      {
        id: 'child-tasks-board',
        target: '#tasks-board',
        route: '/tasks',
        message: 'Open a task to see notes, claim rewards, or mark it done.',
        suggestions: baseSuggestions,
        ensureSidebar: false,
      },
      {
        id: 'child-gigs-nav',
        target: '#nav-gigs',
        route: '/gigs',
        message: 'Gigs show repeating responsibilities and the rewards you can earn.',
        suggestions: baseSuggestions,
        ensureSidebar: true,
      },
      {
        id: 'child-gigs-board',
        target: '#gigs-board',
        route: '/gigs',
        message: "Claim a gig when you are ready so everyone knows who's on it.",
        suggestions: baseSuggestions,
        ensureSidebar: false,
      },
    ],
  },
  {
    id: 'child-money',
    title: 'Money & Shopping',
    intro: 'Track your rewards and shared lists.',
    steps: [
      {
        id: 'child-budget-nav',
        target: '#nav-budget',
        route: '/budget',
        message: 'See allowances, savings goals, and how close you are to each reward.',
        suggestions: baseSuggestions,
        ensureSidebar: true,
      },
      {
        id: 'child-budget-overview',
        target: '#budget-overview',
        route: '/budget',
        message: 'Watch your progress bars climb as you complete gigs and save.',
        suggestions: baseSuggestions,
        ensureSidebar: false,
      },
      {
        id: 'child-shopping-nav',
        target: '#nav-shopping',
        route: '/shopping',
        message: 'Help with shopping lists—check items off or add what you need.',
        suggestions: baseSuggestions,
        ensureSidebar: true,
      },
      {
        id: 'child-shopping-panel',
        target: '#shopping-lists-panel',
        route: '/shopping',
        message: 'Each list shows who added the item and any notes.',
        suggestions: baseSuggestions,
        ensureSidebar: false,
      },
    ],
  },
  {
    id: 'child-communication',
    title: 'Stay Connected',
    intro: 'Keep in touch with family updates.',
    steps: [
      {
        id: 'child-calendar-nav',
        target: '#nav-calendar',
        route: '/calendar',
        message: "Check the calendar to know what's coming up for the family.",
        suggestions: baseSuggestions,
        ensureSidebar: true,
      },
      {
        id: 'child-calendar-board',
        target: '#calendar-board',
        route: '/calendar',
        message: 'Tap any event to see details or reminders you need to follow.',
        suggestions: baseSuggestions,
        ensureSidebar: false,
      },
      {
        id: 'child-messages-nav',
        target: '#nav-messages',
        route: '/messages',
        message: 'Messages keep you in the loop—share updates or ask for help.',
        suggestions: baseSuggestions,
        ensureSidebar: true,
      },
      {
        id: 'child-messages-thread',
        target: '#messages-thread',
        route: '/messages',
        message: 'Reply in the thread so everyone stays on the same page.',
        suggestions: baseSuggestions,
        ensureSidebar: false,
      },
      {
        id: 'child-journal-nav',
        target: '#nav-journal',
        route: '/journal',
        message: 'Use the journal to celebrate wins or jot down what happened today.',
        suggestions: baseSuggestions,
        ensureSidebar: true,
      },
      {
        id: 'child-journal-board',
        target: '#journal-board',
        route: '/journal',
        message: 'Start a new entry or add reactions to a family moment.',
        suggestions: finalizeSuggestions,
        ensureSidebar: false,
      },
    ],
  },
];

export const buildTourPlan = (audience: TourAudience): TourPlan => {
  const normalized = audience === 'guardian' ? 'parent' : audience;
  const modules = normalized === 'child' ? childModules : parentModules;
  return {
    welcomeMessage: normalized === 'child'
      ? 'Nice work joining the family hub! Want me to walk you through the highlights?'
      : 'Welcome aboard! Ready for a quick guided tour of FamConomy? I can point out the big wins.',
    inviteMessage: 'I can always revisit parts of the tour later—just ask me for help.',
    modules,
  };
};
