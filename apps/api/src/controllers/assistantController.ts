console.log('--- DEBUG: Loading assistantController.ts ---');
import { Request, Response } from 'express';
import { prisma } from '../db';
import { MealSlot, Prisma } from '@prisma/client';
import OpenAI from 'openai';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { _createTaskInternal } from '../controllers/taskController';
import type { Server } from 'socket.io';

let socketServer: Server | null = null;

export const setAssistantIoInstance = (server: Server | null) => {
  socketServer = server;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const shouldLogOnboardingStream = process.env.DEBUG_ONBOARDING === 'true';
const logOnboardingStream = (...args: any[]) => {
  if (shouldLogOnboardingStream) {
    console.log('[onboarding-stream]', ...args);
  }
};

const MAX_HISTORY_MESSAGES = 40;
const FACT_CONTEXT_LIMIT = 20;
const SHORT_TERM_CONTEXT_LIMIT = 15;

const trimConversationHistory = (
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] => {
  if (messages.length <= MAX_HISTORY_MESSAGES) {
    return messages;
  }

  const systemMessageIndex = messages.findIndex((msg) => msg.role === 'system');
  const systemMessage = systemMessageIndex >= 0 ? messages[systemMessageIndex] : null;
  const sliced = messages.slice(-MAX_HISTORY_MESSAGES);

  if (!systemMessage) {
    return sliced;
  }

  const alreadyContainsSystem = sliced.some((msg) => msg.role === 'system');
  if (alreadyContainsSystem) {
    return sliced;
  }

  const withoutSystem = sliced.filter((msg) => msg.role !== 'system');
  const trimmed = [systemMessage, ...withoutSystem];
  return trimmed.slice(-MAX_HISTORY_MESSAGES);
};

const persistConversationChunk = async (
  params: {
    familyId: number;
    userId?: string;
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  },
) => {
  const { familyId, userId, messages } = params;
  if (!messages.length) {
    return;
  }

  try {
    const sanitizedEntries = messages.map((msg) => {
      const base: Record<string, unknown> = {
        role: msg.role,
      };

      if (msg.content !== undefined && msg.content !== null && msg.content !== '') {
        base.content = msg.content;
      }

      if ('name' in msg && msg.name) {
        base.name = msg.name;
      }

      if ('tool_call_id' in msg && msg.tool_call_id) {
        base.toolCallId = msg.tool_call_id;
      }

      if ('tool_calls' in msg && msg.tool_calls) {
        base.toolCalls = msg.tool_calls.map((toolCall) => ({
          id: toolCall.id,
          name: toolCall.function.name,
        }));
      }

      return base;
    });

    await prisma.linZConversation.create({
      data: {
        familyId,
        userId: userId ?? null,
        content: JSON.stringify({
          capturedAt: new Date().toISOString(),
          entries: sanitizedEntries,
        }),
      },
    });
  } catch (error) {
    console.warn('Failed to persist conversation chunk', { error });
  }
};

const formatJsonValue = (value: Prisma.JsonValue): string => {
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch (error) {
    console.warn('Failed to stringify JSON value for memory context', { error });
    return '[unserializable value]';
  }
};

const parseMemoryValue = (value: string): string => {
  if (!value) {
    return '';
  }
  try {
    const parsed = JSON.parse(value);
    if (parsed === null) return 'null';
    if (typeof parsed === 'string') return parsed;
    if (typeof parsed === 'number' || typeof parsed === 'boolean') return String(parsed);
    return JSON.stringify(parsed);
  } catch (err) {
    return value;
  }
};

const truncateValue = (value: string, maxLength = 180): string => {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
};

const parseISODateOnly = (value: string): Date => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid startDate '${value}'. Use an ISO 8601 date string (e.g., 2025-09-27).`);
  }
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
};

const startOfIsoWeekMonday = (value: Date): Date => {
  const result = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  const day = result.getUTCDay();
  const diff = (day + 6) % 7; // convert Sunday=0 to Monday=0
  result.setUTCDate(result.getUTCDate() - diff);
  return result;
};

const addDaysUtc = (value: Date, days: number): Date => {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

const formatISODateOnly = (value: Date): string => value.toISOString().split('T')[0];


type MealPlanWeekWithEntries = Prisma.MealPlanWeekGetPayload<{
  include: {
    Entries: {
      include: {
        Meal: {
          select: { Title: true };
        };
      };
    };
  };
}>;


const parseMealListString = (raw: string): string[] => {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => (typeof item === 'string' ? item : String(item)))
        .filter(Boolean);
    }
    if (parsed && Array.isArray((parsed as any).meals)) {
      return (parsed as any).meals
        .map((item: unknown) => (typeof item === 'string' ? item : String(item)))
        .filter(Boolean);
    }
    if (parsed && Array.isArray((parsed as any).items)) {
      return (parsed as any).items
        .map((item: unknown) => (typeof item === 'string' ? item : String(item)))
        .filter(Boolean);
    }
    if (typeof parsed === 'string') {
      return parsed
        .split(/[\n,;]/)
        .map((token) => token.trim())
        .filter((token) => token.length > 0);
    }
  } catch (error) {
    // ignore parse errors
  }
  return raw
    .split(/[\n,;]/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
};

const extractMealsFromMemories = (
  memories: Array<{ key: string; value: string }>,
  keys: string[]
): string[] => {
  const meals: string[] = [];
  memories.forEach((memory) => {
    if (keys.includes(memory.key) && memory.value) {
      meals.push(...parseMealListString(memory.value));
    }
  });
  const uniqueMeals = Array.from(new Set(meals.map((meal) => meal.trim()).filter(Boolean)));
  return uniqueMeals.slice(0, 12);
};

const convertMealPlanWeekToDraft = (week: MealPlanWeekWithEntries): GeneratedMealPlan => {
  const base = startOfIsoWeekMonday(new Date(week.WeekStart));
  const slotsSet = new Set<MealSlot>();
  const mealSet = new Set<string>();
  const dayMap = new Map<string, Array<{ slot: MealSlot; meal: string }>>();

  week.Entries.forEach((entry) => {
    const dayOffset = typeof entry.DayOfWeek === 'number' ? entry.DayOfWeek : 0;
    const dateKey = formatISODateOnly(addDaysUtc(base, dayOffset));
    const slot = entry.MealSlot as MealSlot;
    const mealName = entry.Meal?.Title ?? 'Meal';

    slotsSet.add(slot);
    if (mealName) {
      mealSet.add(mealName);
    }

    const slotsForDay = dayMap.get(dateKey) ?? [];
    slotsForDay.push({ slot, meal: mealName });
    dayMap.set(dateKey, slotsForDay);
  });

  const days = Array.from(dayMap.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, slots]) => ({
      date,
      slots: slots.sort((a, b) => a.slot.localeCompare(b.slot)),
    }));

  return {
    summary: 'Meal plan from week of ' + formatISODateOnly(base),
    weekStart: formatISODateOnly(base),
    slots: Array.from(slotsSet.values()),
    mealsConsidered: Array.from(mealSet.values()),
    days,
  };
};

type MealSuggestionBuildParams = {
  prismaClient: typeof prisma;
  familyId: number;
  mealPlanDraft: GeneratedMealPlan | null;
  shortTermMemories: Array<{ key: string; value: string }>;
  message: string;
};

const buildMealPlannerSuggestions = async ({
  prismaClient,
  familyId,
  mealPlanDraft,
  shortTermMemories,
  message,
}: MealSuggestionBuildParams): Promise<{ suggestions: AssistantSuggestion[]; actions: AssistantAction[] }> => {
  const suggestions: AssistantSuggestion[] = [];
  const actions: AssistantAction[] = [];
  const usedLabels = new Set<string>();

  const addSuggestion = (suggestion: AssistantSuggestion, action?: AssistantAction) => {
    if (!suggestion?.label || usedLabels.has(suggestion.label)) {
      return;
    }
    suggestions.push(suggestion);
    if (action) {
      actions.push(action);
    }
    usedLabels.add(suggestion.label);
  };

  if (mealPlanDraft) {
    addSuggestion(
      {
        label: 'Apply generated plan',
        action: 'mealPlan.applyGenerated',
        payload: { plan: mealPlanDraft },
        tone: 'primary',
      },
      { type: 'mealPlan.applyGenerated', payload: { plan: mealPlanDraft } }
    );
  }

  const memoryMeals = extractMealsFromMemories(shortTermMemories, [
    'meal_suggestions',
    'favorite_meals',
    'meal_favorites',
  ]);

  const messageMentionsMeals = /meal|dinner|lunch|breakfast|cook|menu|food|recipe|plan/i.test(message ?? '');
  const shouldHydrateHistorical = Boolean(mealPlanDraft || messageMentionsMeals || memoryMeals.length);

  if (shouldHydrateHistorical) {
    try {
      const recentWeek = await prismaClient.mealPlanWeek.findFirst({
        where: { FamilyID: familyId },
        orderBy: { WeekStart: 'desc' },
        include: {
          Entries: {
            include: {
              Meal: { select: { Title: true } },
            },
          },
        },
      });

      if (recentWeek && recentWeek.Entries.length) {
        const pastPlanDraft = convertMealPlanWeekToDraft(recentWeek as MealPlanWeekWithEntries);
        addSuggestion(
          {
            label: 'Reuse plan from week of ' + pastPlanDraft.weekStart,
            action: 'mealPlan.reusePastWeek',
            payload: { plan: pastPlanDraft },
            tone: mealPlanDraft ? 'secondary' : 'primary',
          },
          { type: 'mealPlan.reusePastWeek', payload: { plan: pastPlanDraft } }
        );
      }
    } catch (error) {
      console.warn('Failed to fetch past meal plan for suggestions', error);
    }

    try {
      const favoriteMeals = await prismaClient.meal.findMany({
        where: { FamilyID: familyId, IsFavorite: true },
        orderBy: { UpdatedAt: 'desc' },
        take: 8,
        select: { Title: true },
      });

      const favoriteNames = favoriteMeals
        .map((meal) => meal.Title)
        .filter((title): title is string => Boolean(title));

      if (favoriteNames.length) {
        addSuggestion(
          {
            label: 'Build plan from favorites',
            action: 'mealPlan.fromFavorites',
            payload: { meals: favoriteNames },
            tone: 'secondary',
          },
          { type: 'mealPlan.fromFavorites', payload: { meals: favoriteNames } }
        );
      }
    } catch (error) {
      console.warn('Failed to fetch favorite meals for suggestions', error);
    }
  }

  if (memoryMeals.length) {
    addSuggestion(
      {
        label: 'Use recent meal ideas',
        action: 'mealPlan.fromConversation',
        payload: { meals: memoryMeals },
        tone: mealPlanDraft ? 'neutral' : 'primary',
      },
      { type: 'mealPlan.fromConversation', payload: { meals: memoryMeals } }
    );
  }

  return { suggestions, actions };
};
type AssistantSuggestionTone = 'primary' | 'secondary' | 'neutral';

interface AssistantSuggestion {
  label: string;
  action: string;
  payload?: Record<string, unknown>;
  tone?: AssistantSuggestionTone;
}

interface AssistantAction {
  type: string;
  payload?: Record<string, unknown>;
}

interface GeneratedMealPlan {
  summary: string;
  weekStart: string;
  slots: MealSlot[];
  mealsConsidered: string[];
  days: Array<{ date: string; slots: Array<{ slot: MealSlot; meal: string }> }>;
}

type TourAudience = 'parent' | 'guardian' | 'child' | 'other';

const parseTourStatusValue = (raw?: string | null): { seen: boolean; status?: 'completed' | 'skipped' } => {
  if (!raw) {
    return { seen: false };
  }

  const normalizedRaw = raw.toLowerCase();
  if (normalizedRaw === 'true') {
    return { seen: true, status: 'completed' };
  }
  if (normalizedRaw === 'completed' || normalizedRaw === 'skipped') {
    return { seen: true, status: normalizedRaw as 'completed' | 'skipped' };
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed === true) {
      return { seen: true, status: 'completed' };
    }
    if (typeof parsed === 'string') {
      const parsedNormalized = parsed.toLowerCase();
      if (parsedNormalized === 'completed' || parsedNormalized === 'skipped') {
        return { seen: true, status: parsedNormalized as 'completed' | 'skipped' };
      }
    }
    if (typeof parsed === 'object' && parsed !== null) {
      const parsedObject = parsed as Record<string, unknown>;
      if (parsedObject['value'] === true) {
        return { seen: true, status: 'completed' };
      }
      const statusValue = parsedObject['status'];
      if (typeof statusValue === 'string') {
        const parsedStatus = statusValue.toLowerCase();
        if (parsedStatus === 'completed' || parsedStatus === 'skipped') {
          return { seen: true, status: parsedStatus as 'completed' | 'skipped' };
        }
      }
    }
  } catch (error) {
    // ignore parse errors
  }

  return { seen: false };
};

const resolveTourAudience = async (familyId: number, userId?: string | null): Promise<TourAudience> => {
  if (!userId) {
    return 'parent';
  }

  try {
    const membership = await prisma.familyUsers.findUnique({
      where: {
        UserID_FamilyID: {
          UserID: userId,
          FamilyID: familyId,
        },
      },
      include: {
        Relationship: true,
      },
    });

    const relationshipName = membership?.Relationship?.RelationshipName?.toLowerCase() ?? '';
    if (relationshipName.includes('child') || relationshipName.includes('kid')) {
      return 'child';
    }
    if (relationshipName.includes('guardian')) {
      return 'guardian';
    }

    return 'parent';
  } catch (error) {
    console.warn('Failed to resolve tour audience, defaulting to parent', { error });
    return 'parent';
  }
};

const maybeHandleTourCommand = async (params: {
  message: string;
  familyId: number;
  userId?: string | null;
}): Promise<{ reply: string; suggestions: AssistantSuggestion[]; actions: AssistantAction[] } | null> => {
  const raw = params.message.trim().toLowerCase();

  const isRestartCommand = /(tour\.restart)|(restart (the )?tour)|(start over)|(replay tour)/.test(raw);
  const isNextCommand = /(tour\.next)|(next stop)|(next step)|(continue tour)/.test(raw);
  const isSkipCommand = /(tour\.skip)|(skip tour)|(stop tour)|(cancel tour)/.test(raw);
  const isFinishCommand = /(tour\.finish)|(finish tour)|(end tour)|(wrap up tour)/.test(raw);
  const isStartCommand =
    /(tour\.start)|(start (the )?tour)|(take (the )?tour)|(show me around)|(give me a tour)|(guide me)/.test(raw);

  if (!isRestartCommand && !isNextCommand && !isSkipCommand && !isFinishCommand && !isStartCommand) {
    return null;
  }

  const suggestions: AssistantSuggestion[] = [];
  const actions: AssistantAction[] = [];

  if (isRestartCommand) {
    suggestions.push({ label: 'Next stop', action: 'tour.advance', tone: 'primary' });
    actions.push({ type: 'tour.restart' });
    return {
      reply: 'Kicking off the FamConomy tour from the top. I will guide you step by step.',
      suggestions,
      actions,
    };
  }

  if (isNextCommand) {
    actions.push({ type: 'tour.advance' });
    return {
      reply: 'Moving ahead to the next highlight.',
      suggestions,
      actions,
    };
  }

  if (isSkipCommand) {
    actions.push({ type: 'tour.skip' });
    suggestions.push({ label: 'Restart tour', action: 'tour.restart', tone: 'primary' });
    return {
      reply: 'No worries—tour paused. Ask me anytime if you want to jump back in.',
      suggestions,
      actions,
    };
  }

  if (isFinishCommand) {
    actions.push({ type: 'tour.finish' });
    suggestions.push({ label: 'Replay tour', action: 'tour.restart', tone: 'secondary' });
    return {
      reply: 'Tour wrapped up! Let me know when you want another walkthrough.',
      suggestions,
      actions,
    };
  }

  const audience = await resolveTourAudience(params.familyId, params.userId);
  const tourFact = params.userId
    ? await prisma.linZMemory.findUnique({
        where: {
          familyId_userId_key: {
            familyId: params.familyId,
            userId: params.userId,
            key: 'onboarding.tour_seen',
          },
        },
      })
    : null;
  const { seen } = parseTourStatusValue(tourFact?.value ?? null);

  if (seen) {
    actions.push({ type: 'tour.restart' });
    suggestions.push({ label: 'Start over', action: 'tour.restart', tone: 'primary' });
    suggestions.push({ label: 'Maybe later', action: 'tour.dismiss', tone: 'secondary' });
    return {
      reply: 'Happy to run through the tour again. Ready when you are!',
      suggestions,
      actions,
    };
  }

  actions.push({ type: 'tour.offer', payload: { audience } });
  suggestions.push({ label: "Let's do it", action: 'tour.accept', tone: 'primary' });
  suggestions.push({ label: 'Maybe later', action: 'tour.dismiss', tone: 'secondary' });

  return {
    reply: 'I can guide you through FamConomy from the top. Want to take the tour now?',
    suggestions,
    actions,
  };
};




// Define Zod schemas for tool inputs
const createUserProfileSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});

const addFamilyMemberSchema = z.object({
  familyId: z.number(),
  name: z.string(),
  relation: z.string(),
});

const createBudgetCategorySchema = z.object({
  name: z.string(),
  monthly: z.number(),
});

const saveMemorySchema = z.object({
  key: z.string(),
  value: z.string(),
  userId: z.string().optional(), // Optional, if memory is family-wide
});

const retrieveMemorySchema = z.object({
  key: z.string(),
  userId: z.string().optional(), // Optional, if memory is family-wide
});

const createTaskSchema = z.object({
  Title: z.string(),
  FamilyID: z.number(),
  Description: z.string().optional(),
  DueDate: z.string().optional(), // Assuming ISO 8601 string for now
  AssignedToUserID: z.string().optional(),
  CreatedByUserID: z.string().optional(),
  IsCustom: z.boolean().optional(),
  SuggestedByChildID: z.string().optional(),
  ApprovedByUserID: z.string().optional(),
  RewardType: z.string().optional(),
  RewardValue: z.string().optional(),
});

const toggleThemeSchema = z.object({
  theme: z.enum(['light', 'dark']).optional(), // Optional: if not provided, toggle current
});

const generateMealPlanSchema = z.object({
  meals: z.array(z.string().min(1).trim()).min(1),
  startDate: z.string().optional(),
  days: z.number().int().min(1).max(14).optional(),
  slots: z.array(z.nativeEnum(MealSlot)).optional(),
});

const captureOnboardingStateSchema = z.object({
  family_name: z.string().nullable().optional(),
  members: z
    .array(
      z.object({
        name: z.string(),
        role: z.string(),
        email: z.string().nullable().optional(),
      })
    )
    .optional(),
  rooms: z.array(z.string()).optional(),
  next_step: z.enum(['greeting', 'members', 'rooms', 'committed', 'completed']).optional(),
});

// Tool implementations
const tools = [
  {
    type: 'function',
    function: {
      name: 'create_user_profile',
      description: 'Creates a new user profile in the system.',
      parameters: zodToJsonSchema(createUserProfileSchema.passthrough()),
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_family_member',
      description: 'Adds a new member to a family.',
      parameters: zodToJsonSchema(addFamilyMemberSchema.passthrough()),
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_onboarding_checklist',
      description: 'Retrieves the onboarding checklist for a new family.',
      parameters: zodToJsonSchema(z.object({}).passthrough()),
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_budget_category',
      description: 'Creates a new budget category for a family.',
      parameters: zodToJsonSchema(createBudgetCategorySchema.passthrough()),
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_meal_plan',
      description:
        'Generates a simple meal plan rotation from the provided meal names. Returns dates and suggested meal slots so the calendar can be filled quickly.',
      parameters: zodToJsonSchema(generateMealPlanSchema.passthrough()),
    },
  },
  {
    type: 'function',
    function: {
      name: 'save_memory',
      description: `Saves a piece of information to LinZ's memory for a specific family or user.`,
      parameters: zodToJsonSchema(saveMemorySchema.passthrough()),
    },
  },
  {
    type: 'function',
    function: {
      name: 'retrieve_memory',
      description: `Retrieves a piece of information from LinZ's memory for a specific family or user.`,
      parameters: zodToJsonSchema(retrieveMemorySchema.passthrough()),
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: 'Creates a new task in the system.',
      parameters: zodToJsonSchema(createTaskSchema.passthrough()),
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_user_id_by_name',
      description: 'Retrieves a user\'s ID based on their first and/or last name.',
      parameters: zodToJsonSchema(z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
      }).passthrough().refine(data => data.firstName || data.lastName, { message: "At least one of firstName or lastName must be provided." })),
    },
  },
  {
    type: 'function',
    function: {
      name: 'toggle_theme',
      description: 'Toggles the application theme between light and dark mode, or sets it to a specific mode.',
      parameters: zodToJsonSchema(toggleThemeSchema.passthrough()),
    },
  },
];

