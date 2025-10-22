import { useState, useEffect, useCallback, useRef } from 'react';
import { createDebugLogger } from '../utils/debug';
import apiClient from '../api/apiClient';
import { useAuth } from './useAuth';
import { useLinZChat, updateLinZMessage } from './useLinZChat';
import { setStoredActiveFamilyId } from '../utils/activeFamilyStorage';

type SlotStatusVal = 'filled' | 'partial' | 'empty';

interface Member {
  name: string;
  role: string;
  email?: string;
}

interface OnboardingState {
  currentStep: 'greeting' | 'members' | 'rooms' | 'committed' | 'completed';
  family_name: string;
  members: Member[];
  rooms: string[];
  slot_status: { family_name: SlotStatusVal; members: SlotStatusVal; rooms: SlotStatusVal };
  loading: boolean;
  error: string | null;
  messages: { sender: 'LinZ' | 'user'; text: string }[];
  hydrated: boolean;
  awaitingResetConfirmation: boolean;
  streamingMessage: string | null;
}

const createInitialState = (): OnboardingState => ({
  currentStep: 'greeting',
  family_name: '',
  members: [],
  rooms: [],
  slot_status: { family_name: 'empty', members: 'empty', rooms: 'empty' },
  loading: false,
  error: null,
  messages: [
    {
      sender: 'LinZ',
      text:
        "Hi! I'm LinZ 👋 Welcome to FamConomy—thanks for inviting me along. To start, what name should we use for your family? (e.g., \"The Parkers\")",
    },
  ],
  hydrated: false,
  awaitingResetConfirmation: false,
  streamingMessage: null,
});

const initialState: OnboardingState = createInitialState();
const createHydratedInitialState = (): OnboardingState => ({ ...createInitialState(), hydrated: true });
const onboardingDebug = createDebugLogger('onboarding');
const onboardingStreamDebug = createDebugLogger('onboarding-stream');
// Give the streaming assistant a generous window before we synthesize a fallback reply.
const FALLBACK_DELAY_MS = 3500;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface UseOnboardingProps {
  familyId: number | null;
  userId: string | null;
}

/** ---------- Helpers ---------- **/

function deriveSlotStatus(family_name: string, members: Member[], rooms: string[]) {
  const family = family_name ? 'filled' : 'empty';
  const mem = members.length > 0 ? 'filled' : 'empty';
  const rms = rooms.length > 0 ? 'filled' : 'empty';
  return { family_name: family as SlotStatusVal, members: mem as SlotStatusVal, rooms: rms as SlotStatusVal };
}

function deriveNextStep(slot: OnboardingState['slot_status']): OnboardingState['currentStep'] {
  if (slot.family_name === 'filled' && slot.members === 'filled' && slot.rooms === 'filled') return 'committed';
  if (slot.family_name === 'filled' && slot.members === 'filled') return 'rooms';
  if (slot.family_name === 'filled') return 'members';
  return 'greeting';
}

// Strict response schema we expect from the LLM endpoint
type LlmResponse = {
  assistant_reply: string;
  extracted?: {
    family_name?: string;
    members_add?: Array<{ name: string; role: string; email?: string }>;
    rooms_add?: string[];
  };
  next_step?: 'greeting' | 'members' | 'rooms' | 'committed' | 'completed';
};

type StreamingOnboardingState = {
  family_name?: string | null;
  members?: Array<{ name: string; role: string; email?: string | null }>;
  rooms?: string[];
  next_step?: 'greeting' | 'members' | 'rooms' | 'committed' | 'completed';
} | null;

interface StreamingAssistantResult {
  assistant_reply: string;
  state: StreamingOnboardingState;
  hasContent: boolean;
  completed: boolean;
}

