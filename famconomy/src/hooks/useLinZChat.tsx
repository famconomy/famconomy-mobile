import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  sendMessageToAssistant,
  AssistantActionDTO,
  AssistantResponseDTO,
  AssistantSuggestionDTO,
  AssistantSuggestionTone,
} from '../api/assistant';
import { createDebugLogger } from '../utils/debug';
import { useAuth } from './useAuth';

type LinZChatSender = 'user' | 'linz';

export type LinZChatSuggestionTone = AssistantSuggestionTone;

export interface LinZChatSuggestion {
  id: string;
  label: string;
  action: string;
  payload?: Record<string, unknown>;
  tone?: LinZChatSuggestionTone;
}

export interface LinZChatMessage {
  id: string;
  sender: LinZChatSender;
  text: string;
  createdAt: number;
  meta?: Record<string, unknown>;
  suggestions?: LinZChatSuggestion[];
}

interface AppendOptions {
  meta?: Record<string, unknown>;
  autoOpen?: boolean;
  allowEmpty?: boolean;
  suggestions?: LinZChatSuggestion[];
}

interface LinZChatContextValue {
  messages: LinZChatMessage[];
  sendUserMessage: (text: string) => Promise<void>;
  appendLinZMessage: (text: string, options?: AppendOptions) => string | null;
  appendUserMessage: (text: string, options?: AppendOptions) => string | null;
  updateLinZMessage: (id: string, text: string, options?: AppendOptions) => void;
  isOpen: boolean;
  isSending: boolean;
  openChat: (options?: { greet?: boolean }) => void;
  closeChat: () => void;
  toggleChat: (options?: { greet?: boolean }) => void;
  emitAction: (action: string, payload?: Record<string, unknown>) => void;
  registerActionHandler: (action: string, handler: (payload?: Record<string, unknown>) => void) => () => void;
}

const LinZChatContext = createContext<LinZChatContextValue | null>(null);

const createId = () => Date.now().toString() + '-' + Math.random().toString(36).slice(2, 8);
const createSuggestionId = () => `sugg-${createId()}`;

const normalizeSuggestions = (items?: AssistantSuggestionDTO[]): LinZChatSuggestion[] => {
  if (!items || !items.length) {
    return [];
  }
  return items.map(item => ({
    id: createSuggestionId(),
    label: item.label,
    action: item.action,
    payload: item.payload,
    tone: item.tone ?? 'neutral',
  }));
};

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

const toTitleCase = (value: string) =>
  value
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const nameFromEmail = (raw?: unknown) => {
  if (!isNonEmptyString(raw)) return undefined;
  const localPart = raw.split('@')[0];
  if (!localPart) return undefined;
  return toTitleCase(localPart.replace(/[\.|\-|_]+/g, ' '));
};

const resolveDisplayName = (user: any): string => {
  if (!user) return 'Friend';

  const primary = [user.fullName, user.full_name, user.displayName, user.preferredName, user.name, user.nickname, user.profile?.displayName, user.profile?.preferredName]
    .find(isNonEmptyString);
  if (primary) return toTitleCase(primary);

  const first = [user.FirstName, user.firstName, user.given_name, user.profile?.firstName].find(isNonEmptyString);
  const last = [user.LastName, user.lastName, user.family_name, user.profile?.lastName].find(isNonEmptyString);

  if (first && last) return toTitleCase(first + ' ' + last);
  if (first) return toTitleCase(first);

  const emailCandidate = nameFromEmail([user.email, user.Email, user.username].find(isNonEmptyString));
  if (emailCandidate) return emailCandidate;

  return 'Friend';
};

const extractFirstName = (raw: string): string => {
  if (!raw) return 'Friend';
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  const first = tokens[0] ?? 'Friend';
  return toTitleCase(first);
};

const getTimeOfDaySalutation = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 22) return 'Good evening';
  return 'Hello';
};


interface LinZChatProviderProps {
  children: React.ReactNode;
  familyId?: number | null;
  userId?: string | null;
}