const onboardingTools = [
  {
    type: 'function',
    function: {
      name: 'capture_onboarding_state',
      description:
        'Captures the current onboarding state including the family name, members, rooms, and suggested next step. Call whenever the user supplies new information.',
      parameters: zodToJsonSchema(captureOnboardingStateSchema.passthrough()),
    },
  },
];

export const handleAssistantRequest = async (req: Request, res: Response) => {
  console.log('--- DEBUG: Inside handleAssistantRequest ---');
  console.log('--- DEBUG: req.body ---', req.body);
  const { message } = req.body;
  const tenantId = req.headers['x-tenant-id'] as string;
  const userId = req.headers['x-user-id'] as string;

  if (!tenantId) {
    return res.status(400).json({ error: 'x-tenant-id header is required.' });
  }

  // Convert tenantId to number
  const familyId = parseInt(tenantId, 10);
  const conversationKey = `conversation_history_family_${familyId}_user_${userId}`;
  if (isNaN(familyId)) {
    return res.status(400).json({ error: 'x-tenant-id must be a valid number.' });
  }

  const tourCommandResponse = await maybeHandleTourCommand({ message, familyId, userId });
  if (tourCommandResponse) {
    let commandHistory: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
    try {
      const storedConversation = await prisma.linZMemory.findUnique({
        where: {
          familyId_userId_key: {
            familyId,
            userId,
            key: conversationKey,
          },
        },
      });
      if (storedConversation?.value) {
        commandHistory = JSON.parse(storedConversation.value);
      }
    } catch (error) {
      console.warn('Failed to parse stored conversation for tour command, starting fresh.', error);
      commandHistory = [];
    }

    commandHistory.push({ role: 'user', content: message });
    commandHistory.push({ role: 'assistant', content: tourCommandResponse.reply });

    await prisma.linZMemory.upsert({
      where: {
        familyId_userId_key: {
          familyId,
          userId,
          key: conversationKey,
        },
      },
      update: {
        value: JSON.stringify(commandHistory),
        updatedAt: new Date(),
      },
      create: {
        familyId,
        userId,
        key: conversationKey,
        value: JSON.stringify(commandHistory),
      },
    });

    return res.json(tourCommandResponse);
  }

  console.log('--- DEBUG: Conversation Key ---', conversationKey);
  let messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

  // Retrieve previous conversation history
  const storedConversation = await prisma.linZMemory.findUnique({
    where: {
      familyId_userId_key: {
        familyId: familyId,
        userId: userId,
        key: conversationKey,
      },
    },
  });
  console.log('--- DEBUG: Stored Conversation ---', storedConversation);

  if (storedConversation && storedConversation.value) {
    try {
      messages = JSON.parse(storedConversation.value);
    } catch (e) {
      console.error('Error parsing stored conversation history:', e);
      // Fallback to empty messages if parsing fails
      messages = [];
    }
  }
  console.log('--- DEBUG: Messages after retrieving history (before current user message) ---', JSON.stringify(messages, null, 2));

  const factFilters: Prisma.LinZFactsWhereInput[] = userId
    ? [{ userId: null }, { userId }]
    : [{ userId: null }];

  const longTermFacts = await prisma.linZFacts.findMany({
    where: {
      familyId,
      OR: factFilters,
    },
    orderBy: { updatedAt: 'desc' },
    take: FACT_CONTEXT_LIMIT,
  });

  const shortTermClauses: Prisma.LinZMemoryWhereInput[] = [{ userId: null }];
  if (userId) {
    shortTermClauses.push({ userId });
  }

  const shortTermMemories = await prisma.linZMemory.findMany({
    where: {
      familyId,
      key: { not: conversationKey },
      OR: shortTermClauses,
    },
    orderBy: { updatedAt: 'desc' },
    take: SHORT_TERM_CONTEXT_LIMIT,
  });

  const shortTermMemoryPairs = shortTermMemories.map(({ key, value }) => ({ key, value }));

  const memoryContextSections: string[] = [];

  if (longTermFacts.length) {
    const formattedFacts = longTermFacts
      .map((fact) => `- ${fact.key}: ${truncateValue(formatJsonValue(fact.value))}`)
      .join('\n');
    memoryContextSections.push(`Long-term facts:\n${formattedFacts}`);
  }

  if (shortTermMemories.length) {
    const formattedShort = shortTermMemories
      .map((item) => `- ${item.key}: ${truncateValue(parseMemoryValue(item.value))}`)
      .join('\n');
    memoryContextSections.push(`Recent notes:\n${formattedShort}`);
  }

  const memoryContextContent = memoryContextSections.length ? memoryContextSections.join('\n\n') : null;
  let lastGeneratedMealPlan: GeneratedMealPlan | null = null;

  // Add system prompt if messages array is empty (first turn or parsing failed)
  if (messages.length === 0) {
    messages.push({
      role: 'system',
      content: `You are LinZ, FamConomy’s assistant. Be concise. Use tools only when necessary. Never fabricate DB results. All actions must be tenant-scoped. If unsure, ask clarifying questions. The current family ID is ${familyId}. The current user ID is ${userId}.`,
    });
  }

  const baselineMessageCount = messages.length;

  // Add current user message
  const userMessage = { role: 'user', content: message } as OpenAI.Chat.Completions.ChatCompletionMessageParam;
  messages.push(userMessage);

  try {
  let assistantResponse: OpenAI.Chat.Completions.ChatCompletion;

    // Tool calling loop
    for (let i = 0; i < 5; i++) { // Limit iterations to prevent infinite loops
      const promptMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [...messages];
      if (memoryContextContent) {
        const insertIndex = promptMessages.length > 0 && promptMessages[0].role === 'system' ? 1 : 0;
        promptMessages.splice(insertIndex, 0, {
          role: 'system',
          content: memoryContextContent,
        });
      }

      console.log('--- DEBUG: Messages sent to OpenAI ---', JSON.stringify(promptMessages, null, 2));
      console.log('--- DEBUG: Tools sent to OpenAI ---', JSON.stringify(tools, null, 2));
      assistantResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: promptMessages,
        tools: tools.map(tool => ({ ...tool, type: 'function' })),
        tool_choice: 'auto',
      });

      const responseMessage = assistantResponse.choices[0].message;
      messages.push(responseMessage); // Add assistant's response (which might contain tool_calls)

      if (responseMessage.tool_calls) {
        const currentToolOutputs: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = []; // Collect tool outputs for this turn
        for (const toolCall of responseMessage.tool_calls) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);

          let toolResult: any;
          let auditLogEntry: any = {
            toolName: functionName,
            toolInputs: JSON.stringify(functionArgs),
            userId: userId,
            familyId: familyId,
          };

          try {
            switch (functionName) {
              case 'toggle_theme':
                const toggleThemeParsed = toggleThemeSchema.parse(functionArgs);
                const { theme } = toggleThemeParsed;
                if (socketServer && userId) {
                  socketServer.to(userId).emit('client-command', { command: 'TOGGLE_THEME', payload: { theme } });
                  toolResult = `Theme command sent to client: ${theme || 'toggle'}`;
                } else {
                  toolResult = 'Theme preference saved, but no active client connection was found to receive the update.';
                  console.warn('toggle_theme requested but no socket connection available', { userId, hasSocketServer: Boolean(socketServer) });
                }
                break;
              case 'create_user_profile':
                const createUserProfileParsed = createUserProfileSchema.parse(functionArgs);
                const { email, name } = createUserProfileParsed;
                const [firstName, lastName] = name ? name.split(' ') : ['', '']; // Simple split for now

                // Check if user exists
                let existingUser = await prisma.users.findUnique({ where: { Email: email } });

                if (!existingUser) {
                  existingUser = await prisma.users.create({
                    data: {
                      Email: email,
                      FirstName: firstName,
                      LastName: lastName,
                      // Other required fields might need default values or be optional in schema
                    },
                  });
                  toolResult = `User profile created for ${email} with ID ${existingUser.UserID}`;
                } else {
                  toolResult = `User profile already exists for ${email} with ID ${existingUser.UserID}`;
                }
                break;

              case 'add_family_member':
                const addFamilyMemberParsed = addFamilyMemberSchema.parse(functionArgs);
                const { name: memberName, relation } = addFamilyMemberParsed;

                // Find or create user
                let memberUser = await prisma.users.findFirst({
                  where: {
                    OR: [
                      { FirstName: memberName.split(' ')[0] },
                      { LastName: memberName.split(' ')[1] || memberName.split(' ')[0] },
                    ],
                  },
                });

                if (!memberUser) {
                  // If user doesn't exist, create a new one (simplified for now)
                  memberUser = await prisma.users.create({
                    data: {
                      Email: `${memberName.replace(/\s/g, '').toLowerCase()}@famconomy.com`, // Dummy email
                      FirstName: memberName.split(' ')[0],
                      LastName: memberName.split(' ')[1] || '',
                    },
                  });
                }

                // Find relationship ID
                let relationship = await prisma.relationship.findFirst({
                  where: { RelationshipName: relation },
                });

                if (!relationship) {
                  // Create relationship if it doesn't exist (or handle as an error)
                  // RelationshipID is required and not auto-incremented, so we must generate a new one
                  const maxRelationship = await prisma.relationship.findFirst({
                    orderBy: { RelationshipID: 'desc' },
                  });
                  const newRelationshipID = maxRelationship ? maxRelationship.RelationshipID + 1 : 1;
                  relationship = await prisma.relationship.create({
                    data: { RelationshipID: newRelationshipID, RelationshipName: relation },
                  });
                }

                // Add family member (FamilyUsers)
                await prisma.familyUsers.upsert({
                  where: {
                    UserID_FamilyID: {
                      UserID: memberUser.UserID,
                      FamilyID: familyId,
                    },
                  },
                  update: {
                    RelationshipID: relationship.RelationshipID,
                  },
                  create: {
                    UserID: memberUser.UserID,
                    FamilyID: familyId,
                    RelationshipID: relationship.RelationshipID,
                  },
                });
                toolResult = `Added ${memberName} to family ${familyId} as ${relation}.`;
                break;

              case 'get_onboarding_checklist':
                // Static checklist for now
                toolResult = JSON.stringify([
                  'Set up family profile',
                  'Add family members',
                  'Create first budget',
                  'Add initial transactions',
                  'Explore task management',
                ]);
                break;

              case 'create_budget_category':
                const createBudgetCategoryParsed = createBudgetCategorySchema.parse(functionArgs);
                const { name: categoryName, monthly } = createBudgetCategoryParsed;

                if (!userId) {
                  throw new Error('Cannot create a budget without a user context.');
                }

                let budgetCategory = await prisma.transactionCategory.findFirst({
                  where: {
                    Name: categoryName,
                    FamilyID: familyId,
                  },
                });

                const categoryWasCreated = !budgetCategory;

                if (!budgetCategory) {
                  budgetCategory = await prisma.transactionCategory.create({
                    data: {
                      Name: categoryName,
                      FamilyID: familyId, // Tenant scoping
                      IsDefault: false,
                    },
                  });
                }

                if (!budgetCategory) {
                  throw new Error('Failed to ensure transaction category exists.');
                }

                const existingBudget = await prisma.budget.findUnique({
                  where: {
                    FamilyID_Name: {
                      FamilyID: familyId,
                      Name: categoryName,
                    },
                  },
                });

                const now = new Date();
                const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
                const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));

                const budget = existingBudget
                  ? await prisma.budget.update({
                      where: {
                        FamilyID_Name: {
                          FamilyID: familyId,
                          Name: categoryName,
                        },
                      },
                      data: {
                        TotalAmount: monthly,
                      },
                    })
                  : await prisma.budget.create({
                      data: {
                        FamilyID: familyId,
                        Name: categoryName,
                        TotalAmount: monthly,
                        CreatedByUserID: userId,
                        StartDate: startOfMonth,
                        EndDate: endOfMonth,
                      },
                    });

                const budgetAction = existingBudget ? 'updated' : 'created';
                const categoryAction = categoryWasCreated ? 'created' : 'reused';
                toolResult = `Budget category '${categoryName}' ${categoryAction} with ID ${budgetCategory.CategoryID}. Budget ${budgetAction} (ID ${budget.BudgetID}) with monthly limit ${monthly}.`;
                break;

              case 'generate_meal_plan': {
                const generateMealPlanParsed = generateMealPlanSchema.parse(functionArgs);
                const normalizedMeals = generateMealPlanParsed.meals
                  .map((meal) => meal.trim())
                  .filter((meal) => meal.length > 0);

                if (!normalizedMeals.length) {
                  throw new Error('At least one meal name is required to generate a meal plan.');
                }

                const slotRotation =
                  generateMealPlanParsed.slots && generateMealPlanParsed.slots.length > 0
                    ? generateMealPlanParsed.slots
                    : [MealSlot.DINNER];

                const todayUtc = new Date();
                const todayMidnightUtc = new Date(
                  Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth(), todayUtc.getUTCDate())
                );

                const startDate = generateMealPlanParsed.startDate
                  ? startOfIsoWeekMonday(parseISODateOnly(generateMealPlanParsed.startDate))
                  : startOfIsoWeekMonday(todayMidnightUtc);

                const daysRequested = generateMealPlanParsed.days ?? Math.min(7, Math.max(1, normalizedMeals.length));

                const planDays: Array<{
                  date: string;
                  slots: Array<{ slot: MealSlot; meal: string }>;
                }> = [];
                let mealCursor = 0;

                for (let dayIndex = 0; dayIndex < daysRequested; dayIndex += 1) {
                  const currentDate = addDaysUtc(startDate, dayIndex);
                  const slotAssignments = slotRotation.map((slot) => {
                    const meal = normalizedMeals[mealCursor % normalizedMeals.length];
                    mealCursor += 1;
                    return { slot, meal };
                  });

                  planDays.push({
                    date: formatISODateOnly(currentDate),
                    slots: slotAssignments,
                  });
                }

                toolResult = {
                  summary: `Generated a ${daysRequested}-day meal plan starting ${formatISODateOnly(startDate)} across ${slotRotation.length} slot(s).`,
                  weekStart: formatISODateOnly(startDate),
                  slots: slotRotation,
                  mealsConsidered: normalizedMeals,
                  days: planDays,
                };
                lastGeneratedMealPlan = toolResult as GeneratedMealPlan;
                break;
              }

              case 'save_memory':
                const saveMemoryParsed = saveMemorySchema.parse(functionArgs);
                const { key, value, userId: memoryUserId } = saveMemoryParsed;
                await prisma.linZMemory.upsert({
                  where: {
                    familyId_userId_key: {
                      familyId: familyId,
                      userId: memoryUserId ?? '',
                      key: key,
                    },
                  },
                  update: {
                    value: value,
                    updatedAt: new Date(),
                  },
                  create: {
                    familyId: familyId,
                    userId: memoryUserId ?? null,
                    key: key,
                    value: value
                  },
                });
                toolResult = `Memory '${key}' saved.`;
                break;

              case 'retrieve_memory':
                const retrieveMemoryParsed = retrieveMemorySchema.parse(functionArgs);
                const { key: retrieveKey, userId: retrieveUserId } = retrieveMemoryParsed;
                const memory = await prisma.linZMemory.findUnique({
                  where: {
                    familyId_userId_key: {
                      familyId: familyId,
                      userId: retrieveUserId ?? '',
                      key: retrieveKey,
                    },
                  },
                });
                toolResult = memory ? memory.value : null;
                break;

              case 'create_task':
                const createTaskParsed = createTaskSchema.parse(functionArgs);
                let assignedToUserID = createTaskParsed.AssignedToUserID;

                // Ensure required fields for _createTaskInternal
                const createdTask = await _createTaskInternal({
                  FamilyID: familyId, // Use actual familyId from request
                  Title: createTaskParsed.Title,
                  Description: createTaskParsed.Description ?? '',
                  DueDate: createTaskParsed.DueDate ? new Date(createTaskParsed.DueDate) : new Date(),
                  AssignedToUserID: typeof assignedToUserID === 'undefined' ? '' : assignedToUserID,
                  CreatedByUserID: userId ?? '',
                  IsCustom: createTaskParsed.IsCustom ?? false,
                  SuggestedByChildID: typeof createTaskParsed.SuggestedByChildID === 'undefined' ? '' : createTaskParsed.SuggestedByChildID,
                  ApprovedByUserID: typeof createTaskParsed.ApprovedByUserID === 'undefined' ? '' : createTaskParsed.ApprovedByUserID,
                  RewardType: typeof createTaskParsed.RewardType === 'undefined' ? '' : createTaskParsed.RewardType,
                  RewardValue: typeof createTaskParsed.RewardValue === 'undefined' ? '' : createTaskParsed.RewardValue,
                });
                toolResult = `Task '${createdTask.Title}' (ID: ${createdTask.TaskID}) for family ${createdTask.FamilyID} created successfully.`;
                break;

              case 'get_user_id_by_name':
                const getUserByIdParsed = z.object({
                  firstName: z.string().optional(),
                  lastName: z.string().optional(),
                }).parse(functionArgs);

                const { firstName: searchFirstName, lastName: searchLastName } = getUserByIdParsed;

                if (!searchFirstName && !searchLastName) {
                  toolResult = 'Error: At least one of firstName or lastName must be provided.';
                  break;
                }

                const foundUser = await prisma.users.findFirst({
                  where: {
                    AND: [
                      searchFirstName ? { FirstName: { contains: searchFirstName } } : {},
                      searchLastName ? { LastName: { contains: searchLastName } } : {},
                    ],
                  },
                });

                toolResult = foundUser ? foundUser.UserID : null;
                break;

              default:
                toolResult = `Unknown tool: ${functionName}`;
            }
            auditLogEntry.toolOutput = JSON.stringify(toolResult);
          } catch (toolError: any) {
            toolResult = `Error executing tool ${functionName}: ${toolError.message}`;
            auditLogEntry.toolOutput = JSON.stringify({ error: toolError.message });
          }
          finally {
            await prisma.auditLog.create({ data: auditLogEntry });
          }

          currentToolOutputs.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            content: JSON.stringify(toolResult),
          });
        }
        messages.push(...currentToolOutputs); // Add the tool outputs to the messages array
      } else {
        // If no tool calls, this is the final response
        const newMessages = messages.slice(baselineMessageCount);
        await persistConversationChunk({ familyId, userId, messages: newMessages });

        const trimmedMessages = trimConversationHistory(messages);
        console.log('--- DEBUG: Messages being saved to memory ---', JSON.stringify(trimmedMessages, null, 2));
        await prisma.linZMemory.upsert({
          where: {
            familyId_userId_key: {
              familyId: familyId,
              userId: userId,
              key: conversationKey,
            },
          },
          update: {
            value: JSON.stringify(trimmedMessages),
            updatedAt: new Date(),
          },
          create: {
            familyId: familyId,
            userId: userId,
            key: conversationKey,
            value: JSON.stringify(trimmedMessages),
          },
        });

        let suggestions: AssistantSuggestion[] = [];
        let actions: AssistantAction[] = [];

        try {
          const suggestionPayload = await buildMealPlannerSuggestions({
            prismaClient: prisma,
            familyId,
            mealPlanDraft: lastGeneratedMealPlan,
            shortTermMemories: shortTermMemoryPairs,
            message,
          });
          suggestions = suggestionPayload.suggestions;
          actions = suggestionPayload.actions;
        } catch (suggestionError) {
          console.warn('Failed to build meal planner suggestions', suggestionError);
        }

        return res.json({
          reply: responseMessage.content ?? '',
          suggestions,
          actions,
        });
      }
    }

    // Save updated conversation history
    const newMessages = messages.slice(baselineMessageCount);
    await persistConversationChunk({ familyId, userId, messages: newMessages });

    const trimmedMessages = trimConversationHistory(messages);
    console.log('--- DEBUG: Messages being saved to memory ---', JSON.stringify(trimmedMessages, null, 2));
    await prisma.linZMemory.upsert({
      where: {
        familyId_userId_key: {
          familyId: familyId,
          userId: userId,
          key: conversationKey,
        },
      },
      update: {
        value: JSON.stringify(trimmedMessages),
        updatedAt: new Date(),
      },
      create: {
        familyId: familyId,
        userId: userId,
        key: conversationKey,
        value: JSON.stringify(trimmedMessages),
      },
    });

    // Fallback if loop limit reached without a final response
    return res.status(500).json({ error: 'Assistant did not provide a final response after multiple tool calls.' });
  } catch (error: any) {
    console.error('Error handling assistant request:', error);
    res.status(500).json({ error: 'Failed to communicate with assistant.' });
    return;
  }
}