/** Build a minimal, safe system prompt that encourages natural tone but structured output */
async function callStreamingOnboardingAssistant(
  userMessage: string,
  familyId: number | null,
  userId: string,
  history: Array<{ sender: 'LinZ' | 'user'; text: string }>,
  onStreamMessage?: (message: string) => void,
  options?: { signal?: AbortSignal }
): Promise<StreamingAssistantResult | null> {
  try {
    const response = await fetch('/api/assistant/onboarding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(familyId !== null ? { 'x-tenant-id': String(familyId) } : {}),
        'x-user-id': userId,
      },
      credentials: 'include',
      body: JSON.stringify({ message: userMessage, familyId, userId, history }),
      signal: options?.signal,
    });

    if (!response.ok || !response.body) {
      throw new Error(`Streaming assistant error: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let assistantTokens = '';
    let assistantMessage = '';
    let latestState: StreamingOnboardingState = null;
    let doneNextStep: StreamingOnboardingState['next_step'];
    let receivedContent = false;
    let completed = false;

    const findEventBoundary = (data: string): { index: number; length: number } | null => {
      const crlfIndex = data.indexOf('\r\n\r\n');
      const lfIndex = data.indexOf('\n\n');

      if (crlfIndex !== -1 && (lfIndex === -1 || crlfIndex < lfIndex)) {
        return { index: crlfIndex, length: 4 };
      }

      if (lfIndex !== -1) {
        return { index: lfIndex, length: 2 };
      }

      return null;
    };

    const processEvent = (rawEvent: string) => {
      if (!rawEvent.trim()) return;
      const lines = rawEvent.split(/\r?\n/);
      let eventName = 'message';
      const dataLines: string[] = [];
      for (const line of lines) {
        if (!line) continue;
        if (line.startsWith('event:')) {
          eventName = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          dataLines.push(line.slice(5));
        }
      }
      if (!dataLines.length) return;
      const dataStr = dataLines.join('\n');
      let payload: any = dataStr;
      try {
        payload = JSON.parse(dataStr);
      } catch {
        // ignore non-JSON payloads
      }

      switch (eventName) {
        case 'token':
          if (payload && typeof payload.content === 'string') {
            const content = payload.content;
            assistantTokens += content;
            if (content.trim()) {
              receivedContent = true;
            }
            onStreamMessage?.(assistantTokens);
          }
          break;
        case 'assistant':
          if (payload && typeof payload.content === 'string') {
            const content = payload.content;
            assistantMessage = content;
            if (content.trim()) {
              receivedContent = true;
            }
            onStreamMessage?.(assistantMessage);
          }
          break;
        case 'state':
          latestState = payload as StreamingOnboardingState;
          break;
        case 'done':
          if (payload && typeof payload.next_step === 'string') {
            doneNextStep = payload.next_step as StreamingOnboardingState['next_step'];
            if (latestState) {
              latestState = { ...latestState, next_step: doneNextStep };
            } else {
              latestState = { next_step: doneNextStep };
            }
          }
          completed = true;
          break;
        case 'error':
          throw new Error(
            payload?.message || 'Streaming assistant reported an error.'
          );
        default:
          break;
      }
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary: { index: number; length: number } | null = findEventBoundary(buffer);
      while (boundary) {
        const rawEvent = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary.length);
        processEvent(rawEvent);
        boundary = findEventBoundary(buffer);
      }
    }

    if (buffer.trim()) {
      processEvent(buffer);
    }

    completed = true;

    const assistant_reply = (assistantMessage || assistantTokens || '').trim();
    onboardingStreamDebug.log('stream result', {
      assistant_reply,
      hasTokens: Boolean(assistantTokens.trim()),
      hasAssistantMessage: Boolean(assistantMessage.trim()),
      latestState,
      receivedContent,
      completed,
    });
    return { assistant_reply, state: latestState, hasContent: receivedContent, completed };
  } catch (error) {
    const isAbortError =
      options?.signal?.aborted ||
      (typeof error === 'object' && error !== null && 'name' in error && (error as any).name === 'AbortError');

    if (isAbortError) {
      onboardingStreamDebug.log('Streaming onboarding assistant request aborted');
      throw error;
    }

    onboardingStreamDebug.error('Streaming onboarding assistant failed:', error);
    return null;
  }
}

function toTitleCase(value: string) {
  return value
    .split(/\s+/)
    .map(word => (word ? word[0].toUpperCase() + word.slice(1) : ''))
    .join(' ');
}

function stripOuterQuotes(value: string) {
  return value.replace(/^["'“”‘’]+|["'“”‘’]+$/g, '');
}

function guessFamilyNameInput(input: string) {
  const trimmed = stripOuterQuotes(input.trim());
  if (!trimmed) return undefined;
  if (/[?\r\n]/.test(trimmed)) return undefined;
  const words = trimmed.split(/\s+/);
  if (words.length > 6) return undefined;
  return toTitleCase(trimmed.replace(/\s+/g, ' '));
}

function normalizeRole(roleRaw: string) {
  const cleaned = roleRaw
    .toLowerCase()
    .replace(/\b(my|the|a|an|our|of|with|for|to)\b/g, '')
    .replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const replacements: Record<string, string> = {
    wife: 'Wife',
    husband: 'Husband',
    partner: 'Partner',
    spouse: 'Spouse',
    mom: 'Mom',
    mother: 'Mother',
    dad: 'Dad',
    father: 'Father',
    daughter: 'Daughter',
    daughters: 'Daughter',
    son: 'Son',
    sons: 'Son',
    boy: 'Son',
    boys: 'Son',
    girl: 'Daughter',
    girls: 'Daughter',
    kid: 'Child',
    kids: 'Child',
    child: 'Child',
    children: 'Child',
    baby: 'Baby',
    toddler: 'Toddler',
    cousin: 'Cousin',
    nephew: 'Nephew',
    niece: 'Niece',
    grandma: 'Grandma',
    grandpa: 'Grandpa',
    grandfather: 'Grandfather',
    grandmother: 'Grandmother',
    aunt: 'Aunt',
    uncle: 'Uncle',
    friend: 'Friend',
    roommate: 'Roommate',
    fiance: 'Fiance',
    fiancee: 'Fiancee',
  };

  if (cleaned && Object.prototype.hasOwnProperty.call(replacements, cleaned)) {
    return replacements[cleaned];
  }

  const filtered = cleaned
    .split(' ')
    .filter(token => token && !ROLE_OUTPUT_OMIT.has(token))
    .join(' ')
    .trim();

  return filtered ? toTitleCase(filtered) : 'Family Member';
}

const BASE_ROLE_KEYWORDS = new Set<string>([
  'mom',
  'mother',
  'dad',
  'father',
  'parent',
  'parents',
  'son',
  'sons',
  'daughter',
  'daughters',
  'boy',
  'boys',
  'girl',
  'girls',
  'kid',
  'kids',
  'child',
  'children',
  'wife',
  'husband',
  'partner',
  'partners',
  'spouse',
  'friend',
  'friends',
  'roommate',
  'roommates',
  'cousin',
  'cousins',
  'nephew',
  'niece',
  'uncle',
  'aunt',
  'grandma',
  'grandmother',
  'grandpa',
  'grandfather',
  'grandson',
  'granddaughter',
  'sister',
  'sisters',
  'brother',
  'brothers',
  'siblings',
  'guardian',
  'mentor',
  'coach',
  'stepmom',
  'stepmother',
  'stepdad',
  'stepfather',
  'stepbrother',
  'stepsister',
  'stepchild',
  'stepchildren',
  'twin',
  'twins',
  'fiance',
  'fiancee',
  'pet',
  'pets',
  'dog',
  'cat',
]);

const ROLE_DESCRIPTORS = new Set<string>([
  'oldest',
  'youngest',
  'older',
  'younger',
  'little',
  'big',
  'only',
  'eldest',
  'middle',
  'newborn',
  'baby',
  'bonus',
  'step',
  'twin',
  'twins',
  'first',
  'second',
  'third',
  'fourth',
  'fifth',
  'pregnant',
  'expecting',
  'future',
  'lovely',
  'awesome',
  'amazing',
  'wonderful',
  'beautiful',
  'sweet',
]);

const NUMBER_WORDS = new Set<string>([
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'couple',
  'few',
  'pair',
  'pairs',
  'dozen',
]);

const CONNECTOR_WORDS = new Set<string>(['and', '&']);
const NAME_LEADERS = new Set<string>(['named', 'called', 'is', '=', 'as']);
const NAME_STOP_WORDS = new Set<string>(['the', 'a', 'an', 'my', 'our']);
const ROLE_OUTPUT_OMIT = new Set<string>(['lovely', 'awesome', 'amazing', 'wonderful', 'beautiful', 'sweet']);

const MEMBER_DONE_PHRASES = [
  'no thanks',
  'nope',
  "no that's all",
  "no that is all",
  "nope that's all of us",
  'done',
  "that's all",
  'thats all',
  "that's everyone",
  'thats everyone',
  "that's everyone actually",
  'thats everyone actually',
  "that's it",
  'thats it',
  'all set',
  "we're good",
  'we are good',
  'we good',
  'no more',
  'stop',
];

const ROOM_DONE_PHRASES = [
  ...MEMBER_DONE_PHRASES,
  "i think that's all",
  'i think thats all',
  'nothing else',
  'none',
  'no other rooms',
  'no other spaces',
  'that is everything',
  'that is all',
  'no other',
  'we are good on rooms',
  'we are good on spaces',
  'we are set',
  'all good',
];

const RESET_YES_PHRASES = [
  'yes',
  'yeah',
  'yep',
  'yup',
  'sure',
  'absolutely',
  'of course',
  'start over',
  'restart',
  'reset',
  'reset it',
  'reset onboarding',
  'let’s start over',
  "let's start over",
  'start from scratch',
  'let’s do it',
];

const RESET_NO_PHRASES = [
  'no',
  'nope',
  'not now',
  'maybe later',
  'keep it',
  'leave it',
  'stay as is',
  'don’t',
  "don't",
];

const RESET_COMMAND_PHRASES = ['reset onboarding', 'restart onboarding', 'start over onboarding'];

const ROOM_IGNORE_PHRASES = new Set<string>([
  ...ROOM_DONE_PHRASES,
  'what do you mean',
  'i am confused',
  'im confused',
  'not sure',
  'no idea',
]);

const normalizeRoomToken = (token: string) => token.replace(/[.!?]+$/g, '').trim().toLowerCase();

const shouldIgnoreRoomToken = (token: string) => {
  const normalized = normalizeRoomToken(token);
  if (!normalized) return true;
  if (ROOM_IGNORE_PHRASES.has(normalized)) return true;
  if (normalized === 'n/a' || normalized === 'na') return true;
  return false;
};

const sanitizeExtractedRooms = (raw: unknown): string[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(value => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean)
    .filter(value => !shouldIgnoreRoomToken(value));
};

function containsPhrase(message: string, phrases: string[]) {
  const lower = message.toLowerCase();
  return phrases.some(phrase => lower.includes(phrase));
}

function isChildRole(role: string) {
  const normalized = (role || '').toLowerCase();
  return /son|daughter|child|kid|boy|girl|teen/.test(normalized);
}

function formatPossessiveRoomName(rawName: string) {
  const name = toTitleCase(rawName.trim());
  if (!name) return '';
  const endsWithS = name.toLowerCase().endsWith('s');
  const suffix = endsWithS ? "'" : "'s";
  return `${name}${suffix} Room`;
}

function createChildRooms(count: number | null, members: Member[], existingRooms: string[]): string[] {
  const childMembers = members.filter(member => isChildRole(member.role));
  if (!childMembers.length) return [];

  const existingLower = new Set(existingRooms.map(room => room.toLowerCase()));
  const seen = new Set<string>();

  const available = childMembers
    .map(member => toTitleCase(member.name))
    .filter(name => {
      if (!name) return false;
      const key = name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      const roomName = formatPossessiveRoomName(name);
      return roomName && !existingLower.has(roomName.toLowerCase());
    })
    .map(name => formatPossessiveRoomName(name))
    .filter(Boolean);

  if (!available.length) return [];

  let limit = count ?? available.length;
  if (limit <= 0) {
    limit = available.length;
  }

  return available.slice(0, Math.min(limit, available.length));
}

const KNOWN_ROOM_NAMES = [
  'Master Bedroom',
  'Master Bathroom',
  'Primary Bedroom',
  'Primary Bathroom',
  'Kids Bedrooms',
  'Kids Rooms',
  'Kids Room',
  'Kids Bathroom',
  'Guest Bedroom',
  'Guest Bathroom',
  'Guest Room',
  'Living Room',
  'Dining Room',
  'Kitchen',
  'Study',
  'Library',
  'Office',
  'Workout Room',
  'Gym',
  'Garage',
  'Front Porch',
  'Enclosed Front Porch',
  'Porch',
  'Basement',
  'Attic',
  'Laundry Room',
  'Mud Room',
  'Yard',
  'Backyard',
  'Deck',
  'Patio',
  'Loft',
  'Playroom',
];

const SORTED_ROOM_NAMES = [...KNOWN_ROOM_NAMES].sort((a, b) => b.length - a.length);

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractKnownRooms(fragment: string) {
  const matches = new Set<string>();
  SORTED_ROOM_NAMES.forEach(roomName => {
    const regex = new RegExp(`\\b${escapeRegex(roomName)}\\b`, 'gi');
    if (regex.test(fragment)) {
      let normalized = roomName;
      if (roomName === 'Primary Bedroom') normalized = 'Master Bedroom';
      if (roomName === 'Primary Bathroom') normalized = 'Master Bathroom';
      if (roomName === 'Kids Room') normalized = 'Kids Rooms';
      if (roomName === 'Enclosed Front Porch' || roomName === 'Porch') normalized = 'Front Porch';
      if (roomName === 'Gym') normalized = 'Workout Room';
      if (roomName === 'Backyard') normalized = 'Yard';
      if (roomName === 'Guest Bedroom') normalized = 'Guest Room';
      matches.add(normalized);
    }
  });
  return Array.from(matches);
}

function parseMemberClause(clause: string): Member[] {
  let working = clause.trim();
  if (!working) return [];
  working = working.replace(/^(?:and|&)+\s*/i, '').trim();

  let tokens = working.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return [];

  while (tokens.length > 0 && NUMBER_WORDS.has(tokens[0].toLowerCase())) {
    tokens = tokens.slice(1);
  }
  if (tokens.length < 2) return [];

  const roleTokens: string[] = [];
  let idx = 0;
  while (idx < tokens.length) {
    const token = tokens[idx];
    const lower = token.toLowerCase();
    if (NAME_LEADERS.has(lower)) {
      idx += 1;
      break;
    }
    if (CONNECTOR_WORDS.has(lower) && roleTokens.length) {
      idx += 1;
      break;
    }
    if (idx === 0) {
      roleTokens.push(token);
      idx += 1;
      continue;
    }
    if (ROLE_DESCRIPTORS.has(lower) || BASE_ROLE_KEYWORDS.has(lower) || token.includes('-')) {
      roleTokens.push(token);
      idx += 1;
      continue;
    }
    break;
  }

  if (!roleTokens.length) return [];

  let nameTokens = tokens.slice(idx);
  while (
    nameTokens.length > 0 &&
    (CONNECTOR_WORDS.has(nameTokens[0].toLowerCase()) ||
      NAME_STOP_WORDS.has(nameTokens[0].toLowerCase()) ||
      NAME_LEADERS.has(nameTokens[0].toLowerCase()))
  ) {
    nameTokens = nameTokens.slice(1);
  }

  if (!nameTokens.length) return [];

  const nameString = nameTokens.join(' ');
  const rawNames = nameString
    .split(/\band\b|,|&/i)
    .map(n => n.trim())
    .filter(Boolean);

  const role = normalizeRole(roleTokens.join(' '));
  const members: Member[] = [];

  rawNames.forEach(raw => {
    const cleaned = raw
      .replace(/^(?:the|a|an|my|our)\s+/i, '')
      .replace(/'s$/i, '')
      .trim();
    if (!cleaned) return;
    if (BASE_ROLE_KEYWORDS.has(cleaned.toLowerCase())) return;
    members.push({ name: toTitleCase(cleaned), role });
  });

  return members;
}

function inferMembersFromMessage(message: string): Member[] {
  const results: Member[] = [];
  const cleanedMessage = stripOuterQuotes(message.trim());
  if (!cleanedMessage) return results;

  const clauseRegex = /\b(?:my|our)\s+(.+?)(?=(?:\s*[,:;])?\s*(?:and\s+)?(?:my|our)\b|[.!?]|$)/gi;
  let match: RegExpExecArray | null;
  while ((match = clauseRegex.exec(cleanedMessage)) !== null) {
    const clause = match[1]?.trim();
    if (!clause) continue;
    const members = parseMemberClause(clause);
    members.forEach(member => {
      if (!results.some(existing => existing.name.toLowerCase() === member.name.toLowerCase())) {
        results.push(member);
      }
    });
  }

  return results;
}

function normalizeRoomFragment(fragment: string, members: Member[], existingRooms: string[]): string[] {
  let text = stripOuterQuotes(fragment.trim());
  if (!text) return [];

  text = text.replace(/^[\-•*]+\s*/, '').replace(/:+$/, '').trim();

  const originalLower = text.toLowerCase();
  if (!text || ROOM_IGNORE_PHRASES.has(originalLower)) return [];
  if (/that's all/i.test(text) || /nothing else/i.test(text)) return [];

  const childRoomPattern = /\b(kids?'?|children|sons|daughters|boys|girls)\b[^,.;]*\b(room|rooms|bedroom|bedrooms)\b/i;
  if (childRoomPattern.test(text)) {
    const countMatch = text.match(/(\d+)\s+(?:kids?'?|children|sons|daughters|boys|girls)/i);
    const count = countMatch ? parseInt(countMatch[1], 10) || null : null;
    const childRooms = createChildRooms(count, members, existingRooms);
    if (childRooms.length) {
      return childRooms;
    }
    return ['Kids Rooms'];
  }

  const leadingPatterns = [
    /^(?:well|so|also|and|oh|yeah|yep|yup|sure|plus|anyway|honestly|actually|maybe|um|uh|okay|ok|alright)[,\s]+/i,
    /^oh\s+yeah[,\s]+/i,
    /^oh\s+ok[,\s]+/i,
  ];

  leadingPatterns.forEach(pattern => {
    text = text.replace(pattern, '').trim();
  });

  const phrasePatterns = [
    /^(?:my|our)\s+(?:home|house)\s+has(?:\s+the\s+following\s+rooms?)?[:\s]*/i,
    /^home\s+has\s+/i,
    /^house\s+has\s+/i,
    /^we(?:'ve)?\s+(?:also\s+)?(?:got|have)\s+/i,
    /^we\s+also\s+keep\s+/i,
    /^there'?s\s+/i,
    /^here'?s\s+/i,
    /^it's\s+/i,
    /^its\s+/i,
    /^this\s+is\s+/i,
    /^just\s+/i,
    /^all\s+of\s+the\s+/i,
    /^all\s+of\s+/i,
    /^all\s+the\s+/i,
  ];

  phrasePatterns.forEach(pattern => {
    text = text.replace(pattern, '').trim();
  });

  if (!text) return [];

  if (/each of the kids? have their own room/i.test(text) || /each kid has their own room/i.test(text)) {
    const childRooms = createChildRooms(null, members, existingRooms);
    if (childRooms.length) {
      return childRooms;
    }
    return ['Kids Rooms'];
  }

  if (/master\s+bed\s+and\s+bath/i.test(text)) {
    return ['Master Bedroom', 'Master Bathroom'];
  }

  text = text.replace(/^an\s+/i, '').replace(/^the\s+/i, '').replace(/^a\s+/i, '');
  text = text.replace(/\bbed\b$/i, 'Bedroom');
  text = text.replace(/\bbedroom room$/i, 'Bedroom');
  text = text.replace(/\bbath\b$/i, 'Bathroom');
  text = text.replace(/\bmaster bedroom bathroom$/i, 'Master Bathroom');

  let candidate = toTitleCase(text.replace(/\s+/g, ' ').trim());
  const candidateLower = candidate.toLowerCase();
  if (!candidate || ROOM_IGNORE_PHRASES.has(candidateLower)) return [];

  const knownMatches = extractKnownRooms(candidate);
  if (knownMatches.length) {
    return knownMatches;
  }

  if (/^bath$/i.test(candidate)) candidate = 'Bathroom';
  if (/^room$/i.test(candidate)) return [];
  if (/^rooms$/i.test(candidate)) return [];
  if (/^kids$/i.test(candidate)) return [];
  if (/^kids Rooms$/i.test(candidate)) {
    const childRooms = createChildRooms(null, members, existingRooms);
    if (childRooms.length) {
      return childRooms;
    }
    candidate = 'Kids Rooms';
  }
  if (/^basement$/i.test(candidate)) candidate = 'Basement';
  if (/^garage$/i.test(candidate)) candidate = 'Garage';

  return candidate ? [candidate] : [];
}

function inferRoomsFromMessage(message: string, existingRooms: string[], members: Member[]): string[] {
  const trimmedMessage = message.trim();
  if (!trimmedMessage) return [];
  if (containsPhrase(trimmedMessage, ROOM_DONE_PHRASES)) return [];

  let working = stripOuterQuotes(trimmedMessage);
  working = working.replace(/[.!?]+$/, '').trim();

  if (working.includes(':')) {
    const afterColon = working.split(':').slice(1).join(':').trim();
    if (afterColon) working = afterColon;
  }

  working = working.replace(/master\s+bed\s+and\s+bath/gi, 'master bedroom, master bathroom');
  working = working.replace(/master\s+bedroom\s+and\s+bathroom/gi, 'master bedroom, master bathroom');

  const rawFragments = working
    .split(/[,;]|\band\b/gi)
    .map(fragment => fragment.trim())
    .filter(Boolean);

  const collected: string[] = [];

  rawFragments.forEach(fragment => {
    const normalized = normalizeRoomFragment(fragment, members, [...existingRooms, ...collected]);
    normalized.forEach(room => {
      const lower = room.toLowerCase();
      if (
        room &&
        !existingRooms.some(existing => existing.toLowerCase() === lower) &&
        !collected.some(existing => existing.toLowerCase() === lower)
      ) {
        collected.push(room);
      }
    });
  });

  if (!collected.length) {
    const fallbackNormalized = normalizeRoomFragment(working, members, [...existingRooms, ...collected]);
    fallbackNormalized.forEach(room => {
      const lower = room.toLowerCase();
      if (
        room &&
        !existingRooms.some(existing => existing.toLowerCase() === lower) &&
        !collected.some(existing => existing.toLowerCase() === lower)
      ) {
        collected.push(room);
      }
    });
  }

  return collected;
}

function dedupeMembers(list: Member[]) {
  const seen = new Set<string>();
  return list.filter(member => {
    const key = `${member.name.toLowerCase()}|${member.role.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeRooms(list: string[]) {
  const seen = new Set<string>();
  return list.filter(room => {
    const key = room.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeFamilyNameForCommit(rawName: string) {
  const trimmed = stripOuterQuotes((rawName ?? '').trim());
  if (!trimmed) return '';
  const collapsed = trimmed.replace(/\s+/g, ' ');
  const guessed = guessFamilyNameInput(collapsed);
  return guessed ?? toTitleCase(collapsed);
}

function normalizeEmail(value?: string | null) {
  const cleaned = (value ?? '').trim();
  if (!cleaned) return undefined;
  return cleaned.toLowerCase();
}

function sanitizeMembersForCommit(list: Member[]) {
  const seenEmails = new Set<string>();
  const cleaned = list
    .map(member => {
      const name = toTitleCase(stripOuterQuotes((member.name ?? '').trim()));
      const role = normalizeRole((member.role ?? '').trim());
      const email = normalizeEmail(member.email);
      return {
        name,
        role,
        ...(email ? { email } : {}),
      } as Member;
    })
    .filter(member => member.name && member.role);

  const dedupedByNameRole = dedupeMembers(cleaned);

  return dedupedByNameRole.filter(member => {
    if (!member.email) return true;
    const key = member.email.toLowerCase();
    if (seenEmails.has(key)) {
      return false;
    }
    seenEmails.add(key);
    return true;
  });
}

function sanitizeRoomsForCommit(list: string[]) {
  return dedupeRooms(
    list
      .map(value => stripOuterQuotes((value ?? '').trim()))
      .filter(Boolean)
      .filter(value => !shouldIgnoreRoomToken(value))
      .map(value => toTitleCase(value.replace(/\s+/g, ' ')))
  );
}

function prepareCommitData(payload: { family_name: string; members: Member[]; rooms: string[] }) {
  const normalizedFamily = normalizeFamilyNameForCommit(payload.family_name);

  const normalizedMembers = sanitizeMembersForCommit(payload.members);
  const normalizedRooms = sanitizeRoomsForCommit(payload.rooms);

  return {
    familyName: normalizedFamily,
    members: normalizedMembers,
    rooms: normalizedRooms,
    diagnostics: {
      rawFamily: payload.family_name,
      rawMemberCount: payload.members.length,
      normalizedMemberCount: normalizedMembers.length,
      rawRoomCount: payload.rooms.length,
      normalizedRoomCount: normalizedRooms.length,
    },
  } as const;
}

function buildFallbackResponse(state: OnboardingState, userMessage: string): LlmResponse {
  const trimmed = userMessage.trim();
  const lower = trimmed.toLowerCase();

  if (state.currentStep === 'greeting') {
    const guessedFamily = state.family_name ? undefined : guessFamilyNameInput(userMessage);
    const familyLabel = state.family_name || guessedFamily;
    return {
      assistant_reply:
        familyLabel
          ? `Wonderful. I'd love to get to know the people who make up ${familyLabel}. Who should we invite first?`
          : "Thanks for kicking things off! I'd love to know who will be using FamConomy with you—who should we invite first?",
      extracted: guessedFamily ? { family_name: guessedFamily } : {},
      next_step: familyLabel ? 'members' : 'greeting',
    };
  }

  if (state.currentStep === 'members') {
    if (containsPhrase(userMessage, MEMBER_DONE_PHRASES)) {
      const hasMembers = state.members.length > 0;
      return {
        assistant_reply: hasMembers
          ? "Perfect, I feel like I'm getting to know your family already. Let's talk about your space—what rooms or areas should we keep track of?"
          : "I'd love to know at least one person in your crew. Share a name and role, or tell me you'd like to skip this part for now.",
        extracted: {},
        next_step: hasMembers ? 'rooms' : 'members',
      };
    }

    if (lower.includes('spell') || (lower.includes('name') && lower.includes('wrong'))) {
      return {
        assistant_reply: "Thanks for pointing that out—I'd love to get the names right. Could you share each name again so I can fix them?",
        extracted: {},
        next_step: 'members',
      };
    }

    const inferredMembers = inferMembersFromMessage(userMessage);
    if (inferredMembers.length > 0) {
      const newMembers = inferredMembers.filter(
        m => !state.members.some(existing => existing.name.toLowerCase() === m.name.toLowerCase())
      );
      if (newMembers.length > 0) {
        const names = newMembers.map(m => `${m.name} (${m.role})`).join(', ');
        return {
          assistant_reply: `Love it! I'll add ${names}. Anyone else to invite?`,
          extracted: { members_add: newMembers },
          next_step: 'members',
        };
      }
    }

    const latest = state.members[state.members.length - 1]?.name;
    return {
      assistant_reply: latest
        ? `I bet ${latest} has a partner in crime. Tell me about another person in your crew—name and role work great!`
        : "I'd love to meet everyone. Who's the first family member we should add, and how are they connected to you?",
      extracted: {},
      next_step: 'members',
    };
  }

  if (state.currentStep === 'rooms') {
    const finished = containsPhrase(userMessage, ROOM_DONE_PHRASES);
    const inferredRooms = inferRoomsFromMessage(userMessage, state.rooms, state.members);
    if (inferredRooms.length > 0) {
      const listed = inferredRooms.join(', ');
      return {
        assistant_reply: finished
          ? `Great! I'll note ${listed}. That should cover everything for now—if another space pops up later, just let me know.`
          : `Great! I'll note ${listed}. Any other spaces you rely on?`,
        extracted: { rooms_add: inferredRooms },
        next_step: finished ? 'committed' : 'rooms',
      };
    }

    if (finished) {
      return {
        assistant_reply: "Sounds good—I'll get those spaces set up. If you think of another room later, just let me know.",
        extracted: {},
        next_step: 'committed',
      };
    }

    const latestRoom = state.rooms[state.rooms.length - 1];
    return {
      assistant_reply: latestRoom
        ? `I'm picturing ${latestRoom}. What other spaces should I know about so we can keep things organized for you?`
        : "Paint me a picture of your home. What's one room or space your family relies on a lot?",
      extracted: {},
      next_step: 'rooms',
    };
  }

  if (state.currentStep === 'committed') {
    return {
      assistant_reply: 'Amazing, I have what I need. Give me just a sec while I set everything up behind the scenes.',
      extracted: {},
      next_step: 'committed',
    };
  }

  return {
    assistant_reply:
      trimmed
        ? "Thanks for sharing that with me! Let me know anything else you'd like me to remember about your family."
        : "I'm here and ready whenever you want to tell me more about your family setup.",
    extracted: {},
    next_step: state.currentStep,
  };
}

/** ---------- Hook ---------- **/

export const useOnboarding = ({ familyId, userId }: UseOnboardingProps) => {
  const [state, setState] = useState<OnboardingState>(createInitialState());
  const identityRef = useRef<string | null>(null);
  const { checkAuthStatus } = useAuth();
  const { appendLinZMessage, appendUserMessage, updateLinZMessage } = useLinZChat();
  const [resolvedFamilyId, setResolvedFamilyId] = useState<number | null>(familyId);
  const resolvedFamilyIdRef = useRef<number | null>(familyId ?? null);
  const [allowFamilySync, setAllowFamilySync] = useState(true);
  const syncedCountRef = useRef(0);
  const streamingChatMessageIdRef = useRef<string | null>(null);
  const streamingContentRef = useRef<string | null>(null);
  const streamAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const nextIdentity = `${familyId ?? 'none'}:${userId ?? 'none'}`;
    if (identityRef.current === nextIdentity) return;
    const previousIdentity = identityRef.current;
    identityRef.current = nextIdentity;

    const nextResolvedFamilyId = typeof familyId === 'number' ? familyId : null;
    resolvedFamilyIdRef.current = nextResolvedFamilyId;
    setResolvedFamilyId(nextResolvedFamilyId);
    setAllowFamilySync(true);

    if (!previousIdentity) {
      streamingContentRef.current = null;
      setState(createInitialState());
      syncedCountRef.current = 0;
      return;
    }

    const [prevFamily = 'none', prevUser = 'none'] = previousIdentity.split(':');
    const [nextFamily = 'none', nextUser = 'none'] = nextIdentity.split(':');

    const userChanged = prevUser !== nextUser;
    const prevFamilyWasReal = prevFamily !== 'none';
    const familyChangedToDifferentReal = prevFamilyWasReal && prevFamily !== nextFamily;

    if (userChanged || familyChangedToDifferentReal) {
      streamingContentRef.current = null;
      setState(createInitialState());
      syncedCountRef.current = 0;
    }
  }, [familyId, userId]);

  useEffect(() => {
    if (!allowFamilySync) return;
    if (typeof familyId === 'number' && familyId !== resolvedFamilyId) {
      resolvedFamilyIdRef.current = familyId;
      setResolvedFamilyId(familyId);
    }
  }, [allowFamilySync, familyId, resolvedFamilyId]);

  useEffect(() => {
    resolvedFamilyIdRef.current = resolvedFamilyId;
  }, [resolvedFamilyId]);

  useEffect(() => {
    return () => {
      if (streamAbortControllerRef.current) {
        streamAbortControllerRef.current.abort();
        streamAbortControllerRef.current = null;
      }
    };
  }, []);

  const ensureFamilyId = useCallback(
    async (preferredName?: string) => {
      const existingId = resolvedFamilyIdRef.current;
      if (existingId) return existingId;
      if (!userId) return null;

      const fallbackName = preferredName?.trim() || state.family_name.trim() || 'My Family';

      try {
        onboardingDebug.log('Ensuring family id', { preferredName: preferredName ?? state.family_name });
        const response = await apiClient.post('/family', { familyName: fallbackName || 'My Family' });
        const newFamilyId: number | undefined =
          response.data?.FamilyID ?? response.data?.familyId ?? response.data?.id;

        if (typeof newFamilyId !== 'number') {
          throw new Error('Family creation did not return a valid FamilyID.');
        }

        resolvedFamilyIdRef.current = newFamilyId;
        setResolvedFamilyId(newFamilyId);
        setAllowFamilySync(true);
        try {
          await checkAuthStatus();
        } catch (authError) {
          onboardingStreamDebug.warn('Failed to refresh auth after family creation', authError);
        }
        onboardingDebug.log('Family id resolved', { newFamilyId });
        return newFamilyId;
      } catch (error) {
        onboardingStreamDebug.error('Failed to ensure familyId during onboarding', error);
        return null;
      }
    },
    [resolvedFamilyId, userId, state.family_name, checkAuthStatus]
  );

  /** Hydrate short-term memory from server (stored as TEXT of JSON) */
  const hasUserMessages = state.messages.some(message => message.sender === 'user');

  useEffect(() => {
    const hydrate = async () => {
      if (hasUserMessages) {
        onboardingDebug.log('Skipping hydration because user has already interacted.');
        return;
      }
      if (!resolvedFamilyId || !userId) {
        setState(prev => ({ ...prev, hydrated: true }));
        return;
      }
      setState(prev => ({ ...prev, loading: true, error: null }));
      try {
        const res = await apiClient.get(`/linz/context/hydrate?familyId=${resolvedFamilyId}&userId=${userId}`);
        const { onboardingMemory, existingFacts } = res.data as {
          onboardingMemory: Array<{ namespace: string; key: string; value: string }>;
          existingFacts: Array<{ key: string; value: any }>;
        };

        let family_name = '';
        let members: Member[] = [];
        let rooms: string[] = [];
        const msgs: { sender: 'LinZ' | 'user'; text: string }[] = [];

        onboardingMemory?.forEach(mem => {
          if (mem.namespace && mem.namespace !== 'onboarding') return;
          try {
            const v = JSON.parse(mem.value);
            if (mem.key === 'family_name' && typeof v === 'string') family_name = v;
            if (mem.key === 'member_candidates' && Array.isArray(v)) members = v;
            if (mem.key === 'room_candidates' && Array.isArray(v)) rooms = v;
          } catch (e) {
            // ignore invalid memory rows
          }
        });

        const factMap = new Map(existingFacts?.map(f => [f.key, f.value]) ?? []);

        if (!family_name) {
          const factFamily = factMap.get('family.name');
          if (typeof factFamily === 'string') {
            family_name = factFamily;
          } else if (factFamily && typeof factFamily === 'object' && 'value' in factFamily && typeof factFamily.value === 'string') {
            family_name = factFamily.value;
          }
        }

        if (!members.length) {
          const factMembers = factMap.get('onboarding.members');
          if (Array.isArray(factMembers)) {
            members = factMembers
              .map((m: any) => ({
                name: typeof m?.name === 'string' ? m.name : '',
                role: typeof m?.relationshipName === 'string' ? m.relationshipName : typeof m?.role === 'string' ? m.role : '',
                email: typeof m?.email === 'string' ? m.email : undefined,
              }))
              .filter(member => member.name);
          }
        }

        if (!rooms.length) {
          const factRooms = factMap.get('onboarding.rooms');
          if (Array.isArray(factRooms)) {
            rooms = factRooms.filter((room: any) => typeof room === 'string');
          }
        }

        members = dedupeMembers(members.map(member => ({
          ...member,
          name: toTitleCase(member.name),
          role: member.role ? toTitleCase(member.role) : '',
        })));

        rooms = dedupeRooms(rooms.map(room => toTitleCase(room)));

        const slot_status = deriveSlotStatus(family_name, members, rooms);
        let currentStep = deriveNextStep(slot_status);
        let awaitingResetConfirmation = false;
        let messagesSeed = [...initialState.messages];

        const factStatus = factMap.get('onboarding.status');
        const statusValue = typeof factStatus === 'string'
          ? factStatus
          : factStatus && typeof factStatus === 'object' && 'state' in factStatus
            ? (factStatus as any).state
            : undefined;

        if (statusValue === 'completed') {
          currentStep = 'completed';
          awaitingResetConfirmation = true;
          messagesSeed = [
            {
              sender: 'LinZ',
              text: 'Welcome back to onboarding! Would you like to start over?',
            },
          ];
        } else if (statusValue === 'committed') {
          currentStep = 'committed';
        }

        if (!awaitingResetConfirmation) {
          // Keep an opening line—AI will take over after the first user reply
          msgs.push(...initialState.messages);
        } else {
          msgs.push(...messagesSeed);
        }

        setState(prev => {
          const userHasInteracted = prev.messages.some(message => message.sender === 'user');

          if (userHasInteracted) {
            return {
              ...prev,
              family_name,
              members,
              rooms,
              slot_status,
              currentStep,
              loading: false,
              hydrated: true,
              awaitingResetConfirmation,
              streamingMessage: prev.streamingMessage,
            };
          }

          streamingContentRef.current = null;

          return {
            ...prev,
            family_name,
            members,
            rooms,
            slot_status,
            currentStep,
            messages: msgs,
            loading: false,
            hydrated: true,
            awaitingResetConfirmation,
            streamingMessage: null,
          };
        });
      } catch (err: any) {
        setState(prev => {
          const userHasInteracted = prev.messages.some(message => message.sender === 'user');
          if (!userHasInteracted) {
            streamingContentRef.current = null;
          }
          return {
            ...prev,
            loading: false,
            error: err.message ?? 'Failed to hydrate',
            hydrated: true,
            streamingMessage: userHasInteracted ? prev.streamingMessage : null,
          };
        });
      }
    };
    void hydrate();
  }, [resolvedFamilyId, userId, hasUserMessages]);

  /** Persist short-term memory as TEXT (JSON-stringified) */
  const updateMemory = useCallback(
    async (key: string, value: any, namespace = 'onboarding') => {
      if (!userId) return;

      let targetFamilyId = resolvedFamilyId;

      if (!targetFamilyId) {
        if (key === 'family_name' && typeof value === 'string') {
          targetFamilyId = await ensureFamilyId(value);
        } else if (state.family_name) {
          targetFamilyId = await ensureFamilyId(state.family_name);
        }
      }

      if (!targetFamilyId) return;

      try {
        onboardingDebug.log('Persisting memory item', { key, hasValue: value !== undefined, namespace });
        await apiClient.put('/linz/memory', {
          items: [{ familyId: targetFamilyId, userId, namespace, key, value: JSON.stringify(value) }],
        });
      } catch (err: any) {
        setState(prev => ({ ...prev, error: `Failed to save ${key}.` }));
      }
    },
    [resolvedFamilyId, ensureFamilyId, userId, state.family_name]
  );

  /** Commit once all three slots are filled */
  const commitOnboardingData = useCallback(
    async (override?: { family_name: string; members: Member[]; rooms: string[] }) => {
      if (!userId) return false;
      const targetFamilyId = resolvedFamilyId ?? (await ensureFamilyId());
      if (!targetFamilyId) {
        setState(prev => ({ ...prev, error: 'Unable to create family record.' }));
        return false;
      }
      const family_name = override?.family_name ?? state.family_name;
      const members = override?.members ?? state.members;
      const rooms = override?.rooms ?? state.rooms;

      const prepared = prepareCommitData({ family_name, members, rooms });
      const commitFamilyName = prepared.familyName || stripOuterQuotes(family_name.trim());
      const commitMembers = prepared.members;
      const commitRooms = prepared.rooms;

      onboardingDebug.log('Commit evaluation', {
        familyId: targetFamilyId,
        ...prepared.diagnostics,
      });

      if (!commitFamilyName) {
        setState(prev => ({ ...prev, loading: false, error: 'Family name is incomplete—please confirm it before continuing.' }));
        return false;
      }

      if (!commitMembers.length) {
        setState(prev => ({ ...prev, loading: false, error: 'Member details need another look before we can continue.' }));
        return false;
      }

      if (!commitRooms.length) {
        setState(prev => ({ ...prev, loading: false, error: 'Please share at least one room or space to finish onboarding.' }));
        return false;
      }

      onboardingDebug.log('Committing onboarding data', {
        familyId: targetFamilyId,
        memberCount: commitMembers.length,
        roomCount: commitRooms.length,
      });
      setState(prev => ({ ...prev, loading: true }));
      try {
        const res = await apiClient.post('/onboarding/commit', {
          familyId: targetFamilyId,
          userId,
          family_name: commitFamilyName,
          members: commitMembers,
          rooms: commitRooms,
        });

        const payload = res.data as { rooms?: string[]; message?: string } | undefined;
        const updatedRooms = payload?.rooms?.length
          ? sanitizeRoomsForCommit(payload.rooms)
          : commitRooms;

        const slot_status = deriveSlotStatus(commitFamilyName, commitMembers, updatedRooms);

        onboardingDebug.log('Commit successful', {
          familyId: targetFamilyId,
          message: payload?.message,
          returnedRooms: payload?.rooms?.length ?? 0,
        });

        setStoredActiveFamilyId(targetFamilyId);

        setAllowFamilySync(true);
        setState(prev => ({
          ...prev,
          loading: false,
          family_name: commitFamilyName,
          members: commitMembers,
          rooms: updatedRooms,
          slot_status,
          currentStep: 'committed',
          error: null,
        }));
        return true;
      } catch (err: any) {
        const message = err?.response?.data?.error || err.message || 'Failed to commit onboarding';
        onboardingDebug.error('Commit failed', message);
        setState(prev => ({ ...prev, loading: false, error: message }));
        return false;
    }
  }, [resolvedFamilyId, ensureFamilyId, userId, state.family_name, state.members, state.rooms]);

  /** Ask the AI for a natural reply + slot extraction, then update state/memory */
  const processUserResponse = useCallback(
    async (userMessage: string) => {
      onboardingDebug.log('Processing user response', {
        currentStep: state.currentStep,
        message: userMessage,
        memberCount: state.members.length,
        roomCount: state.rooms.length,
      });

      if (streamAbortControllerRef.current) {
        streamAbortControllerRef.current.abort();
        streamAbortControllerRef.current = null;
      }

      streamingContentRef.current = null;

      setState(prev => {
        const hasAnyUserMessage = prev.messages.some(message => message.sender === 'user');
        const nextStreaming = hasAnyUserMessage ? '' : null;
        streamingContentRef.current = nextStreaming;
        return {
          ...prev,
          streamingMessage: nextStreaming,
        };
      });

      let streamResult: StreamingAssistantResult | null = null;
      let aborted = false;
      let streamError: unknown = null;
      if (userId) {
        const historyForStream = state.messages.slice(-10);
        const controller = new AbortController();
        streamAbortControllerRef.current = controller;
        try {
          streamResult = await callStreamingOnboardingAssistant(
            userMessage,
            resolvedFamilyId,
            userId,
            historyForStream,
            message => {
              setState(prev => {
                streamingContentRef.current = message;
                return { ...prev, streamingMessage: message };
              });
            },
            { signal: controller.signal }
          );
        } catch (error) {
          const isAbortError =
            controller.signal.aborted ||
            (typeof error === 'object' && error !== null && 'name' in error && (error as any).name === 'AbortError');

          if (isAbortError) {
            aborted = true;
            onboardingStreamDebug.log('Streaming onboarding assistant request aborted for latest prompt');
          } else {
            streamError = error;
            onboardingStreamDebug.error('Streaming onboarding assistant call failed', error);
          }
        } finally {
          if (streamAbortControllerRef.current === controller) {
            streamAbortControllerRef.current = null;
          }
        }
      }

      if (aborted) {
        return;
      }

      if (streamError) {
        onboardingDebug.warn('Continuing after streaming assistant error', streamError);
      }

      let assistantReply = streamResult?.assistant_reply?.trim() ?? '';
      let family_name = state.family_name;
      let members = [...state.members];
      let rooms = [...state.rooms];
      let suggestedNextStep: OnboardingState['currentStep'] | undefined;
      let extracted: LlmResponse['extracted'] = {};
      let fallbackApplied = false;
      const streamState = streamResult?.state;
      const streamHasContent = streamResult?.hasContent ?? false;
      const streamCompleted = streamResult?.completed ?? false;
      const hasStreamState = Boolean(streamState);
      let hasAssistantReply = assistantReply.length > 0;

      if (!hasAssistantReply) {
        const streamedContent = streamingContentRef.current?.trim();
        if (streamedContent) {
          assistantReply = streamedContent;
          hasAssistantReply = true;
        }
      }

      if (streamState) {
        const { family_name: fam, members: mems, rooms: rms, next_step } = streamState;

        if (fam) {
          const normalizedFamily = fam.trim();
          if (normalizedFamily && normalizedFamily !== family_name) {
            family_name = normalizedFamily;
            await updateMemory('family_name', family_name);
          }
        }

        if (Array.isArray(mems)) {
          const cleanedMembers = mems
            .map(m => ({ name: m.name?.trim(), role: m.role?.trim(), email: m.email?.trim() || undefined }))
            .filter(m => m.name && m.role) as Member[];
          if (cleanedMembers.length) {
            const deduped = dedupeMembers(cleanedMembers);
            const prevSnapshot = JSON.stringify(
              members.map(m => ({ name: m.name, role: m.role, email: m.email ?? null }))
            );
            const nextSnapshot = JSON.stringify(
              deduped.map(m => ({ name: m.name, role: m.role, email: m.email ?? null }))
            );
            if (prevSnapshot !== nextSnapshot) {
              members = deduped;
              await updateMemory('member_candidates', members);
            }
          }
        }

        if (Array.isArray(rms)) {
          const cleanedRooms = dedupeRooms(
            rms
              .map(room => toTitleCase((room || '').trim()))
              .filter(Boolean)
          );
          if (cleanedRooms.length) {
            const prevSnapshot = JSON.stringify(rooms);
            const nextSnapshot = JSON.stringify(cleanedRooms);
            if (prevSnapshot !== nextSnapshot) {
              rooms = cleanedRooms;
              await updateMemory('room_candidates', rooms);
            }
          }
        }

        if (next_step && ['greeting', 'members', 'rooms', 'committed', 'completed'].includes(next_step)) {
          suggestedNextStep = next_step as OnboardingState['currentStep'];
        }
      }

      const deriveReplyFromState = (state: StreamingOnboardingState | null): string | null => {
        if (!state) return null;
        const { next_step, family_name: fam, members: mems, rooms: rms } = state;

        const familyLabel = fam?.trim() || 'your family';
        const memberCount = Array.isArray(mems) ? mems.length : 0;
        const roomCount = Array.isArray(rms) ? rms.length : 0;
        const memberSummary = memberCount
          ? `${memberCount} member${memberCount === 1 ? '' : 's'}`
          : 'no members yet';
        const roomSummary = roomCount
          ? `${roomCount} room${roomCount === 1 ? '' : 's'}`
          : 'no rooms yet';

        switch (next_step) {
          case 'members':
            return 'Great! Tell me about the people we should include next.';
          case 'rooms':
            return "Awesome—let's talk about the rooms or spaces you want to track.";
          case 'committed':
          case 'completed':
            return `All set! I've saved ${familyLabel} with ${memberSummary} and ${roomSummary}. You're ready to continue.`;
          default:
            return null;
        }
      };

      const applyFallback = async (options?: { delay?: boolean }) => {
        const fallbackState: OnboardingState = {
          ...state,
          family_name,
          members,
          rooms,
          slot_status: deriveSlotStatus(family_name, members, rooms),
        };
        if (fallbackApplied) return;
        if (options?.delay !== false) {
          await delay(FALLBACK_DELAY_MS);
          const streamingSnapshot = streamingContentRef.current?.trim() ?? '';
          if (assistantReply.trim() || streamingSnapshot) {
            if (!assistantReply.trim() && streamingSnapshot) {
              assistantReply = streamingSnapshot;
            }
            hasAssistantReply = assistantReply.length > 0;
            onboardingDebug.warn('Skipping fallback after delay because assistant reply arrived', {
              assistantReply,
              streamHasContent,
              streamCompleted,
              streamingRef: streamingContentRef.current,
            });
            return;
          }
        }
        fallbackApplied = true;
        const fallback = buildFallbackResponse(fallbackState, userMessage);
        assistantReply = fallback.assistant_reply;
        hasAssistantReply = assistantReply.length > 0;
        extracted = fallback.extracted ?? {};
        if (fallback.next_step) {
          suggestedNextStep = fallback.next_step;
        }
        streamingContentRef.current = assistantReply;
        onboardingDebug.warn('Fallback applied', {
          assistantReply,
          extracted,
          streamHasContent,
          streamCompleted,
          userMessage,
        });
      };

      if (!streamResult) {
        onboardingDebug.warn('Applying fallback', {
          reason: 'streamResult null',
          userMessage,
        });
        await applyFallback();
      } else {
        if (!hasAssistantReply && streamHasContent) {
          assistantReply = streamResult.assistant_reply?.trim() ?? '';
          hasAssistantReply = assistantReply.length > 0;
        }

        if (!hasAssistantReply) {
          const stateReply = deriveReplyFromState(streamState ?? null);
          if (stateReply) {
            assistantReply = stateReply;
            hasAssistantReply = true;
          }
        }

        if (!hasAssistantReply && streamCompleted && !hasStreamState) {
          onboardingDebug.warn('Applying fallback', {
            reason: 'completed without assistant reply',
            assistantReply,
            streamHasContent,
            streamCompleted,
            streamingRef: streamingContentRef.current,
          });
          await applyFallback();
        }
      }

      if (!fallbackApplied && !hasAssistantReply && !streamHasContent && !hasStreamState) {
        onboardingDebug.warn('Applying fallback', {
          reason: 'no content received',
          assistantReply,
          streamHasContent,
          streamCompleted,
          streamingRef: streamingContentRef.current,
        });
        await applyFallback();
      }

      if (extracted.family_name && !family_name) {
        family_name = extracted.family_name.trim();
        await updateMemory('family_name', family_name);
      }

      if (Array.isArray(extracted.members_add) && extracted.members_add.length > 0) {
        const cleaned = extracted.members_add
          .map(m => ({ name: m.name?.trim(), role: m.role?.trim(), email: m.email?.trim() }))
          .filter(m => m.name && m.role) as Member[];
        if (cleaned.length) {
          members = dedupeMembers([...members, ...cleaned]);
          await updateMemory('member_candidates', members);
        }
      }

      if (fallbackApplied) {
        const extractedRooms = sanitizeExtractedRooms(extracted.rooms_add);
        if (extractedRooms.length) {
          rooms = dedupeRooms([...rooms, ...extractedRooms.map(room => toTitleCase(room))]);
          await updateMemory('room_candidates', rooms);
        }
      }

      const userDoneAddingMembers = containsPhrase(userMessage, MEMBER_DONE_PHRASES);
      if (state.currentStep === 'members' && userDoneAddingMembers) {
        suggestedNextStep = members.length > 0 ? 'rooms' : 'members';
        if (!assistantReply) {
          assistantReply = members.length > 0
            ? "Perfect, let's talk about your space—what rooms or areas should we keep track of?"
            : "I'd love to know at least one person in your crew. Share a name and role, or tell me you'd like to skip this part for now.";
        }
      }

      const userDoneAddingRooms = containsPhrase(userMessage, ROOM_DONE_PHRASES);
      if (state.currentStep === 'rooms') {
        if (userDoneAddingRooms) {
          suggestedNextStep = 'committed';
          if (!assistantReply) {
            assistantReply = "Sounds good—I'll get those spaces set up. If you think of another room later, just let me know.";
          }
        }
      }

      const slot_status = deriveSlotStatus(family_name, members, rooms);
      const suggested = suggestedNextStep ?? state.currentStep;
      const computed = deriveNextStep(slot_status);
      const nextStep: OnboardingState['currentStep'] =
        suggested && ['greeting', 'members', 'rooms', 'committed', 'completed'].includes(suggested)
          ? (suggested as OnboardingState['currentStep'])
          : computed;

      const finalAssistantReply = assistantReply;

      setState(prev => {
        streamingContentRef.current = null;
        return {
          ...prev,
          family_name,
          members,
          rooms,
          slot_status,
          currentStep: nextStep,
          messages: [...prev.messages, { sender: 'LinZ', text: finalAssistantReply }],
          streamingMessage: null,
        };
      });

      const shouldCommit =
        slot_status.family_name === 'filled' &&
        slot_status.members === 'filled' &&
        slot_status.rooms === 'filled' &&
        (nextStep === 'committed' || nextStep === 'completed' || streamState?.next_step === 'completed');

      onboardingDebug.log('Commit evaluation', {
        currentStep: state.currentStep,
        nextStep,
        streamNextStep: streamState?.next_step,
        slot_status,
        membersCount: members.length,
        roomsCount: rooms.length,
        shouldCommit,
      });

      if (shouldCommit) {
        await commitOnboardingData({ family_name, members, rooms });
      }
    },
    [state, updateMemory, commitOnboardingData, resolvedFamilyId, userId]
  );

  const resetOnboarding = useCallback(
    async (options?: { skipServer?: boolean }) => {
      const skipServer = options?.skipServer ?? false;

      const applyLocalReset = (syncFamily = true) => {
        syncedCountRef.current = 0;
        streamingChatMessageIdRef.current = null;
        if (!syncFamily) {
          setAllowFamilySync(false);
        resolvedFamilyIdRef.current = null;
        setResolvedFamilyId(null);
        } else {
          setAllowFamilySync(true);
        }
        streamingContentRef.current = null;
        setState(() => createHydratedInitialState());
      };

      if (skipServer) {
        applyLocalReset(false);
        return;
      }

      if (!userId) {
        applyLocalReset(false);
        return;
      }

      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        const targetFamilyId = resolvedFamilyId ?? familyId ?? null;
        await apiClient.post('/onboarding/reset', {
          userId,
          ...(targetFamilyId ? { familyId: targetFamilyId } : {}),
        });

        applyLocalReset(true);
      } catch (err: any) {
      const message = err?.response?.data?.error || err.message || 'Failed to reset onboarding';
      setState(prev => {
        streamingContentRef.current = '';
        return { ...prev, loading: false, error: message, streamingMessage: '' };
      });
      }
    },
    [familyId, resolvedFamilyId, userId]
  );

  /** Public send */
  const sendUserMessage = useCallback(
    async (text: string) => {
      const msg = text.trim();
      if (!msg) return;
      // Handle reset confirmations or commands before invoking the assistant
      const lowerMsg = msg.toLowerCase();

      const processResetConfirmation = async (action: 'accept' | 'decline' | 'unknown') => {
        if (action === 'accept') {
          setState(prev => {
            streamingContentRef.current = '';
            return {
              ...prev,
              awaitingResetConfirmation: false,
              messages: [...prev.messages, { sender: 'user', text: msg }],
              streamingMessage: '',
            };
          });

          await resetOnboarding();

          setState(prev => {
            streamingContentRef.current = '';
            return {
              ...prev,
              messages: [
                {
                  sender: 'LinZ',
                  text: 'All right—starting fresh! Tell me what your family should be called.',
                },
              ],
              streamingMessage: '',
            };
          });
          return true;
        }

        const responseText = action === 'decline'
          ? "No problem! Everything will stay just the way it is. If you change your mind, just say \"reset onboarding.\""
          : "Totally fine! If you decide you want to start over later, just let me know by saying \"reset onboarding.\"";

        setState(prev => {
          streamingContentRef.current = '';
          return {
            ...prev,
            awaitingResetConfirmation: false,
            messages: [
              ...prev.messages,
              { sender: 'user', text: msg },
              { sender: 'LinZ', text: responseText },
            ],
            streamingMessage: '',
          };
        });
        return true;
      };

      const wantsResetCommand = containsPhrase(lowerMsg, RESET_COMMAND_PHRASES);

      if (state.awaitingResetConfirmation || wantsResetCommand) {
        if (wantsResetCommand && !state.awaitingResetConfirmation) {
          // Treat direct command as acceptance
          setState(prev => ({ ...prev, awaitingResetConfirmation: true }));
          await processResetConfirmation('accept');
          return;
        }

        const action = containsPhrase(lowerMsg, RESET_YES_PHRASES)
          ? 'accept'
          : containsPhrase(lowerMsg, RESET_NO_PHRASES)
            ? 'decline'
            : 'unknown';

        await processResetConfirmation(action as 'accept' | 'decline' | 'unknown');
        return;
      }

      setState(prev => ({ ...prev, messages: [...prev.messages, { sender: 'user', text: msg }] }));
      await processUserResponse(msg);
    },
    [processUserResponse, state.awaitingResetConfirmation, resetOnboarding]
  );

  useEffect(() => {
    if (!appendLinZMessage || !appendUserMessage) return;
    if (!state.messages.length) return;

    const startIndex = syncedCountRef.current;
    if (state.messages.length <= startIndex) return;

    const newMessages = state.messages.slice(startIndex);
    newMessages.forEach(message => {
      const text = message.text.trim();
      if (!text) return;
      if (message.sender === 'LinZ') {
        appendLinZMessage(text, { meta: { source: 'onboarding' } });
      } else {
        appendUserMessage(text, { meta: { source: 'onboarding' } });
      }
    });

    syncedCountRef.current = state.messages.length;
  }, [state.messages, appendLinZMessage, appendUserMessage]);

  const markCompleted = useCallback(() => {
    setState(prev => ({ ...prev, currentStep: 'completed', awaitingResetConfirmation: false }));
  }, []);

  return {
    state,
    sendUserMessage,
    commitOnboardingData,
    resetOnboarding,
    markCompleted,
  };
};