export const LinZChatProvider: React.FC<LinZChatProviderProps> = ({ children, familyId = null, userId = null }) => {
  const [messages, setMessages] = useState<LinZChatMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const chatDebug = useMemo(() => createDebugLogger('linz-chat'), []);
  const { user: authUser } = useAuth();
  const displayName = useMemo(() => extractFirstName(resolveDisplayName(authUser)), [authUser]);
  const effectiveFamilyId = useMemo(() => {
    if (typeof familyId === 'number') return familyId;
    const fromAuth = (authUser as any)?.FamilyID ?? (authUser as any)?.familyId;
    return typeof fromAuth === 'number' ? fromAuth : null;
  }, [familyId, authUser]);

  const actionHandlersRef = useRef<Map<string, Set<(payload?: Record<string, unknown>) => void>>>(new Map());

  const appendMessage = useCallback((message: LinZChatMessage) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const GREETINGS = useMemo(() => {
    const name = displayName;
    const salutation = getTimeOfDaySalutation();
    const templates = [
      "{salutation}, {name}! How can I help you with FamConomy today?",
      "Hey {name}! How are you doing? Need a hand with anything right now?",
      "Hi {name}! Ready to explore FamConomy together?",
      "Great to see you, {name}! What would you like to tackle next?",
      "{name}, I'm here whenever you want a tour or quick tips.",
    ];
    return templates.map(template =>
      template.replace('{salutation}', salutation).replace(/\{name\}/g, name)
    );
  }, [displayName]);

  useEffect(() => {
    setHasGreeted(false);
  }, [userId, displayName]);

  const greetOnOpen = useCallback(() => {
    if (hasGreeted) return;
    const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)] ?? GREETINGS[0];
    chatDebug.log('Greeting user on manual open', greeting);
    appendMessage({
      id: createId(),
      sender: 'linz',
      text: greeting,
      createdAt: Date.now(),
    });
    setHasGreeted(true);
  }, [GREETINGS, appendMessage, chatDebug, hasGreeted]);

  const appendLinZMessage = useCallback(
    (text: string, options?: AppendOptions) => {
      if (!text && !options?.allowEmpty) return null;
    const message: LinZChatMessage = {
      id: createId(),
      sender: 'linz',
      text,
      createdAt: Date.now(),
      meta: options?.meta,
      suggestions: options?.suggestions,
    };
    appendMessage(message);
      if (options?.autoOpen) {
        setIsOpen(true);
      }
      return message.id;
    },
    [appendMessage]
  );

  const appendUserMessage = useCallback(
    (text: string, options?: AppendOptions) => {
      if (!text && !options?.allowEmpty) return null;
      const message: LinZChatMessage = {
        id: createId(),
        sender: 'user',
        text,
        createdAt: Date.now(),
        meta: options?.meta,
        suggestions: options?.suggestions,
      };
      appendMessage(message);
      if (options?.autoOpen) {
        setIsOpen(true);
      }
      return message.id;
    },
    [appendMessage]
  );

  const updateLinZMessage = useCallback(
    (id: string, text: string, options?: AppendOptions) => {
      setMessages(prev =>
        prev.map(message =>
          message.id === id
            ? {
                ...message,
                text,
                meta: options?.meta ?? message.meta,
                suggestions: options?.suggestions ?? message.suggestions,
              }
            : message
        )
      );
      if (options?.autoOpen) {
        setIsOpen(true);
      }
    },
    []
  );

  const registerActionHandler = useCallback((action: string, handler: (payload?: Record<string, unknown>) => void) => {
    if (!action) return () => undefined;
    const map = actionHandlersRef.current;
    const normalized = action.toLowerCase();
    if (!map.has(normalized)) {
      map.set(normalized, new Set());
    }
    const handlers = map.get(normalized)!;
    handlers.add(handler);
    return () => {
      const current = actionHandlersRef.current.get(normalized);
      current?.delete(handler);
      if (current && current.size === 0) {
        actionHandlersRef.current.delete(normalized);
      }
    };
  }, []);

  const emitAction = useCallback((action: string, payload?: Record<string, unknown>) => {
    if (!action) return;
    const handlers = actionHandlersRef.current.get(action.toLowerCase());
    if (!handlers || handlers.size === 0) return;
    handlers.forEach(handler => {
      try {
        handler(payload);
      } catch (error) {
        chatDebug.error('Error handling LinZ chat action', action, error);
      }
    });
  }, [chatDebug]);

  const sendUserMessage = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text) return;

      appendMessage({
        id: createId(),
        sender: 'user',
        text,
        createdAt: Date.now(),
      });

      const tenantId = effectiveFamilyId !== null ? String(effectiveFamilyId) : null;
      const resolvedUserId = userId ?? null;

      if (!tenantId || !resolvedUserId) {
        appendLinZMessage(
          "I'm still getting things ready—try again once your profile and family are fully loaded.",
          { autoOpen: true, meta: { reason: 'missing-context' } }
        );
        return;
      }

      setIsSending(true);
      try {
        const assistantResponse: AssistantResponseDTO = await sendMessageToAssistant(text, tenantId, String(resolvedUserId));
        const suggestions = normalizeSuggestions(assistantResponse.suggestions);
        appendLinZMessage(assistantResponse.reply ?? '', {
          autoOpen: true,
          allowEmpty: true,
          meta: { source: 'assistant' },
          suggestions,
        });

        (assistantResponse.actions ?? []).forEach((action: AssistantActionDTO) => {
          if (!action || !action.type) {
            return;
          }
          emitAction(action.type, action.payload);
        });
      } catch (error) {
        chatDebug.error('Error sending message to LinZ:', error);
        appendLinZMessage('Oops! Something went wrong. Please try again in a moment.', {
          autoOpen: true,
          meta: { source: 'assistant-error' },
        });
      } finally {
        setIsSending(false);
      }
    },
    [appendMessage, appendLinZMessage, chatDebug, effectiveFamilyId, emitAction, userId]
  );

  const openChat = useCallback((options?: { greet?: boolean }) => {
    setIsOpen(true);
    if (options?.greet !== false) {
      greetOnOpen();
    }
  }, [greetOnOpen]);

  const closeChat = useCallback(() => setIsOpen(false), []);

  const toggleChat = useCallback((options?: { greet?: boolean }) => {
    setIsOpen(prev => {
      const next = !prev;
      if (next && options?.greet !== false) {
        greetOnOpen();
      }
      return next;
    });
  }, [greetOnOpen]);

  const value = useMemo<LinZChatContextValue>(
    () => ({
      messages,
      sendUserMessage,
      appendLinZMessage,
      appendUserMessage,
      updateLinZMessage,
      isOpen,
      isSending,
      openChat,
      closeChat,
      toggleChat,
      emitAction,
      registerActionHandler,
    }),
    [appendLinZMessage, appendUserMessage, updateLinZMessage, closeChat, emitAction, isOpen, isSending, messages, openChat, registerActionHandler, sendUserMessage, toggleChat]
  );

  return <LinZChatContext.Provider value={value}>{children}</LinZChatContext.Provider>;
};

export const useLinZChat = () => {
  const ctx = useContext(LinZChatContext);
  if (!ctx) {
    throw new Error('useLinZChat must be used within a LinZChatProvider');
  }
  return ctx;
};