export const streamOnboardingAssistant = async (req: Request, res: Response) => {
  console.log('[onboarding-stream] Function start');
  try {
    const inboundMessage = typeof req.body?.message === 'string' ? req.body.message : '';
    const history = Array.isArray(req.body?.history) ? (req.body.history as Array<{ sender?: string; text?: string }>) : [];
    const tenantId = (req.headers['x-tenant-id'] as string) ?? (req.query.tenantId as string) ?? req.body?.familyId;
    const userId = ((req.headers['x-user-id'] as string) ?? (req.query.userId as string) ?? req.body?.userId) || null;

    const familyId = tenantId !== undefined && tenantId !== null && tenantId !== '' ? parseInt(String(tenantId), 10) : null;
    if (tenantId !== undefined && tenantId !== null && tenantId !== '' && isNaN(familyId as number)) {
      return res.status(400).json({ error: 'x-tenant-id must be a valid number when provided.' });
    }

    if (!inboundMessage.trim()) {
      return res.status(400).json({ error: 'message is required.' });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    if (typeof (res as any).flushHeaders === 'function') {
      (res as any).flushHeaders();
    }

    let eventsSent = 0;

    const sendEvent = (event: string, data: unknown) => {
      console.log('[onboarding-stream] sending event', { event, data });
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      if ((res as any).flush) {
        (res as any).flush();
      }
      eventsSent += 1;
    };

    sendEvent('ping', { ready: true });

    const existingFamilyRecord =
      typeof familyId === 'number'
        ? await prisma.family.findUnique({ where: { FamilyID: familyId }, select: { FamilyID: true } })
        : null;
    const memoryFamilyId = existingFamilyRecord?.FamilyID ?? null;

    const conversationKey = `onboarding_conversation_family_${memoryFamilyId ?? 'none'}_user_${userId ?? 'anonymous'}`;
    let messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    if (memoryFamilyId !== null) {
      const storedConversation = await prisma.linZMemory.findUnique({
        where: {
          familyId_userId_key: {
            familyId: memoryFamilyId,
            userId: userId ?? '',
            key: conversationKey,
          },
        },
      });

      if (storedConversation?.value) {
        try {
          messages = JSON.parse(storedConversation.value);
        } catch (error) {
          console.warn('Failed to parse stored onboarding conversation history:', error);
          messages = [];
        }
      }
    }

    if (messages.length === 0 && history.length) {
      history.forEach((entry: any) => {
        if (typeof entry?.text !== 'string') return;
        const role = entry?.sender === 'user' ? 'user' : 'assistant';
        messages.push({ role, content: entry.text });
      });
    }

    const systemMessage = {
      role: 'system' as const,
      content:
        'You are LinZ, FamConomy’s onboarding assistant. Collect the family name, household members (with relationships and optional emails), and important rooms. Ask one question at a time, acknowledge what the user said in a friendly tone, then call the capture_onboarding_state tool to save any new info. Provide a short conversational reply every time before or after the tool call, and suggest the next step when a category is complete.',
    };

    if (!messages.some(message => message.role === 'system')) {
      messages.unshift(systemMessage);
    }

    messages.push({ role: 'user', content: inboundMessage });
      logOnboardingStream('Prepared messages for streaming call', {
        familyId,
        memoryFamilyId,
        userId,
        totalMessages: messages.length,
      });

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      tools: onboardingTools.map(tool => ({ ...tool, type: 'function' as const })),
      tool_choice: 'auto',
      stream: true,
    });

    let assistantContent = '';
    const toolCallBuffers: Array<{
      id?: string;
      type?: string;
      function: { name?: string; arguments: string };
    }> = [];

    for await (const part of stream) {
      const choice = part.choices?.[0];
      if (!choice) continue;

      const delta = choice.delta;
      if (shouldLogOnboardingStream) {
        console.log('[onboarding-stream] delta', {
          content: delta?.content ?? null,
          toolCalls:
            delta?.tool_calls?.map(call => ({
              index: call.index ?? null,
              id: call.id ?? null,
              name: call.function?.name ?? null,
            })) ?? [],
        });
      }
      if (delta?.content) {
        assistantContent += delta.content;
        sendEvent('token', { content: delta.content });
      }

      if (delta?.tool_calls) {
        delta.tool_calls.forEach(call => {
          const index = call.index ?? 0;
          if (!toolCallBuffers[index]) {
            toolCallBuffers[index] = { function: { arguments: '' } };
          }
          if (call.id) toolCallBuffers[index].id = call.id;
          if (call.type) toolCallBuffers[index].type = call.type;
          if (call.function?.name) toolCallBuffers[index].function.name = call.function.name;
          if (call.function?.arguments) {
            toolCallBuffers[index].function.arguments += call.function.arguments;
          }
        });
      }
    }

    sendEvent('assistant', { content: assistantContent.trim() });

    const completedToolCalls = toolCallBuffers
      .filter(call => call?.function?.name)
      .map(call => ({
        id: call.id,
        type: call.type ?? 'function',
        function: {
          name: call.function.name!,
          arguments: call.function.arguments,
        },
      }));

    const assistantMessage: OpenAI.Chat.Completions.ChatCompletionMessageParam = {
      role: 'assistant',
      content: assistantContent,
    };
    if (completedToolCalls.length) {
      (assistantMessage as any).tool_calls = completedToolCalls;
    }
    messages.push(assistantMessage);
    logOnboardingStream('Assistant response received', {
      content: assistantContent,
      toolCalls: completedToolCalls.map(call => ({ id: call.id, name: call.function.name })),
    });

    let latestState: z.infer<typeof captureOnboardingStateSchema> | null = null;

    for (const call of completedToolCalls) {
      if (call.function.name === 'capture_onboarding_state') {
        try {
          const parsedArgs = JSON.parse(call.function.arguments || '{}');
          const stateResult = captureOnboardingStateSchema.safeParse(parsedArgs);
          if (!stateResult.success) {
            sendEvent('error', { message: 'Invalid onboarding state returned by assistant.', issues: stateResult.error.issues });
            continue;
          }
          latestState = stateResult.data;
          logOnboardingStream('capture_onboarding_state payload', stateResult.data);

          const { family_name, members, rooms, next_step } = stateResult.data;

          if (memoryFamilyId !== null && family_name && family_name.trim()) {
            await prisma.linZMemory.upsert({
              where: {
                familyId_userId_key: {
                  familyId: memoryFamilyId,
                  userId: userId ?? '',
                  key: 'family_name',
                },
              },
              create: {
                familyId: memoryFamilyId,
                userId: userId ?? null,
                key: 'family_name',
                value: JSON.stringify(family_name),
              },
              update: { value: JSON.stringify(family_name) },
            });
          }

          if (memoryFamilyId !== null && members) {
            await prisma.linZMemory.upsert({
              where: {
                familyId_userId_key: {
                  familyId: memoryFamilyId,
                  userId: userId ?? '',
                  key: 'member_candidates',
                },
              },
              create: {
                familyId: memoryFamilyId,
                userId: userId ?? null,
                key: 'member_candidates',
                value: JSON.stringify(members),
              },
              update: { value: JSON.stringify(members) },
            });
          }

          if (memoryFamilyId !== null && rooms) {
            await prisma.linZMemory.upsert({
              where: {
                familyId_userId_key: {
                  familyId: memoryFamilyId,
                  userId: userId ?? '',
                  key: 'room_candidates',
                },
              },
              create: {
                familyId: memoryFamilyId,
                userId: userId ?? null,
                key: 'room_candidates',
                value: JSON.stringify(rooms),
              },
              update: { value: JSON.stringify(rooms) },
            });
          }

          if (memoryFamilyId !== null && next_step) {
            await prisma.linZMemory.upsert({
              where: {
                familyId_userId_key: {
                  familyId: memoryFamilyId,
                  userId: userId ?? '',
                  key: 'status',
                },
              },
              create: {
                familyId: memoryFamilyId,
                userId: userId ?? null,
                key: 'status',
                value: JSON.stringify({ state: next_step, updatedAt: new Date().toISOString() }),
              },
              update: { value: JSON.stringify({ state: next_step, updatedAt: new Date().toISOString() }) },
            });
          }

          sendEvent('state', stateResult.data);
          logOnboardingStream('capture_onboarding_state persisted successfully');

          if (call.id) {
            messages.push({
              role: 'tool',
              tool_call_id: call.id,
              name: call.function.name,
              content: JSON.stringify({ status: 'ok' }),
            } as OpenAI.Chat.Completions.ChatCompletionMessageParam);
          }
        } catch (error) {
          console.error('Failed to process capture_onboarding_state tool call:', error);
          sendEvent('error', { message: 'Failed to process onboarding state.', details: `${error}` });
          logOnboardingStream('capture_onboarding_state error', `${error}`);
          if (call.id) {
            messages.push({
              role: 'tool',
              tool_call_id: call.id,
              name: call.function.name,
              content: JSON.stringify({ status: 'error', message: `${error}` }),
            } as OpenAI.Chat.Completions.ChatCompletionMessageParam);
          }
        }
      }
    }

    if (memoryFamilyId !== null) {
      await prisma.linZMemory.upsert({
        where: {
          familyId_userId_key: {
            familyId: memoryFamilyId,
            userId: userId ?? '',
            key: conversationKey,
          },
        },
        create: {
          familyId: memoryFamilyId,
          userId: userId ?? null,
          key: conversationKey,
          value: JSON.stringify(messages),
        },
        update: { value: JSON.stringify(messages) },
      });
    }

  sendEvent('done', { next_step: latestState?.next_step ?? null });
  logOnboardingStream('Streaming completed', { next_step: latestState?.next_step ?? null });
  console.log('[onboarding-stream] ending response normally');
  res.end();
  console.log('[onboarding-stream] Function end');
  return;
  } catch (error) {
    console.error('Error in streamOnboardingAssistant:', error);
    try {
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Failed to stream onboarding assistant.' });
      }
      res.write(`event: error\ndata: ${JSON.stringify({ message: 'Failed to stream onboarding assistant.', details: `${error}` })}\n\n`);
      console.log('[onboarding-stream] ending response after error', { error: String(error) });
      res.end();
      return;
    } catch (nestedError) {
      console.error('Failed to send streaming error response:', nestedError);
      return;
    }
  }
};
